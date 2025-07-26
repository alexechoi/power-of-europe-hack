"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
	useAuthenticationStatus,
	useUserData,
	useSignOut,
} from "@nhost/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { nhost } from "../../lib/nhost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Removed direct import - now using API route

import {
	Send,
	Plus,
	MessageSquare,
	Settings,
	User,
	LogOut,
	Menu,
	X,
} from "lucide-react";

interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

interface Message {
	id: string;
	content: string;
	isUser: boolean;
	timestamp: Date;
}

interface Thread {
	id: string;
	title: string;
	lastMessage: string;
	timestamp: Date;
}

// GraphQL query to fetch user threads
const getUserThreads = `
  query GetUserThreads($user_id: uuid!) {
    threads(where: {user_id: {_eq: $user_id}}, order_by: {updated_at: desc}) {
      id
      title
      created_at
      updated_at
    }
  }
`;

// GraphQL query to fetch messages for a thread
const getThreadMessages = `
  query GetThreadMessages($thread_id: uuid!) {
    messages(where: {thread_id: {_eq: $thread_id}}, order_by: {created_at: asc}) {
      id
      content
      is_user
      created_at
      user_id
    }
  }
`;

// GraphQL mutation to create a new thread
const createThreadMutation = `
  mutation CreateThread($title: String!, $user_id: uuid!) {
    insert_threads_one(object: {
      title: $title,
      user_id: $user_id
    }) {
      id
      title
      created_at
      updated_at
    }
  }
`;

// GraphQL mutation to update a thread's timestamp
const updateThreadMutation = `
  mutation UpdateThread($id: uuid!) {
    update_threads_by_pk(
      pk_columns: {id: $id}, 
      _set: {
        updated_at: "now()"
      }
    ) {
      id
      updated_at
    }
  }
`;

// GraphQL mutation to insert a message
const insertMessageMutation = `
  mutation InsertMessage($thread_id: uuid!, $user_id: uuid!, $content: String!, $is_user: Boolean!) {
    insert_messages_one(object: {
      thread_id: $thread_id,
      user_id: $user_id,
      content: $content,
      is_user: $is_user
    }) {
      id
      content
      is_user
      created_at
    }
  }
`;

// GraphQL mutation to update thread title
const updateThreadTitleMutation = `
  mutation UpdateThreadTitle($id: uuid!, $title: String!) {
    update_threads_by_pk(
      pk_columns: {id: $id}, 
      _set: {
        title: $title,
        updated_at: "now()"
      }
    ) {
      id
      title
      updated_at
    }
  }
`;

// Interface for thread data from GraphQL
interface ThreadData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Interface for message data from GraphQL
interface MessageData {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
  user_id: string;
}

// Helper function to generate thread title
const generateThreadTitle = async (userMessage: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userMessage }),
    });

    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.title || null;
  } catch (error) {
    console.error("Error generating title:", error);
    return null;
  }
};

