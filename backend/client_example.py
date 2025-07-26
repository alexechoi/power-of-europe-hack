#!/usr/bin/env python3
"""
Example client for the Streaming Chat API

// Stream chat with structured events
async function streamChat(message, agentName = null) {
    const payload = {
        message: message,
        reset_history: false,
        parallel_tools: true
    };
    
    if (agentName) {
        payload.agent_name = agentName;
    }

    const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error(`Error: ${response.status} - ${await response.text()}`);
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const event = JSON.parse(line.slice(6));
                    handleSSEEvent(event);
                } catch (error) {
                    console.error('JSON decode error:', error);
                    console.error('Raw line:', line);
                }
            }
        }
    }
}

function handleSSEEvent(data) {
    const eventType = data.event_type;
    
    if (eventType === 'content') {
        // Stream text content
        displayText(data.content);
        
    } else if (eventType === 'tool_call') {
        // Tool call initiated
        const toolInfo = data.content;
        showToolCall(toolInfo.function, toolInfo.arguments);
        
    } else if (eventType === 'tool_result') {
        // Tool execution completed
        const resultInfo = data.content;
        showToolResult(resultInfo.result, resultInfo.success);
        
    } else if (eventType === 'error') {
        // Error occurred
        showError(data.error_message || 'Unknown error');
        
    } else if (eventType === 'chat_chunk') {
        // Legacy: streaming text content
        displayText(data.content);
        
    } else if (eventType === 'tool_call_start') {
        // Legacy: tool starting
        const toolCall = data.tool_call;
        showToolStart(toolCall.name);
        
    } else if (eventType === 'tool_call_complete') {
        // Legacy: tool completed
        const toolCall = data.tool_call;
        showToolComplete(toolCall.name, toolCall.result);
        
    } else if (eventType === 'tool_call_error') {
        // Legacy: tool failed
        const toolCall = data.tool_call;
        showToolError(toolCall.name, toolCall.error);
        
    } else if (eventType === 'chat_complete') {
        // Chat session completed
        showChatComplete(data.total_tool_calls || 0);
        
    } else {
        // Unknown event type - log for debugging
        console.log(`Unknown event type '${eventType}':`, data);
    }
}

"""

import asyncio
import aiohttp
import json
from typing import Optional


class StreamingChatClient:
    """Client for the Streaming Chat API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    async def health_check(self) -> dict:
        """Check server health and available tools"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/health") as response:
                return await response.json()
    
    async def stream_chat_sse(self, message: str, agent_name: Optional[str] = None) -> None:
        """Stream chat using Server-Sent Events"""
        print(f"🚀 Streaming chat via SSE: {message}")
        print("=" * 50)
        
        payload = {
            "message": message,
            "reset_history": False,
            "parallel_tools": True
        }
        
        if agent_name:
            payload["agent_name"] = agent_name
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/stream",
                json=payload
            ) as response:
                if response.status != 200:
                    print(f"❌ Error: {response.status} - {await response.text()}")
                    return
                
                async for line in response.content:
                    line_str = line.decode('utf-8').strip()
                    
                    if line_str.startswith('data: '):
                        try:
                            data = json.loads(line_str[6:])
                            await self._handle_sse_event(data)
                        except json.JSONDecodeError as e:
                            print(f"❌ JSON decode error: {e}")
                            print(f"Raw line: {line_str}")
        
        print("\n" + "=" * 50)
        print("✅ SSE stream completed\n")
    
    async def _handle_sse_event(self, data: dict) -> None:
        """Handle different SSE event types"""
        event_type = data.get("event_type")
        
        if event_type == "content":
            # Stream text content
            print(data["content"], end="", flush=True)
            
        elif event_type == "tool_call":
            # Tool call initiated
            tool_info = data["content"]
            print(f"\n🔧 Tool Call: {tool_info['function']}({tool_info['arguments']})", flush=True)
            print("Response continues: ", end="", flush=True)
            
        elif event_type == "tool_result":
            # Tool execution completed
            result_info = data["content"]
            status = "✅" if result_info["success"] else "❌"
            print(f"\n{status} Tool Result: {result_info['result']}", flush=True)
            print("Response continues: ", end="", flush=True)
            
        elif event_type == "error":
            print(f"\n❌ [Error: {data.get('error_message', 'Unknown error')}]")
            
        else:
            # Unknown event type - just display the raw data for debugging
            print(f"\n🔍 Unknown event type '{event_type}': {data}")
            
        # Handle legacy event types for backward compatibility
        if event_type == "chat_chunk":
            print(data["content"], end="", flush=True)
            
        elif event_type == "tool_call_start":
            tool_call = data["tool_call"]
            print(f"\n🔧 [Tool Starting: {tool_call['name']}]", flush=True)
            
        elif event_type == "tool_call_complete":
            tool_call = data["tool_call"]
            print(f"\n✅ [Tool Completed: {tool_call['name']} -> {tool_call.get('result', 'No result')}]", flush=True)
            
        elif event_type == "tool_call_error":
            tool_call = data["tool_call"]
            print(f"\n❌ [Tool Failed: {tool_call['name']} -> {tool_call.get('error', 'Unknown error')}]", flush=True)
            
        elif event_type == "chat_complete":
            print(f"\n\n🏁 [Chat Complete - {data.get('total_tool_calls', 0)} tool calls]")

async def main():
    """Main demo function"""
    client = StreamingChatClient()
    
    # Test server health
    print("🏥 Checking server health...")
    try:
        health = await client.health_check()
        print(f"✅ Server status: {health['status']}")
        print(f"📊 Available tools: {', '.join(health['available_tools'])}")
        print(f"⏱️  Uptime: {health['uptime_seconds']:.1f}s")
        print()
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        print("Make sure the server is running on http://localhost:8000")
        return
    
    # Test questions
    test_questions = [
        # "What's 15 + 27?",
        "What's the weather in Tokyo?",
        # "Get the weather in New York and calculate 100 * 25",
        # "What time is it in EST and what's the stock price of AAPL?"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n{'='*60}")
        print(f"TEST {i}: {question}")
        print('='*60)
    
        # Test SSE
        await client.stream_chat_sse(question)
        await asyncio.sleep(1)

if __name__ == "__main__":
    print("🤖 Streaming Chat API Client Demo")
    print("Make sure the server is running: python app.py")
    print()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n❌ Demo failed: {e}") 