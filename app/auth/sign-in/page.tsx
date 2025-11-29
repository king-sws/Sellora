// app/auth/sign-in/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In | Acme',
  description: 'Sign in to your Acme account',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SignInPage() {
  // Redirect if already authenticated
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          Sign in to your account to continue where you left off.{' '}
          <span className="hidden sm:inline">
            Secure, fast, and reliable.
          </span>
        </>
      }
    >
      <SignInForm />
    </AuthLayout>
  )
}