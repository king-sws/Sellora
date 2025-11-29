// app/auth/verify-request/page.tsx (Bonus: Email verification page)
import { Metadata } from 'next'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Check Your Email | Acme',
  description: 'Please check your email for a verification link',
  robots: {
    index: false,
    follow: false,
  },
}

export default function VerifyRequestPage() {
  return (
    <AuthLayout
      title="Check your email"
      subtitle="We've sent you a secure sign-in link"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <div className="font-medium mb-1">Email sent successfully</div>
            <div className="text-sm">
              Click the link in your email to sign in. The link will expire in 24 hours.
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check your spam or junk folder</li>
              <li>Make sure the email address is correct</li>
              <li>Try signing in again to resend</li>
            </ul>
          </div>

          <Button variant="outline" asChild className="w-full h-11">
            <Link href="/auth/sign-in">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-600">
            Need help?{' '}
            <Link
              href="/support"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}