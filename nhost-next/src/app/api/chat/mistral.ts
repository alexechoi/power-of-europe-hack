export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

interface BackendChatRequest {
	message: string;
	reset_history: boolean;
	parallel_tools: boolean;
	agent_name?: string;
}

interface ToolCallInfo {
	id: string;
	name: string;
	arguments: Record<string, any>;
	status: "pending" | "executing" | "completed" | "failed";
	result?: string;
	error?: string;
	execution_time_ms?: number;
}

interface BackendChatResponse {
	response: string;
	tool_calls: ToolCallInfo[];
	conversation_id?: string;
	timestamp: string;
}

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function getChatCompletion(
	messages: ChatMessage[],
): Promise<string> {
	try {
		// Convert messages array to a single message for the backend
		// For now, we'll take the last user message and include context from previous messages
		const conversationContext = messages
			.map((msg) => `${msg.role}: ${msg.content}`)
			.join("\n");
		
		// Get the latest user message
		const lastUserMessage = messages.filter(msg => msg.role === "user").pop();
		if (!lastUserMessage) {
			throw new Error("No user message found in conversation");
		}

		const backendRequest: BackendChatRequest = {
			message: lastUserMessage.content,
			reset_history: false,
			parallel_tools: true,
			agent_name: "default"
		};

		const response = await fetch(`${BACKEND_URL}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(backendRequest),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Backend API error: ${response.status} - ${errorText}`);
		}

		const data: BackendChatResponse = await response.json();
		
		if (!data.response) {
			throw new Error("No response content received from backend");
		}

		return data.response;
	} catch (error) {
		console.error("Error calling backend API:", error);
		throw new Error(
			error instanceof Error 
				? `Failed to get response from backend: ${error.message}`
				: "Failed to get response from backend"
		);
	}
}
