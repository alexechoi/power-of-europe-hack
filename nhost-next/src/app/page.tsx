"use client";

import Link from "next/link";
import { useAuthenticationStatus } from "@nhost/nextjs";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
	const { isAuthenticated, isLoading } = useAuthenticationStatus();

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-16">
				<div className="text-center space-y-8">
					<div className="space-y-4">
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
							Welcome to <span className="text-primary">ChatGPT Clone</span>
						</h1>
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-7">
							A modern ChatGPT-style interface built with Next.js, Nhost.io, and
							shadcn/ui. Experience seamless conversations with a beautiful,
							responsive design.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						{!isLoading &&
							(isAuthenticated ? (
								<Button asChild size="lg">
									<Link href="/chat">Start Chatting</Link>
								</Button>
							) : (
								<>
									<Button asChild size="lg">
										<Link href="/auth">Get Started</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link
											href="https://docs.nhost.io"
											target="_blank"
											rel="noopener noreferrer"
										>
											Documentation
										</Link>
									</Button>
								</>
							))}
					</div>
				</div>

				{/* Features Section */}
				<div className="mt-24 space-y-16">
					<div className="text-center space-y-4">
						<h2 className="text-3xl font-bold tracking-tight">
							Powered by Modern Technologies
						</h2>
						<div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
							{[
								"Next.js 15",
								"React 19",
								"TypeScript",
								"Tailwind CSS",
								"Nhost.io",
								"GraphQL",
								"PostgreSQL",
							].map((tech) => (
								<Badge key={tech} variant="secondary">
									{tech}
								</Badge>
							))}
						</div>
					</div>

					{/* Features Grid */}
					<div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
						<Card className="text-center">
							<CardHeader className="pb-4">
								<div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
									<div className="text-2xl">🔐</div>
								</div>
								<CardTitle className="text-xl">Chat Interface</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Beautiful ChatGPT-style interface with thread management,
									responsive design, and smooth user experience.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="text-center">
							<CardHeader className="pb-4">
								<div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
									<div className="text-2xl">🚀</div>
								</div>
								<CardTitle className="text-xl">Authentication</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Secure user authentication with Nhost, including email/password
									and social login options.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="text-center">
							<CardHeader className="pb-4">
								<div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
									<div className="text-2xl">💾</div>
								</div>
								<CardTitle className="text-xl">Modern UI</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Built with shadcn/ui components and Tailwind CSS for a
									polished, accessible interface.
								</CardDescription>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
