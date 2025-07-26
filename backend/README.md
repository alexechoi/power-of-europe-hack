# Streaming Chat API

A FastAPI server for streaming chat with tool calling capabilities, powered by OpenAI and your custom StreamingAgent.

## Features

- 🚀 **Streaming Responses**: Real-time chat streaming using Server-Sent Events (SSE)
- 🔧 **Tool Calling**: Parallel tool execution with live status updates
- 🔌 **WebSocket Support**: Real-time bidirectional communication
- 📊 **Multiple Agents**: Create and manage multiple chat agents
- 🏥 **Health Monitoring**: Built-in health checks and status monitoring
- 📝 **Auto Documentation**: Swagger/OpenAPI docs at `/docs`

## Quick Start

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

### 2. Set Environment Variables

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run the Server

```bash
python app.py
```

Or using uvicorn directly:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

## API Endpoints

### Health Check
- **GET** `/health` - Server status and available tools

### Chat Endpoints
- **POST** `/chat/stream` - Streaming chat with Server-Sent Events
- **POST** `/chat` - Standard chat (non-streaming)
- **WebSocket** `/ws` - Real-time chat via WebSocket

### Agent Management
- **GET** `/agents` - List all available agents
- **POST** `/agents/{agent_name}` - Create a new agent with custom config

### Documentation
- **GET** `/docs` - Interactive API documentation (Swagger)
- **GET** `/redoc` - Alternative API documentation

## Usage Examples

### Streaming Chat (Server-Sent Events)

```javascript
// Frontend JavaScript example
async function streamChat(message) {
    const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message,
            reset_history: false,
            parallel_tools: true
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                
                if (data.event_type === 'chat_chunk') {
                    console.log('Chat chunk:', data.content);
                } else if (data.event_type === 'tool_call_complete') {
                    console.log('Tool call completed:', data.tool_call);
                } else if (data.event_type === 'chat_complete') {
                    console.log('Chat completed:', data.final_response);
                }
            }
        }
    }
}
```

### WebSocket Chat

```javascript
// Frontend WebSocket example
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = function() {
    console.log('WebSocket connected');
};

ws.onmessage = function(event) {
    const response = JSON.parse(event.data);
    
    if (response.type === 'chat_chunk') {
        console.log('Chat chunk:', response.data.content);
    } else if (response.type === 'tool_call') {
        console.log('Tool call:', response.data);
    } else if (response.type === 'error') {
        console.error('Error:', response.data);
    }
};

// Send a chat message
function sendMessage(message) {
    ws.send(JSON.stringify({
        type: 'chat',
        data: {
            message: message,
            reset_history: false,
            parallel_tools: true
        }
    }));
}
```

### Python Client Example

```python
import asyncio
import aiohttp
import json

async def stream_chat(message):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            'http://localhost:8000/chat/stream',
            json={
                'message': message,
                'reset_history': False,
                'parallel_tools': True
            }
        ) as response:
            async for line in response.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data: '):
                    data = json.loads(line[6:])
                    
                    if data['event_type'] == 'chat_chunk':
                        print(data['content'], end='', flush=True)
                    elif data['event_type'] == 'tool_call_complete':
                        print(f"\n[Tool: {data['tool_call']['name']} completed]")
                    elif data['event_type'] == 'chat_complete':
                        print("\n[Chat completed]")

# Usage
asyncio.run(stream_chat("What's the weather in Tokyo and what's 15 + 27?"))
```

## Event Types

The streaming API emits the following event types:

- `chat_chunk` - A piece of the chat response
- `tool_call_start` - A tool call has started
- `tool_call_complete` - A tool call has finished successfully
- `tool_call_error` - A tool call has failed
- `chat_complete` - The entire chat response is complete
- `error` - An error occurred

## Available Tools

The default agent includes these tools:

- **get_weather(city)** - Get weather information for a city
- **calculate(expression)** - Evaluate mathematical expressions
- **get_time(timezone)** - Get current time in specified timezone
- **search_web(query)** - Search the web for information
- **get_stock_price(symbol)** - Get stock price for a symbol

## Configuration

### Agent Configuration

Create custom agents with specific configurations:

```python
# POST /agents/my_custom_agent
{
    "name": "MyAssistant",
    "instructions": "You are a specialized assistant for...",
    "model": "gpt-4-turbo-preview",
    "max_parallel_tools": 3,
    "tool_call_timeout": 30.0
}
```

### Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)

## Development

### Project Structure

```
martino/
├── app.py              # FastAPI server
├── agent.py            # StreamingAgent implementation
├── models.py           # Pydantic models
├── requirements.txt    # Dependencies
├── src/
│   └── tools/
│       ├── __init__.py
│       └── test_tools.py  # Available tools
└── README.md
```

### Adding New Tools

1. Create your tool function in `src/tools/`:

```python
async def my_custom_tool(param1: str, param2: int) -> str:
    """Description of what this tool does"""
    # Your tool implementation
    return "Tool result"
```

2. Import and add it to agents in `app.py`:

```python
from src.tools import my_custom_tool

# Add to agent
agent.add_tool(my_custom_tool)
```

## Production Deployment

For production deployment:

1. Use a production WSGI server like Gunicorn with Uvicorn workers
2. Configure proper CORS origins instead of `["*"]`
3. Add authentication and rate limiting
4. Set up monitoring and logging
5. Use environment variables for configuration

```bash
# Example production command
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## License

MIT License 