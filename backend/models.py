from typing import Any, Dict, List, Optional, Union, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# === Core Agent Models ===
class Function:
    """Mock function object for tool calls - keeping original for agent compatibility"""
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments


class ToolCall:
    """Mock tool call object for execution - keeping original for agent compatibility"""
    def __init__(self, id: str, type: str, function_name: str, function_args: str):
        self.id = id
        self.type = type
        self.function = Function(function_name, function_args)


# === API Models ===
class ChatMessage(BaseModel):
    """A single chat message"""
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)


class ToolCallInfo(BaseModel):
    """Information about a tool call"""
    id: str
    name: str
    arguments: Dict[str, Any]
    status: Literal["pending", "executing", "completed", "failed"] = "pending"
    result: Optional[str] = None
    error: Optional[str] = None
    execution_time_ms: Optional[int] = None


class ChatRequest(BaseModel):
    """Request for chat endpoint"""
    message: str
    reset_history: bool = False
    parallel_tools: bool = True
    agent_name: Optional[str] = "default"
    instructions: Optional[str] = None


class ChatResponse(BaseModel):
    """Response for non-streaming chat"""
    response: str
    tool_calls: List[ToolCallInfo] = []
    conversation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# === Streaming Models ===
class StreamingEvent(BaseModel):
    """Base streaming event"""
    event_type: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ChatChunkEvent(StreamingEvent):
    """A chunk of chat content"""
    event_type: Literal["chat_chunk"] = "chat_chunk"
    content: str
    is_complete: bool = False


class ToolCallStartEvent(StreamingEvent):
    """Tool call started"""
    event_type: Literal["tool_call_start"] = "tool_call_start"
    tool_call: ToolCallInfo


class ToolCallCompleteEvent(StreamingEvent):
    """Tool call completed"""
    event_type: Literal["tool_call_complete"] = "tool_call_complete"
    tool_call: ToolCallInfo


class ToolCallErrorEvent(StreamingEvent):
    """Tool call failed"""
    event_type: Literal["tool_call_error"] = "tool_call_error"
    tool_call: ToolCallInfo


class ChatCompleteEvent(StreamingEvent):
    """Chat response completed"""
    event_type: Literal["chat_complete"] = "chat_complete"
    final_response: str
    total_tool_calls: int = 0


class ErrorEvent(StreamingEvent):
    """Error occurred"""
    event_type: Literal["error"] = "error"
    error_message: str
    error_code: Optional[str] = None


# === Server Models ===
class ServerStatus(BaseModel):
    """Server status information"""
    status: Literal["healthy", "degraded", "error"]
    version: str = "1.0.0"
    available_tools: List[str] = []
    uptime_seconds: float
    active_connections: int = 0


class AgentConfig(BaseModel):
    """Configuration for creating an agent"""
    name: str = "Assistant"
    instructions: str = "You are a helpful assistant."
    model: str = "gpt-4-turbo-preview"
    max_parallel_tools: int = 5
    tool_call_timeout: float = 30.0


# === WebSocket Models ===
class WebSocketMessage(BaseModel):
    """WebSocket message structure"""
    type: Literal["chat", "ping", "disconnect"]
    data: Optional[Dict[str, Any]] = None


class WebSocketResponse(BaseModel):
    """WebSocket response structure"""
    type: Literal["chat_chunk", "tool_call", "error", "pong"]
    data: Optional[Union[ChatChunkEvent, ToolCallCompleteEvent, ErrorEvent]] = None
    timestamp: datetime = Field(default_factory=datetime.now)