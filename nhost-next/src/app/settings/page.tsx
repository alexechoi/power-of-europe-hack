"use client";

import { useEffect, useState } from "react";
import {
	useAuthenticationStatus,
	useSignOut,
	useUserData,
} from "@nhost/nextjs";
import { useRouter } from "next/navigation";
import { nhost } from "../../lib/nhost";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	User,
	Mail,
	Shield,
	Calendar,
	Database,
	Activity,
	TrendingUp,
	Users,
	Home,
	LogOut,
	Loader2,
} from "lucide-react";

interface LoginAttempt {
	id: string;
	user_id: string;
	success: boolean;
	timestamp: string;
	ip_address?: string;
	user_agent?: string;
}

const getLoginAttempts = `
  query GetLoginAttempts($user_id: uuid!) {
    login_attempts(where: {user_id: {_eq: $user_id}}, order_by: {timestamp: desc}, limit: 10) {
      id
      user_id
      success
      timestamp
      ip_address
      user_agent
    }
  }
`;

export default function Dashboard() {
	const { isAuthenticated, isLoading } = useAuthenticationStatus();
	const { signOut } = useSignOut();
	const user = useUserData();
	const router = useRouter();
	const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
	const [attemptsLoading, setAttemptsLoading] = useState(true);
	const [attemptsError, setAttemptsError] = useState<string | null>(null);

	// Redirect if not authenticated
	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.push("/auth");
		}
	}, [isAuthenticated, isLoading, router]);

	// Fetch login attempts when component mounts
	useEffect(() => {
		async function fetchLoginAttempts() {
			if (!user?.id) return;

			try {
				setAttemptsLoading(true);
				const { data, error } = await nhost.graphql.request(getLoginAttempts, {
					user_id: user.id,
				});

				if (error) {
					console.error("GraphQL Error:", error);
					setAttemptsError(
						"Failed to fetch login attempts. Make sure GraphQL permissions are set up correctly.",
					);
				} else {
					setLoginAttempts(data?.login_attempts || []);
				}
			} catch (err) {
				console.error("Fetch Error:", err);
				setAttemptsError("Failed to connect to the database.");
			} finally {
				setAttemptsLoading(false);
			}
		}

		if (isAuthenticated && user?.id) {
			fetchLoginAttempts();
		}
	}, [isAuthenticated, user?.id]);

	const handleSignOut = async () => {
		await signOut();
		router.push("/");
	};

	if (isLoading) {
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
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8 space-y-8">
				{/* Header */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div className="flex items-center gap-4">
						<Avatar className="h-12 w-12">
							<AvatarFallback>
								<User className="h-6 w-6" />
							</AvatarFallback>
						</Avatar>
						<div>
							<h1 className="text-3xl font-bold tracking-tight">
								Welcome back,{" "}
								{user?.displayName || user?.email?.split("@")[0] || "User"}!
							</h1>
							<p className="text-muted-foreground">
								{new Date().toLocaleDateString("en-US", {
									weekday: "long",
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</p>
						</div>
					</div>
					<div className="flex gap-3">
						<Button asChild variant="outline" size="sm">
							<Link href="/">
								<Home className="mr-2 h-4 w-4" />
								Home
							</Link>
						</Button>
						<Button variant="destructive" size="sm" onClick={handleSignOut}>
							<LogOut className="mr-2 h-4 w-4" />
							Sign Out
						</Button>
					</div>
				</div>

				{/* Stats Overview */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										Account Status
									</p>
									<p className="text-2xl font-bold">
										{user?.emailVerified ? "Verified" : "Pending"}
									</p>
								</div>
								<Shield
									className={`h-8 w-8 ${user?.emailVerified ? "text-green-600" : "text-yellow-600"}`}
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										Login Attempts
									</p>
									<p className="text-2xl font-bold">{loginAttempts.length}</p>
								</div>
								<Database className="h-8 w-8 text-blue-600" />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										API Status
									</p>
									<p className="text-2xl font-bold">
										{attemptsError
											? "Error"
											: attemptsLoading
												? "Loading"
												: "Active"}
									</p>
								</div>
								<Activity
									className={`h-8 w-8 ${attemptsError ? "text-red-600" : attemptsLoading ? "text-yellow-600" : "text-green-600"}`}
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										Session
									</p>
									<p className="text-2xl font-bold">Active</p>
								</div>
								<Users className="h-8 w-8 text-purple-600" />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* User Profile */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-5 w-5" />
							Profile Information
						</CardTitle>
						<CardDescription>
							Your account details and verification status
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											Email Address
										</p>
										<p className="font-medium">{user?.email}</p>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<User className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											Display Name
										</p>
										<p className="font-medium">
											{user?.displayName || "Not set"}
										</p>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<Shield className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											Verification Status
										</p>
										<div className="flex items-center gap-2">
											{user?.emailVerified ? (
												<Badge
													variant="default"
													className="bg-green-100 text-green-800 border-green-200"
												>
													<Shield className="h-3 w-3 mr-1" />
													Verified
												</Badge>
											) : (
												<Badge
													variant="secondary"
													className="bg-yellow-100 text-yellow-800 border-yellow-200"
												>
													<Calendar className="h-3 w-3 mr-1" />
													Pending
												</Badge>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<Database className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											User ID
										</p>
										<p className="font-mono text-sm text-muted-foreground">
											{user?.id}
										</p>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Movies Section */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Activity className="h-5 w-5" />
									Login History
								</CardTitle>
								<CardDescription>
									Your recent login attempts and activity
								</CardDescription>
							</div>
							{loginAttempts.length > 0 && (
								<Badge variant="outline" className="flex items-center gap-1">
									<TrendingUp className="h-3 w-3" />
									{loginAttempts.length} attempts
								</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{attemptsLoading ? (
							<div className="flex items-center justify-center py-12">
								<div className="text-center space-y-3">
									<Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
									<p className="text-muted-foreground">
										Loading login attempts from GraphQL API...
									</p>
								</div>
							</div>
						) : attemptsError ? (
							<Alert variant="destructive">
								<AlertDescription>{attemptsError}</AlertDescription>
								<p className="text-sm mt-2">
									Make sure GraphQL permissions are set up for the
									login_attempts table.
								</p>
							</Alert>
						) : loginAttempts.length > 0 ? (
							<div className="space-y-4">
								<div className="grid gap-4">
									{loginAttempts.map((attempt) => (
										<Card
											key={attempt.id}
											className="transition-colors hover:bg-muted/50"
										>
											<CardContent className="p-4">
												<div className="flex items-center justify-between">
													<div className="space-y-1">
														<div className="flex items-center gap-2">
															<Badge
																variant={
																	attempt.success ? "default" : "destructive"
																}
																className="text-xs"
															>
																{attempt.success ? "Success" : "Failed"}
															</Badge>
															<span className="font-medium">
																{new Date(attempt.timestamp).toLocaleString()}
															</span>
														</div>
														{attempt.user_agent && (
															<p className="text-sm text-muted-foreground truncate max-w-md">
																{attempt.user_agent}
															</p>
														)}
													</div>
													<div className="flex items-center gap-2">
														{attempt.ip_address && (
															<Badge variant="outline" className="text-xs">
																{attempt.ip_address}
															</Badge>
														)}
														<Activity
															className={`h-4 w-4 ${attempt.success ? "text-green-600" : "text-red-600"}`}
														/>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						) : (
							<div className="text-center py-12">
								<div className="space-y-3">
									<Activity className="h-12 w-12 mx-auto text-muted-foreground" />
									<div>
										<h3 className="font-semibold">No login attempts found</h3>
										<p className="text-sm text-muted-foreground">
											Your login attempts will appear here once you sign in.
										</p>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
