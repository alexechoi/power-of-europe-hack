"use client";

import { useState, useEffect } from "react";
import {
	useSignUpEmailPassword,
	useSignInEmailPassword,
	useAuthenticationStatus,
	useUserData,
} from "@nhost/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nhost } from "../../lib/nhost";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [verificationEmailSent, setVerificationEmailSent] = useState(false);

	const {
		signUpEmailPassword,
		isLoading: signUpLoading,
		error: signUpError,
	} = useSignUpEmailPassword();
	const {
		signInEmailPassword,
		isLoading: signInLoading,
		error: signInError,
	} = useSignInEmailPassword();
	const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
	const user = useUserData();
	const router = useRouter();

	// Handle authentication and email verification redirects
	useEffect(() => {
		if (!authLoading && isAuthenticated && user) {
			if (user.emailVerified) {
				router.push("/chat");
			} else {
				router.push("/auth/verify-email");
			}
		}
	}, [isAuthenticated, user, authLoading, router]);

	// Show loading while checking auth status
	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	// Don't render if authenticated (will be redirected)
	if (isAuthenticated) {
		return null;
	}

	// Helper function to record login attempt
	const recordLoginAttempt = async (
		userId: string | null,
		success: boolean,
	) => {
		if (!userId) return; // Can't record without user ID

		try {
			// Get client info
			const userAgent = navigator.userAgent;
			// Note: IP address will be null since we can't get it client-side
			// In production, you might want to get this from a server endpoint

			const mutation = `
				mutation InsertLoginAttempt($user_id: uuid!, $success: Boolean!, $user_agent: String) {
					insert_login_attempts_one(object: {
						user_id: $user_id,
						success: $success,
						user_agent: $user_agent
					}) {
						id
					}
				}
			`;

			await nhost.graphql.request(mutation, {
				user_id: userId,
				success: success,
				user_agent: userAgent,
			});
		} catch (error) {
			console.warn("Failed to record login attempt:", error);
			// Don't block the auth flow if logging fails
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isSignUp) {
			const result = await signUpEmailPassword(email, password, {
				displayName,
			});
			if (result.isSuccess) {
				// Explicitly send verification email to ensure it's sent
				try {
					const { error: emailError } = await nhost.auth.sendVerificationEmail({
						email: email,
					});
					if (!emailError) {
						setVerificationEmailSent(true);
					}
				} catch (error) {
					console.warn("Failed to send verification email:", error);
					// Don't block the flow - user can resend from verification page
				}
				// User will be redirected to verify-email page by useEffect above
			}
		} else {
			// Sign in attempt
			const result = await signInEmailPassword(email, password);

			// Record login attempt (both success and failure)
			if (result.isSuccess && result.user) {
				// Record successful login
				await recordLoginAttempt(result.user.id, true);
				// User will be redirected based on email verification status by useEffect above
			} else if (result.isError) {
				// For failed attempts, we need to try to get the user ID
				// This is tricky since failed login doesn't return user info
				// We could potentially look up user by email, but that might be a security risk
				// For now, we'll only log successful attempts
				console.log("Login failed:", result.error?.message);
			}
		}
	};

	const isLoading = signUpLoading || signInLoading;
	const error = signUpError || signInError;

	return (
		<div className="min-h-screen bg-black flex items-center justify-center px-4">
			<div className="max-w-md w-full">
				<Card>
					<CardHeader className="text-center">
						<CardTitle className="mt-4 text-3xl">
							{isSignUp ? "Create your account" : "Sign in to your account"}
						</CardTitle>
						<CardDescription>
							{isSignUp ? "Get started with your new account" : "Welcome back!"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{isSignUp && (
								<div className="space-y-2">
									<Label htmlFor="displayName">Display Name</Label>
									<Input
										id="displayName"
										type="text"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										placeholder="Enter your display name"
										required
									/>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="email">Email address</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your email"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter your password"
									required
									minLength={6}
								/>
							</div>

							{verificationEmailSent && isSignUp && (
								<Alert>
									<AlertDescription>
										✓ Account created! Verification email sent to {email}
									</AlertDescription>
								</Alert>
							)}

							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error.message}</AlertDescription>
								</Alert>
							)}

							<Button type="submit" disabled={isLoading} className="w-full">
								{isLoading ? (
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
										{isSignUp ? "Creating account..." : "Signing in..."}
									</div>
								) : isSignUp ? (
									"Create account"
								) : (
									"Sign in"
								)}
							</Button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-gray-600 dark:text-gray-400">
								{isSignUp
									? "Already have an account?"
									: "Don't have an account?"}{" "}
								<Button
									type="button"
									variant="link"
									onClick={() => setIsSignUp(!isSignUp)}
									className="p-0 h-auto font-medium"
								>
									{isSignUp ? "Sign in" : "Sign up"}
								</Button>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
