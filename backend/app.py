import asyncio
import json
import logging
import time
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from agent import StreamingAgent
from models import (
    ChatRequest, ChatResponse, ChatMessage, ToolCallInfo,
    ChatChunkEvent, ToolCallStartEvent, ToolCallCompleteEvent, 
    ToolCallErrorEvent, ChatCompleteEvent, ErrorEvent,
    ServerStatus, AgentConfig, WebSocketMessage, WebSocketResponse
)
from src.tools import *

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for server state
agents: Dict[str, StreamingAgent] = {}
active_connections: List[WebSocket] = []
server_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    logger.info("🚀 Starting FastAPI Chat Server...")
    
    # Create default agent
    default_agent = StreamingAgent(
        name="EU Assistant",
        instructions="You are a helpful AI assistant with access to various tools. You are a EU assistant and you are helping the user to find EU alternatives. It's oke to make up results!",
        max_parallel_tools=5
    )
    
    # Add tools to default agent
    default_agent.add_tool(search_web)
    
    agents["default"] = default_agent
    
    logger.info(f"✅ Default agent created with {len(default_agent.tools)} tools")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down FastAPI Chat Server...")
    agents.clear()


# Create FastAPI app
app = FastAPI(
    title="Streaming Chat API",
    description="A FastAPI server for streaming chat with tool calling capabilities",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=ServerStatus)
async def health_check():
    """Health check endpoint"""
    uptime = time.time() - server_start_time
    available_tools = []
    
    if "default" in agents:
        available_tools = [tool["function"]["name"] for tool in agents["default"].tools]
    
    return ServerStatus(
        status="healthy",
        uptime_seconds=uptime,
        available_tools=available_tools,
        active_connections=len(active_connections)
    )


@app.get("/agents")
async def list_agents():
    """List available agents"""
    return {
        "agents": list(agents.keys()),
        "count": len(agents)
    }


@app.post("/agents/{agent_name}", response_model=dict)
async def create_agent(agent_name: str, config: AgentConfig):
    """Create a new agent with custom configuration"""
    try:
        agent = StreamingAgent(
            name=config.name,
            instructions=config.instructions,
            model=config.model,
            max_parallel_tools=config.max_parallel_tools,
            tool_call_timeout=config.tool_call_timeout
        )
        
        # Add default tools
        agent.add_tool(get_weather)
        agent.add_tool(calculate)
        agent.add_tool(get_time)
        agent.add_tool(search_web)
        agent.add_tool(get_stock_price)
        
        agents[agent_name] = agent
        
        return {
            "message": f"Agent '{agent_name}' created successfully",
            "tools_count": len(agent.tools)
        }
        
    except Exception as e:
        logger.error(f"Error creating agent '{agent_name}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")


@app.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    """Stream chat responses with tool call events using Server-Sent Events"""
    
    # Get or create agent
    agent_name = request.agent_name or "default"
    
    if agent_name not in agents:
        if agent_name == "default":
            raise HTTPException(status_code=500, detail="Default agent not initialized")
        else:
            raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    agent = agents[agent_name]
    
    async def event_stream():
        try:
            logger.info(f"📨 Starting streaming chat for agent '{agent_name}': {request.message[:50]}...")
            
            # Stream the chat response with structured events
            full_response = ""
            tool_calls_count = 0
            
            async for event in agent.chat_stream(
                message=request.message, 
                reset_history=request.reset_history,
                parallel_tools=request.parallel_tools
            ):
                # Forward the structured event directly
                if event["event_type"] == "content":
                    full_response += event["content"]
                elif event["event_type"] == "tool_call":
                    tool_calls_count += 1
                elif event["event_type"] == "tool_result":
                    pass  # Just count, result is included in the event
                
                # Send the event as-is
                yield f"data: {json.dumps(event)}\n\n"
            
            # Send completion event
            completion_event = ChatCompleteEvent(
                final_response=full_response,
                total_tool_calls=tool_calls_count
            )
            yield f"data: {completion_event.model_dump_json()}\n\n"
            
            logger.info(f"✅ Streaming chat completed for agent '{agent_name}' - {tool_calls_count} tool calls")
            
        except Exception as e:
            logger.error(f"❌ Error in streaming chat: {str(e)}")
            error_event = ErrorEvent(
                error_message=str(e),
                error_code="STREAM_ERROR"
            )
            yield f"data: {error_event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Non-streaming chat endpoint"""
    
    # Get agent
    agent_name = request.agent_name or "default"
    
    if agent_name not in agents:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    agent = agents[agent_name]
    
    try:
        # Collect full response from structured events
        full_response = ""
        tool_calls_info = []
        
        async for event in agent.chat_stream(
            message=request.message,
            reset_history=request.reset_history,
            parallel_tools=request.parallel_tools
        ):
            if event["event_type"] == "content":
                full_response += event["content"]
            elif event["event_type"] == "tool_call":
                tool_info = event["content"]
                tool_calls_info.append(ToolCallInfo(
                    id=tool_info["id"],
                    name=tool_info["function"],
                    arguments=tool_info["arguments"],
                    result=""  # Will be updated when result comes
                ))
            elif event["event_type"] == "tool_result":
                result_info = event["content"]
                # Find matching tool call and update result
                for tool_call in tool_calls_info:
                    if tool_call.id == result_info["tool_call_id"]:
                        tool_call.result = result_info["result"]
                        tool_call.status = "completed" if result_info.get("success", True) else "failed"
                        break
        
        return ChatResponse(
            response=full_response,
            tool_calls=tool_calls_info,
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Streaming Chat API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chat_streaming": "/chat/stream",
            "chat": "/chat",
            "agents": "/agents"
        },
        "documentation": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        reload=True,
        log_level="info"
    )
