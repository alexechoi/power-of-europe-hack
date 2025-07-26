import { NextRequest, NextResponse } from "next/server";
import { generateThreadTitle } from "../chat/mistral";

export async function POST(request: NextRequest) {
	try {
		const { userMessage }: { userMessage: string } = await request.json();

		if (!userMessage) {
			return NextResponse.json(
				{ error: "User message is required" },
				{ status: 400 },
			);
		}

		// Generate title based on the user message only
		const title = await generateThreadTitle(userMessage, "");

		return NextResponse.json({ title });
	} catch (error) {
		console.error("API Error:", error);
		return NextResponse.json(
			{ error: "Failed to generate title" },
			{ status: 500 },
		);
	}
} 