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
							<span className="text-primary">Power of Europe</span>
						</h1>
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-7">
							Discover European tech alternatives for your projects. Our tool and Chrome extension 
							help developers build with privacy-focused, GDPR-compliant European technologies.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						{!isLoading &&
							(isAuthenticated ? (
								<Button asChild size="lg">
									<Link href="/dashboard">Open Dashboard</Link>
								</Button>
							) : (
								<>
									<Button asChild size="lg">
										<Link href="/auth">Get Started</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link href="/extension" target="_blank" rel="noopener noreferrer">
											Install Extension
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
							European Tech Sovereignty
						</h2>
						<div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
							{[
								"GDPR Compliant",
								"Privacy-First",
								"Data Sovereignty",
								"European Hosting",
								"Open Source",
								"Ethical AI",
								"Sustainable Tech",
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
									<div className="text-2xl">🔍</div>
								</div>
								<CardTitle className="text-xl">Chrome Extension</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Our browser extension automatically suggests European alternatives 
									when you browse non-European tech services and APIs.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="text-center">
							<CardHeader className="pb-4">
								<div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
									<div className="text-2xl">🇪🇺</div>
								</div>
								<CardTitle className="text-xl">Tech Database</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Access our comprehensive database of European tech alternatives 
									across categories like cloud services, AI, analytics, and more.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="text-center">
							<CardHeader className="pb-4">
								<div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
									<div className="text-2xl">📊</div>
								</div>
								<CardTitle className="text-xl">Compliance Checker</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Analyze your tech stack for GDPR compliance and data sovereignty issues, 
									with actionable recommendations for European alternatives.
								</CardDescription>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
