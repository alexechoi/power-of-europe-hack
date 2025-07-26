import { NextRequest, NextResponse } from "next/server";
import { getChatCompletion, generateThreadTitle, type ChatMessage } from "./mistral";

export async function POST(request: NextRequest) {
	try {
		const { messages }: { messages: ChatMessage[] } = await request.json();

		if (!messages || !Array.isArray(messages)) {
			return NextResponse.json(
				{ error: "Messages array is required" },
				{ status: 400 },
			);
		}

		const response = await getChatCompletion(messages);

		return NextResponse.json({ response });
	} catch (error) {
		console.error("API Error:", error);
		return NextResponse.json(
			{ error: "Failed to get AI response" },
			{ status: 500 },
		);
	}
}
