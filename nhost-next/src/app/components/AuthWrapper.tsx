"use client";

import { useAuthenticationStatus, useUserData } from "@nhost/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface AuthWrapperProps {
	children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
	const { isAuthenticated, isLoading } = useAuthenticationStatus();
	const user = useUserData();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!isLoading) {
			// Redirect to auth if not authenticated and not on public pages
			if (
				!isAuthenticated &&
				pathname !== "/auth" &&
				pathname !== "/" &&
				!pathname.startsWith("/auth/")
			) {
				router.push("/auth");
			}

			// Handle authenticated users
			if (isAuthenticated && user) {
				// If on auth page and verified, go to chat
				if (pathname === "/auth" && user.emailVerified) {
					router.push("/chat");
				}
				// If on auth page and not verified, go to verify-email
				else if (pathname === "/auth" && !user.emailVerified) {
					router.push("/auth/verify-email");
				}
				// If trying to access chat but not verified, go to verify-email
				else if (pathname === "/chat" && !user.emailVerified) {
					router.push("/auth/verify-email");
				}
				// If on verify-email page but already verified, go to dashboard
				else if (pathname === "/auth/verify-email" && user.emailVerified) {
					router.push("/chat");
				}
			}
		}
	}, [isAuthenticated, user, isLoading, pathname, router]);

	// Show loading while checking authentication status
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	return <>{children}</>;
}
