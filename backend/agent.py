import json
import inspect
import asyncio
import logging
from typing import Any, Callable, Dict, List, Optional, Tuple, AsyncGenerator, Union
from openai import AsyncOpenAI
from models import ToolCall
from dotenv import load_dotenv
import os

load_dotenv()

from src.tools import *


class StreamingAgent:
    """A simple async agent framework using AsyncOpenAI client"""
    
    def __init__(
        self, 
        name: str = "Assistant",
        instructions: str = "You are a helpful assistant.",
        model: str = "gpt-4.1-mini",
        # api_key: Optional[str] = None,
        max_parallel_tools: int = 5,
        tool_call_timeout: float = 30.0
    ):
        api_key = os.getenv("API_KEY")
        url = os.getenv("BASE_URL")
        model = os.getenv("MODEL", model)

        self.name = name
        self.instructions = instructions
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key, base_url=url)
        self.tools: List[Dict] = []
        self.tool_functions: Dict[str, Callable] = {}
        self.conversation_history: List[Dict] = []
        self.max_parallel_tools = max_parallel_tools
        self.tool_call_timeout = tool_call_timeout
        
        # Set up logger for this agent instance
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}.{name}")
        if not self.logger.handlers:
            # Only add handler if none exists to avoid duplicate logs
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def add_tool(self, func: Callable) -> None:
        """Add a function as a tool for the agent"""
        # Get function signature
        sig = inspect.signature(func)
        
        # Build OpenAI function schema
        function_schema = {
            "type": "function",
            "function": {
                "name": func.__name__,
                "description": func.__doc__ or f"Execute {func.__name__}",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        }
        
        # Add parameters from function signature
        for param_name, param in sig.parameters.items():
            param_type = "string"  # Default to string, could be enhanced
            if param.annotation == int:
                param_type = "integer"
            elif param.annotation == float:
                param_type = "number"
            elif param.annotation == bool:
                param_type = "boolean"
            
            function_schema["function"]["parameters"]["properties"][param_name] = {
                "type": param_type
            }
            
            if param.default == param.empty:
                function_schema["function"]["parameters"]["required"].append(param_name)
        
        self.tools.append(function_schema)
        self.tool_functions[func.__name__] = func

        print(f"{self.tool_functions}, {self.tools}")
    
    async def _execute_tool(self, tool_call) -> Tuple[str, str, bool]:
        """Execute a tool call and return (result, tool_call_id, success)"""
        # Fallback error handling for tool call structure
        try:
            function_name = getattr(tool_call.function, 'name', None) if hasattr(tool_call, 'function') else None
            tool_call_id = getattr(tool_call, 'id', 'unknown_tool_id')
            
            if not function_name:
                return "Error: Tool call missing function name", tool_call_id, False
            
            # Parse arguments with fallback error handling
            try:
                arguments_str = getattr(tool_call.function, 'arguments', '{}')
                if not arguments_str:
                    arguments_str = '{}'
                arguments = json.loads(arguments_str)
            except (json.JSONDecodeError, AttributeError) as e:
                return f"Error: Invalid arguments for {function_name}: {str(e)}", tool_call_id, False
            
            if function_name in self.tool_functions:
                try:
                    func = self.tool_functions[function_name]
                    if asyncio.iscoroutinefunction(func):
                        result = await func(**arguments)
                    else:
                        # Run sync function in executor to avoid blocking
                        result = await asyncio.get_event_loop().run_in_executor(None, lambda: func(**arguments))
                    return str(result), tool_call_id, True
                except TypeError as e:
                    # Handle function signature mismatches
                    return f"Error: Invalid arguments for {function_name}: {str(e)}", tool_call_id, False
                except Exception as e:
                    return f"Error executing {function_name}: {str(e)}", tool_call_id, False
            else:
                return f"Error: Unknown function '{function_name}'", tool_call_id, False
                
        except Exception as e:
            # Absolute fallback for any unexpected errors
            fallback_id = getattr(tool_call, 'id', 'unknown_tool_id') if hasattr(tool_call, 'id') else 'unknown_tool_id'
            self.logger.critical(f"Critical error in tool execution: {str(e)}")
            return f"Critical error in tool execution: {str(e)}", fallback_id, False
    
    async def _execute_tools_parallel(self, tool_calls) -> List[Tuple[str, str, bool]]:
        """Execute multiple tool calls in parallel using asyncio"""
        # Create tasks for all tool calls
        tasks = [self._execute_tool(tool_call) for tool_call in tool_calls]
        
        # Execute all tasks concurrently with timeout
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=self.tool_call_timeout
            )
            
            # Process results and handle exceptions
            final_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # Fallback for getting tool call ID
                    try:
                        tool_id = getattr(tool_calls[i], 'id', f'tool_{i}') if i < len(tool_calls) else f'tool_{i}'
                    except (AttributeError, IndexError):
                        tool_id = f'tool_{i}'
                    final_results.append((f"Error: {str(result)}", tool_id, False))
                else:
                    final_results.append(result)
            
            return final_results
        except asyncio.TimeoutError:
            # Handle timeout with fallback tool IDs
            self.logger.critical(f"Tool execution timeout after {self.tool_call_timeout}s")
            timeout_results = []
            for i, tc in enumerate(tool_calls):
                try:
                    tool_id = getattr(tc, 'id', f'tool_{i}') if hasattr(tc, 'id') else f'tool_{i}'
                except AttributeError:
                    tool_id = f'tool_{i}'
                timeout_results.append((f"Timeout after {self.tool_call_timeout}s", tool_id, False))
            return timeout_results
        except Exception as e:
            # Absolute fallback for unexpected errors in parallel execution
            self.logger.critical(f"Critical error in parallel execution: {str(e)}")
            fallback_results = []
            for i, tc in enumerate(tool_calls):
                try:
                    tool_id = getattr(tc, 'id', f'tool_{i}') if hasattr(tc, 'id') else f'tool_{i}'
                except (AttributeError, IndexError):
                    tool_id = f'tool_{i}'
                fallback_results.append((f"Critical error in parallel execution: {str(e)}", tool_id, False))
            return fallback_results
    
    async def _execute_tools_sequential(self, tool_calls) -> List[Tuple[str, str, bool]]:
        """Execute tool calls sequentially"""
        results = []
        for tool_call in tool_calls:
            result, tool_id, success = await self._execute_tool(tool_call)
            results.append((result, tool_id, success))
        return results

    def _is_json_complete(self, json_str: str) -> bool:
        """Check if a JSON string is complete and valid"""
        try:
            if not json_str or not json_str.strip():
                return False
            json.loads(json_str)
            return True
        except (json.JSONDecodeError, TypeError, AttributeError):
            return False
        except Exception:
            # Fallback for any unexpected errors
            return False

    def _prepare_conversation(self, message: str, reset_history: bool = False) -> Dict[str, Any]:
        """Prepare conversation history and API parameters"""
        if reset_history:
            self.conversation_history = []
        
        # Add system message if this is the start of conversation
        if not self.conversation_history:
            self.conversation_history.append({
                "role": "system",
                "content": self.instructions
            })
        
        # Add user message
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        # Prepare API call
        api_params = {
            "model": self.model,
            "messages": self.conversation_history,
            "stream": True
        }
        
        if self.tools:
            api_params["tools"] = self.tools
            
        return api_params

    async def _call_llm(self, api_params: Dict[str, Any]) -> AsyncGenerator[Union[Dict[str, Any], Tuple[str, List[Dict], Dict[str, Tuple[str, bool]]]], None]:
        """Call LLM with streaming and handle tool calls during streaming"""
        self.logger.info(f"🌊 Making streaming API call with {len(self.tools)} tools available")
        
        # Get streaming response from OpenAI
        stream = await self.client.chat.completions.create(**api_params)
        
        # Collect the full response and tool calls
        full_content = ""
        tool_calls_by_index = {}  # Track tool calls by their index
        executed_tool_calls = set()  # Track which tool calls have been executed
        tool_results = {}  # Store results of executed tool calls
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content_chunk = chunk.choices[0].delta.content
                full_content += content_chunk
                # Yield structured content event
                yield {
                    "event_type": "content",
                    "content": content_chunk
                }
            
            # Handle tool calls in streaming
            if chunk.choices[0].delta.tool_calls:
                for tool_call_delta in chunk.choices[0].delta.tool_calls:
                    index = tool_call_delta.index
                    
                    # Initialize tool call for this index if not seen before
                    if index not in tool_calls_by_index:
                        tool_calls_by_index[index] = {
                            "id": "",
                            "type": "function",
                            "function": {
                                "name": "",
                                "arguments": ""
                            }
                        }
                    
                    # Update tool call data for this index
                    if tool_call_delta.id:
                        tool_calls_by_index[index]["id"] = tool_call_delta.id
                    
                    if tool_call_delta.type:
                        tool_calls_by_index[index]["type"] = tool_call_delta.type
                    
                    if tool_call_delta.function:
                        if tool_call_delta.function.name:
                            tool_calls_by_index[index]["function"]["name"] = tool_call_delta.function.name
                        if tool_call_delta.function.arguments:
                            tool_calls_by_index[index]["function"]["arguments"] += tool_call_delta.function.arguments
                    
                    # Check if this tool call is complete and ready to execute
                    tool_call = tool_calls_by_index[index]
                    if (index not in executed_tool_calls and 
                        tool_call["id"] and 
                        tool_call["function"]["name"] and 
                        self._is_json_complete(tool_call["function"]["arguments"])):
                        
                        self.logger.debug(f"⚡ Tool call {index} is ready, executing immediately...")
                        
                        # Yield tool call event
                        yield {
                            "event_type": "tool_call",
                            "content": {
                                "id": tool_call["id"],
                                "function": tool_call["function"]["name"],
                                "arguments": json.loads(tool_call["function"]["arguments"])
                            }
                        }
                        
                        # Execute tool call with fallback
                        result, success = await self._call_tool_with_fall_back(tool_call)
                        tool_results[tool_call["id"]] = (result, success)
                        executed_tool_calls.add(index)
                        
                        # Yield tool result event
                        yield {
                            "event_type": "tool_result",
                            "content": {
                                "tool_call_id": tool_call["id"],
                                "result": result,
                                "success": success
                            }
                        }
                        
                        if success:
                            self.logger.debug(f"✅ Tool {tool_call['id']} completed successfully during streaming")
                        else:
                            self.logger.warning(f"❌ Tool {tool_call['id']} failed during streaming: {result}")
        
        # Convert to list and filter valid tool calls
        tool_calls = [tool_calls_by_index[i] for i in sorted(tool_calls_by_index.keys())]
        
        # Filter out any invalid tool calls (empty names or incomplete data)
        valid_tool_calls = [
            tc for tc in tool_calls 
            if tc["function"]["name"] and tc["function"]["arguments"]
        ]
        
        # Yield the final results as a tuple
        yield (full_content, valid_tool_calls, tool_results)

    async def _call_tool_with_fall_back(self, tool_call_dict: Dict) -> Tuple[str, bool]:
        """Execute a tool call with proper fallback error handling"""
        try:
            mock_tool_call = ToolCall(
                tool_call_dict["id"],
                tool_call_dict["type"],
                tool_call_dict["function"]["name"],
                tool_call_dict["function"]["arguments"]
            )
            
            # Execute the tool call
            result, tool_call_id, success = await self._execute_tool(mock_tool_call)
            return result, success
            
        except Exception as e:
            # Fallback error handling for tool call creation/execution
            error_msg = f"Error creating or executing tool call: {str(e)}"
            self.logger.critical(error_msg)
            return error_msg, False

    async def _submit_tool_results(self, full_content: str, valid_tool_calls: List[Dict], 
                                  tool_results: Dict[str, Tuple[str, bool]]) -> AsyncGenerator[Dict[str, Any], None]:
        """Submit tool results and get final response from LLM"""
        self.logger.info(f"🔧 Processing {len(valid_tool_calls)} total tool calls")
        
        # Add assistant's tool call message to history
        self.conversation_history.append({
            "role": "assistant",
            "content": full_content,
            "tool_calls": valid_tool_calls
        })
        
        # Add tool results to conversation history (both already executed and any remaining)
        for i, tc in enumerate(valid_tool_calls):
            tool_call_id = tc["id"]
            if tool_call_id in tool_results:
                # Use already computed result
                result, success = tool_results[tool_call_id]
            else:
                # Execute any remaining tool calls that weren't completed during streaming
                self.logger.debug(f"🔄 Executing remaining tool call {tool_call_id}...")
                
                # Yield tool call event for remaining tool calls
                try:
                    arguments = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    arguments = tc["function"]["arguments"]
                
                yield {
                    "event_type": "tool_call",
                    "content": {
                        "id": tool_call_id,
                        "function": tc["function"]["name"],
                        "arguments": arguments
                    }
                }
                
                result, success = await self._call_tool_with_fall_back(tc)
                
                # Yield tool result event
                yield {
                    "event_type": "tool_result",
                    "content": {
                        "tool_call_id": tool_call_id,
                        "result": result,
                        "success": success
                    }
                }
                
                if success:
                    self.logger.debug(f"✅ Tool {tool_call_id} completed successfully")
                else:
                    self.logger.warning(f"❌ Tool {tool_call_id} failed: {result}")
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": result
            })
        
        # Get final streaming response after tool execution
        self.logger.debug("📝 Getting final streaming response from assistant...")
        
        final_api_params = {
            "model": self.model,
            "messages": self.conversation_history,
            "stream": True
        }
        
        if self.tools:
            final_api_params["tools"] = self.tools
        
        final_stream = await self.client.chat.completions.create(**final_api_params)
        final_content = ""
        
        async for chunk in final_stream:
            if chunk.choices[0].delta.content:
                content_chunk = chunk.choices[0].delta.content
                final_content += content_chunk
                # Yield structured content event
                yield {
                    "event_type": "content",
                    "content": content_chunk
                }
        
        # Add final assistant response to history
        self.conversation_history.append({
            "role": "assistant",
            "content": final_content
        })

    async def chat_stream(self, message: str, reset_history: bool = False, parallel_tools: bool = True) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream a chat response from the agent
        
        Args:
            message: The user message
            reset_history: Whether to reset conversation history
            parallel_tools: Whether to execute multiple tools in parallel
            
        Yields:
            Dict[str, Any]: Structured events with event_type and content
                - {"event_type": "content", "content": "text chunk"}
                - {"event_type": "tool_call", "content": {"id": "...", "function": "...", "arguments": {...}}}
                - {"event_type": "tool_result", "content": {"tool_call_id": "...", "result": "...", "success": bool}}
        """
        # Prepare conversation and API parameters
        api_params = self._prepare_conversation(message, reset_history)
        
        # Call LLM and handle streaming response with tool calls
        full_content = ""
        valid_tool_calls = []
        tool_results = {}
        
        async for event in self._call_llm(api_params):
            if isinstance(event, tuple):
                # This is the final result from _call_llm
                full_content, valid_tool_calls, tool_results = event
                break
            else:
                # This is a structured event to yield
                yield event
        
        # Handle tool calls if any valid ones were made
        if valid_tool_calls:
            async for event in self._submit_tool_results(full_content, valid_tool_calls, tool_results):
                yield event
        else:
            # No tool calls, just add the response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": full_content
            })



async def streaming_demo():
    """Dedicated streaming demonstration function"""
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    logging.info("=== Async Streaming-Only Demo ===")
    
    agent = StreamingAgent(
        name="Streaming Assistant",
        instructions="You are a helpful streaming assistant.",
    )
    
    # Set agent logger to debug level for demonstration
    agent.logger.setLevel(logging.INFO)
    
    # Add tools
    # agent.add_tool(get_weather)
    # agent.add_tool(calculate)
    # agent.add_tool(get_time)
    agent.add_tool(query_tool_by_name)

    # await query_tool_by_name("AWS Cloud")
    
    queries = [
        # "What's 15 + 27?",
        # "Get the weather in Tokyo and the current time in EST",
        "Can you find me an EU alternative to 'AWS Cloud'? Use the tool 'query_tool_by_name' to find the alternative.",
        # "Tell me about the benefits of streaming responses in AI applications"
    ]
    
    for i, query in enumerate(queries, 1):
        logging.info(f"Query {i}: {query}")
        print("Response: ", end="", flush=True)
        
        async for event in agent.chat_stream(query, reset_history=True):
            if event["event_type"] == "content":
                print(event["content"], end="", flush=True)
            elif event["event_type"] == "tool_call":
                tool_info = event["content"]
                print(f"\n🔧 Tool Call: {tool_info['function']}({tool_info['arguments']})", flush=True)
                print("Response continues: ", end="", flush=True)
            elif event["event_type"] == "tool_result":
                result_info = event["content"]
                status = "✅" if result_info["success"] else "❌"
                print(f"\n{status} Tool Result: {result_info['result']}", flush=True)
                print("Response continues: ", end="", flush=True)
        
        print("\n" + "="*50 + "\n")


if __name__ == "__main__":
    asyncio.run(streaming_demo())
