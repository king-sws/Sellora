// app/auth/error/page.tsx
import { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Authentication Error | Acme',
  description: 'An error occurred during authentication',
  robots: {
    index: false,
    follow: false,
  },
}

// Error messages mapping
const errorMessages: Record<string, { title: string; description: string; action?: string }> = {
  Configuration: {
    title: 'Server Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in with this account.',
    action: 'Try signing in with a different account or contact your administrator.',
  },
  Verification: {
    title: 'Email Verification Required',
    description: 'Please check your email and click the verification link before signing in.',
    action: 'Check your email inbox and spam folder.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred during authentication.',
    action: 'Please try again or contact support if the problem persists.',
  },
  OAuthSignin: {
    title: 'OAuth Sign-in Error',
    description: 'There was an error signing in with your OAuth provider.',
    action: 'Please try again or use a different sign-in method.',
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    description: 'There was an error processing the OAuth callback.',
    action: 'Please try signing in again.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Error',
    description: 'Could not create an account with the OAuth provider.',
    action: 'Try signing up with email instead.',
  },
  EmailCreateAccount: {
    title: 'Email Account Error',
    description: 'Could not create an account with this email address.',
    action: 'Please check your email address and try again.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'There was an error in the authentication callback.',
    action: 'Please try signing in again.',
  },
  CredentialsSignin: {
    title: 'Invalid Credentials',
    description: 'The email or password you entered is incorrect.',
    action: 'Please check your credentials and try again.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'You must be signed in to view this page.',
    action: 'Please sign in to continue.',
  },
}

function ErrorContent({ searchParams }: { searchParams: { error?: string } }) {
  const errorType = searchParams.error || 'Default'
  const errorInfo = errorMessages[errorType] || errorMessages.Default

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
      </div>

      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-700">
          <div className="font-medium mb-1">{errorInfo.title}</div>
          <div className="text-sm">{errorInfo.description}</div>
          {errorInfo.action && (
            <div className="text-sm mt-2 text-red-600">{errorInfo.action}</div>
          )}
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Button asChild className="w-full h-11">
          <Link href="/auth/sign-in">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Link>
        </Button>

        <Button variant="outline" asChild className="w-full h-11">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-600">
          Still having issues?{' '}
          <Link
            href="/support"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <AuthLayout
      title="Authentication Error"
      subtitle="Something went wrong during the authentication process"
    >
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 bg-slate-200 rounded animate-pulse" />
          </div>
        }
      >
        <ErrorContent searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  )
}