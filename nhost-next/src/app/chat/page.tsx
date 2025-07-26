"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
	useAuthenticationStatus,
	useUserData,
	useSignOut,
} from "@nhost/nextjs";
import { useRouter } from "next/navigation";
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

// Interface for thread data from GraphQL
interface ThreadData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatInterface() {
	const { isAuthenticated, isLoading } = useAuthenticationStatus();
	const user = useUserData();
	const { signOut } = useSignOut();
	const router = useRouter();
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

	const handleSendMessage = async () => {
		if (!inputValue.trim() || isSending) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			content: inputValue,
			isUser: true,
			timestamp: new Date(),
		};

		// Add user message immediately
		setMessages((prev) => [...prev, userMessage]);
		const currentInput = inputValue;
		setInputValue("");
		setIsSending(true);

		try {
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

			const botMessage: Message = {
				id: (Date.now() + 1).toString(),
				content: aiResponse,
				isUser: false,
				timestamp: new Date(),
			};

			// Add bot response
			setMessages((prev) => [...prev, botMessage]);

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
						? { ...thread, lastMessage: currentInput, timestamp: new Date() }
						: thread,
				),
			);
		} catch (error) {
			console.error("Error getting AI response:", error);

			// Add error message
			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				content:
					"Sorry, I encountered an error while processing your message. Please try again.",
				isUser: false,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSending(false);
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