export default function ChatInterface() {
	const { isAuthenticated, isLoading } = useAuthenticationStatus();
	const user = useUserData();
	const { signOut } = useSignOut();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [threads, setThreads] = useState<Thread[]>([]);
	const [activeThreadId, setActiveThreadId] = useState("");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [threadsLoading, setThreadsLoading] = useState(true);
	const [threadsError, setThreadsError] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	// Redirect to auth if not authenticated
	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.push("/auth");
		}
	}, [isAuthenticated, isLoading, router]);

	// Handle query parameter for auto-sending a message
	useEffect(() => {
		const query = searchParams.get('query');
		
		// Only proceed if we have a query, user is authenticated, and we have an active thread
		if (query && isAuthenticated && activeThreadId && !isSending && user?.id) {
			// Set the input value to the query
			setInputValue(query);
			
			// Create a small delay to ensure the component is fully rendered
			const timer = setTimeout(() => {
				// Create a temporary message object for immediate UI update
				const tempUserMessage: Message = {
					id: Date.now().toString(),
					content: query,
					isUser: true,
					timestamp: new Date(),
				};

				// Add user message immediately to UI
				setMessages((prev) => [...prev, tempUserMessage]);
				setIsSending(true);

				// Check if this is the first message in the thread
				const isFirstMessage = messages.length === 0;

				// Start title generation process if this is the first message
				let titleGenerationPromise: Promise<string | null> = Promise.resolve(null);
				if (isFirstMessage && activeThreadId && activeThreadId !== "default") {
					titleGenerationPromise = generateThreadTitle(query);
				}

				// Process the message
				(async () => {
					try {
						// Save user message to database if we have a valid thread
						if (activeThreadId && activeThreadId !== "default") {
							try {
								await nhost.graphql.request(
									insertMessageMutation,
									{
										thread_id: activeThreadId,
										user_id: user.id,
										content: query,
										is_user: true,
									}
								);
							} catch (err) {
								console.error("Failed to save user message:", err);
							}
						}

						// Prepare conversation history for Mistral
						const conversationHistory: ChatMessage[] = [
							...messages.map((msg) => ({
								role: msg.isUser ? ("user" as const) : ("assistant" as const),
								content: msg.content,
							})),
							{
								role: "user" as const,
								content: query,
							},
						];

						// Get response from Mistral via API route
						const response = await fetch('/api/chat', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ messages: conversationHistory }),
						});

						if (!response.ok) {
							throw new Error(`API request failed: ${response.status}`);
						}

						const data = await response.json();
						const aiResponse = data.response;

						// Create temporary bot message for UI
						const tempBotMessage: Message = {
							id: (Date.now() + 1).toString(),
							content: aiResponse,
							isUser: false,
							timestamp: new Date(),
						};

						// Add bot response to UI
						setMessages((prev) => [...prev, tempBotMessage]);

						// Save bot message to database if we have a valid thread
						if (activeThreadId && activeThreadId !== "default") {
							try {
								await nhost.graphql.request(
									insertMessageMutation,
									{
										thread_id: activeThreadId,
										user_id: user.id,
										content: aiResponse,
										is_user: false,
									}
								);
							} catch (err) {
								console.error("Failed to save bot message:", err);
							}
						}

						// Update thread timestamp in the database
						if (activeThreadId && activeThreadId !== "default") {
							try {
								await nhost.graphql.request(updateThreadMutation, {
									id: activeThreadId
								});
							} catch (err) {
								console.error("Failed to update thread:", err);
							}
						}

						// Update local thread state
						setThreads((prev) =>
							prev.map((thread) =>
								thread.id === activeThreadId
									? { ...thread, lastMessage: query, timestamp: new Date() }
									: thread,
							),
						);

						// Handle title generation
						const generatedTitle = await titleGenerationPromise;
						if (generatedTitle && activeThreadId && activeThreadId !== "default") {
							try {
								const { error: titleError } = await nhost.graphql.request(
									updateThreadTitleMutation,
									{
										id: activeThreadId,
										title: generatedTitle
									}
								);

								if (!titleError) {
									// Update thread title in the UI
									setThreads((prev) =>
										prev.map((thread) =>
											thread.id === activeThreadId
												? { ...thread, title: generatedTitle }
												: thread
										)
									);
								}
							} catch (err) {
								console.error("Failed to update thread title:", err);
							}
						}
						
						// Clean the URL by removing the query parameter
						const url = new URL(window.location.href);
						url.searchParams.delete('query');
						window.history.replaceState({}, '', url);
						
					} catch (error) {
						console.error("Error processing auto-query:", error);
						
						// Add error message to UI
						const errorMessage: Message = {
							id: (Date.now() + 1).toString(),
							content: "Sorry, I encountered an error while processing your message. Please try again.",
							isUser: false,
							timestamp: new Date(),
						};
						setMessages((prev) => [...prev, errorMessage]);
					} finally {
						setIsSending(false);
					}
				})();
			}, 500);
			
			return () => clearTimeout(timer);
		}
	}, [isAuthenticated, activeThreadId, searchParams, user?.id, messages]);

	// Fetch user threads when component mounts
	useEffect(() => {
		async function fetchUserThreads() {
			if (!user?.id) return;

			try {
				setThreadsLoading(true);
				const { data, error } = await nhost.graphql.request(getUserThreads, {
					user_id: user.id,
				});

				if (error) {
					console.error("GraphQL Error:", error);
					setThreadsError(
						"Failed to fetch threads. " + JSON.stringify(error)
					);
					// Fallback to a default thread if there's an error
					setThreads([
						{
							id: "default",
							title: "Welcome Chat",
							lastMessage: "Hello! How can I help you today?",
							timestamp: new Date(),
						},
					]);
					setActiveThreadId("default");
				} else {
					const fetchedThreads = data?.threads.map((thread: ThreadData) => ({
						id: thread.id,
						title: thread.title,
						lastMessage: "No messages yet", // This is just for UI display now
						timestamp: new Date(thread.updated_at),
					})) || [];
					
					setThreads(fetchedThreads);
					
					// If we have threads, set the active thread to the first one
					if (fetchedThreads.length > 0) {
						setActiveThreadId(fetchedThreads[0].id);
					} else {
						// If no threads exist, create a default welcome thread
						createNewThread(true);
					}
				}
			} catch (err) {
				console.error("Fetch Error:", err);
				setThreadsError("Failed to connect to the database.");
				// Fallback to a default thread
				setThreads([
					{
						id: "default",
						title: "Welcome Chat",
						lastMessage: "Hello! How can I help you today?",
						timestamp: new Date(),
					},
				]);
				setActiveThreadId("default");
			} finally {
				setThreadsLoading(false);
			}
		}

		if (isAuthenticated && user?.id) {
			fetchUserThreads();
		}
	}, [isAuthenticated, user?.id]);

	// Load messages when active thread changes
	useEffect(() => {
		async function fetchThreadMessages() {
			if (!activeThreadId || activeThreadId === "default") {
				setMessages([]);
				return;
			}

			try {
				const { data, error } = await nhost.graphql.request(getThreadMessages, {
					thread_id: activeThreadId,
				});

				if (error) {
					console.error("GraphQL Error:", error);
					return;
				}

				if (data?.messages) {
					const fetchedMessages = data.messages.map((msg: MessageData) => ({
						id: msg.id,
						content: msg.content,
						isUser: msg.is_user,
						timestamp: new Date(msg.created_at),
					}));
					
					setMessages(fetchedMessages);
				}
			} catch (err) {
				console.error("Error fetching messages:", err);
			}
		}

		fetchThreadMessages();
	}, [activeThreadId]);

	const handleSendMessage = async () => {
		if (!inputValue.trim() || isSending) return;

		// Create a temporary message object for immediate UI update
		const tempUserMessage: Message = {
			id: Date.now().toString(),
			content: inputValue,
			isUser: true,
			timestamp: new Date(),
		};

		// Add user message immediately to UI
		setMessages((prev) => [...prev, tempUserMessage]);
		const currentInput = inputValue;
		setInputValue("");
		setIsSending(true);

		// Check if this is the first message in the thread
		const isFirstMessage = messages.length === 0;

		// Start title generation process if this is the first message
		// This runs in parallel with the message processing
		let titleGenerationPromise: Promise<string | null> = Promise.resolve(null);
		if (isFirstMessage && activeThreadId && activeThreadId !== "default") {
			titleGenerationPromise = generateThreadTitle(currentInput);
		}

		// Variable to store the saved user message ID (if successful)
		let savedUserMessageId: string | null = null;

		try {
			// Save user message to database if we have a valid thread
			if (activeThreadId && activeThreadId !== "default" && user?.id) {
				try {
					const { data: messageData, error: messageError } = await nhost.graphql.request(
						insertMessageMutation,
						{
							thread_id: activeThreadId,
							user_id: user.id,
							content: currentInput,
							is_user: true,
						}
					);

					if (messageError) {
						console.error("Error saving user message:", messageError);
					} else if (messageData?.insert_messages_one?.id) {
						savedUserMessageId = messageData.insert_messages_one.id;
					}
				} catch (err) {
					console.error("Failed to save user message:", err);
				}
			}

			// Prepare conversation history for Mistral
			const conversationHistory: ChatMessage[] = [
				...messages.map((msg) => ({
					role: msg.isUser ? ("user" as const) : ("assistant" as const),
					content: msg.content,
				})),
				{
					role: "user" as const,
					content: currentInput,
				},
			];

			// Get response from Mistral via API route
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ messages: conversationHistory }),
			});

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const data = await response.json();
			const aiResponse = data.response;

			// Create temporary bot message for UI
			const tempBotMessage: Message = {
				id: (Date.now() + 1).toString(),
				content: aiResponse,
				isUser: false,
				timestamp: new Date(),
			};

			// Add bot response to UI
			setMessages((prev) => [...prev, tempBotMessage]);

			// Save bot message to database if we have a valid thread
			if (activeThreadId && activeThreadId !== "default" && user?.id) {
				try {
					const { data: botMessageData, error: botMessageError } = await nhost.graphql.request(
						insertMessageMutation,
						{
							thread_id: activeThreadId,
							user_id: user.id,
							content: aiResponse,
							is_user: false,
						}
					);

					if (botMessageError) {
						console.error("Error saving bot message:", botMessageError);
					}
				} catch (err) {
					console.error("Failed to save bot message:", err);
				}
			}

			// Update thread timestamp in the database (for all messages)
			if (activeThreadId && activeThreadId !== "default") {
				try {
					await nhost.graphql.request(updateThreadMutation, {
						id: activeThreadId
					});
				} catch (err) {
					console.error("Failed to update thread:", err);
				}
			}

			// Update local thread state
			setThreads((prev) =>
				prev.map((thread) =>
					thread.id === activeThreadId
						? { ...thread, lastMessage: currentInput, timestamp: new Date() }
						: thread,
				),
			);
		} catch (error) {
			console.error("Error getting AI response:", error);

			// Create error message for UI
			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				content:
					"Sorry, I encountered an error while processing your message. Please try again.",
				isUser: false,
				timestamp: new Date(),
			};
			
			// Add error message to UI
			setMessages((prev) => [...prev, errorMessage]);
			
			// Save error message to database if we have a valid thread
			if (activeThreadId && activeThreadId !== "default" && user?.id) {
				try {
					const { data: errorMessageData, error: errorMessageError } = await nhost.graphql.request(
						insertMessageMutation,
						{
							thread_id: activeThreadId,
							user_id: user.id,
							content: errorMessage.content,
							is_user: false,
						}
					);

					if (errorMessageError) {
						console.error("Error saving error message:", errorMessageError);
					}
				} catch (err) {
					console.error("Failed to save error message:", err);
				}
			}
		} finally {
			setIsSending(false);
			
			// Handle title generation result regardless of message success/failure
			try {
				const generatedTitle = await titleGenerationPromise;
				if (generatedTitle && activeThreadId && activeThreadId !== "default") {
					// Update thread title in the database
					const { data: titleData, error: titleError } = await nhost.graphql.request(
						updateThreadTitleMutation,
						{
							id: activeThreadId,
							title: generatedTitle
						}
					);

					if (titleError) {
						console.error("Error updating thread title:", titleError);
					} else {
						// Update thread title in the UI
						setThreads((prev) =>
							prev.map((thread) =>
								thread.id === activeThreadId
									? { ...thread, title: generatedTitle }
									: thread
							)
						);
					}
				}
			} catch (err) {
				console.error("Failed to process title generation:", err);
			}
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const createNewThread = async (isInitial = false) => {
		if (!user?.id) return;

		try {
			const title = "New Chat";
			
			// Create thread in the database
			const { data, error } = await nhost.graphql.request(createThreadMutation, {
				title,
				user_id: user.id,
			});

			if (error) {
				console.error("GraphQL Error:", error);
				throw new Error("Failed to create thread");
			}

			const newThread = data?.insert_threads_one;
			
			if (!newThread) {
				throw new Error("No thread returned from creation");
			}

			const threadObj: Thread = {
				id: newThread.id,
				title: newThread.title,
				lastMessage: "Start a new conversation...", // Default UI text
				timestamp: new Date(newThread.updated_at),
			};

			setThreads((prev) => [threadObj, ...prev]);
			setActiveThreadId(threadObj.id);
			setMessages([]);
			
			if (!isInitial) {
				setSidebarOpen(false);
			}
			
			return threadObj.id;
		} catch (err) {
			console.error("Error creating thread:", err);
			
			// Fallback to local-only thread if database operation fails
			const fallbackThread: Thread = {
				id: Date.now().toString(),
				title: "New Chat",
				lastMessage: "Start a new conversation...",
				timestamp: new Date(),
			};
			
			setThreads((prev) => [fallbackThread, ...prev]);
			setActiveThreadId(fallbackThread.id);
			setMessages([]);
			
			if (!isInitial) {
				setSidebarOpen(false);
			}
			
			return fallbackThread.id;
		}
	};

	const handleSignOut = async () => {
		await signOut();
		router.push("/");
	};

	if (isLoading || threadsLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null; // Will be redirected by useEffect
	}

	return (
		<div className="flex h-screen bg-background">
			{/* Sidebar */}
			<div
				className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
			>
				<div className="flex flex-col h-full">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b">
						<h1 className="text-lg font-semibold">Chats</h1>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSidebarOpen(false)}
							className="lg:hidden"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* New Chat Button */}
					<div className="p-4">
						<Button
							onClick={() => createNewThread()}
							className="w-full justify-start"
							variant="outline"
						>
							<Plus className="mr-2 h-4 w-4" />
							New Chat
						</Button>
					</div>

					{/* Threads List */}
					<div className="flex-1 overflow-y-auto px-2">
						{threadsError ? (
							<div className="text-center p-4 text-red-500 text-sm">
								{threadsError}
							</div>
						) : threads.length === 0 ? (
							<div className="text-center p-4 text-muted-foreground text-sm">
								No chat threads found.
							</div>
						) : (
							threads.map((thread) => (
								<div
									key={thread.id}
									className={`mb-1 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
										activeThreadId === thread.id ? "bg-muted" : ""
									}`}
									onClick={() => {
										setActiveThreadId(thread.id);
										setSidebarOpen(false);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setActiveThreadId(thread.id);
											setSidebarOpen(false);
										}
									}}
									tabIndex={0}
									role="button"
								>
									<div className="flex items-center gap-2">
										<MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{thread.title}
											</p>
										</div>
									</div>
								</div>
							))
						)}
					</div>

					{/* User Profile */}
					<div className="border-t p-4">
						<div className="flex items-center gap-3 mb-3">
							<Avatar className="h-8 w-8">
								<AvatarFallback>
									<User className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{user?.displayName || user?.email?.split("@")[0] || "User"}
								</p>
								<p className="text-xs text-muted-foreground truncate">
									{user?.email}
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Button asChild variant="outline" size="sm" className="flex-1">
								<Link href="/settings">
									<Settings className="mr-2 h-3 w-3" />
									Settings
								</Link>
							</Button>
							<Button variant="outline" size="sm" onClick={handleSignOut}>
								<LogOut className="h-3 w-3" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b bg-card">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSidebarOpen(true)}
							className="lg:hidden"
						>
							<Menu className="h-4 w-4" />
						</Button>
						<h2 className="text-lg font-semibold">
							{threads.find((t) => t.id === activeThreadId)?.title || "Chat"}
						</h2>
					</div>
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{messages.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center space-y-3">
								<MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
								<div>
									<h3 className="font-semibold">Start a conversation</h3>
									<p className="text-sm text-muted-foreground">
										Send a message to begin chatting
									</p>
								</div>
							</div>
						</div>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								className={`flex ${message.isUser ? "justify-end" : "justify-start"} mb-4`}
							>
								<div
									className={`flex items-end gap-2 max-w-[75%] sm:max-w-[60%] ${
										message.isUser ? "flex-row-reverse" : "flex-row"
									}`}
								>
									<Avatar className="h-7 w-7 flex-shrink-0">
										<AvatarFallback className="text-xs">
											{message.isUser ? (
												<User className="h-3 w-3" />
											) : (
												<MessageSquare className="h-3 w-3" />
											)}
										</AvatarFallback>
									</Avatar>
									<div
										className={`rounded-2xl px-3 py-2 ${
											message.isUser
												? "bg-primary text-primary-foreground rounded-br-md"
												: "bg-muted rounded-bl-md"
										}`}
									>
										<p className="text-sm whitespace-pre-wrap break-words">
											{message.content}
										</p>
									</div>
								</div>
							</div>
						))
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Area */}
				<div className="border-t p-4 bg-card">
					<div className="flex gap-3">
						<Input
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Type your message..."
							className="flex-1"
						/>
						<Button
							onClick={handleSendMessage}
							disabled={!inputValue.trim() || isSending}
							size="sm"
						>
							{isSending ? (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			</div>

			{/* Overlay for mobile sidebar */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
					onClick={() => setSidebarOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setSidebarOpen(false);
						}
					}}
					role="button"
					tabIndex={0}
					aria-label="Close sidebar"
				/>
			)}
		</div>
	);
}
