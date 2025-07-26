import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
	apiKey: process.env.MISTRAL_API_KEY,
});

if (!process.env.MISTRAL_API_KEY) {
	throw new Error("Mistral API key not found");
}

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export async function generateTitle(
	messages: ChatMessage[],
): Promise<string> {
	try {
		const result = await mistral.chat.complete({
			model: "mistral-small-latest",
			messages: messages,
		});

		// Extract the content from the response
		const responseContent = result.choices?.[0]?.message?.content;
		if (!responseContent) {
			throw new Error("No response content received from Mistral");
		}

		// Handle both string and ContentChunk array responses
		const response =
			typeof responseContent === "string"
				? responseContent
				: responseContent
						.map((chunk) => {
							if (chunk.type === "text") {
								return chunk.text || "";
							}
							return "";
						})
						.join("");

		return response;
	} catch (error) {
		console.error("Error calling Mistral API:", error);
		throw new Error("Failed to get response from Mistral AI");
	}
}