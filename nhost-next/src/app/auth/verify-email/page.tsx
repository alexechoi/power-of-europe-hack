'use client'

import { useState } from 'react'
import { useUserData, useSignOut } from '@nhost/nextjs'
import { nhost } from '../../../lib/nhost'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const user = useUserData()
  const { signOut } = useSignOut()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const handleResendVerification = async () => {
    if (!user?.email) return

    try {
      setIsResending(true)
      setResendError(null)
      
      const { error } = await nhost.auth.sendVerificationEmail({
        email: user.email,
      })

      if (error) {
        setResendError(error.message)
      } else {
        setResendSuccess(true)
      }
    } catch {
      setResendError('Failed to send verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">Verify Your Email</CardTitle>
              <CardDescription className="text-base">
                We&apos;ve sent a verification email to
                <br />
                <span className="font-medium text-foreground">{user.email}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Check your email
              </AlertDescription>
              <AlertDescription className="mt-2 text-sm text-muted-foreground">
                Click the verification link in the email we sent you to activate your account. 
                Don&apos;t forget to check your spam folder!
              </AlertDescription>
            </Alert>

            {resendSuccess && (
              <Alert>
                <AlertDescription>
                  ✓ Verification email sent successfully! Check your inbox.
                </AlertDescription>
              </Alert>
            )}

            {resendError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resendError}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending || resendSuccess}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  'Email Sent!'
                ) : (
                  'Resend Verification Email'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
