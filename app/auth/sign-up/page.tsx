// app/auth/sign-up/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Create Account | Acme',
  description: 'Create your Acme account and get started in minutes',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SignUpPage() {
  // Redirect if already authenticated
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Join thousands of teams already using Acme to streamline their workflow.{' '}
          <span className="hidden sm:inline">
            Free to start, no credit card required.
          </span>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  )
}