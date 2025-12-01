// app/auth/sign-up/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Create Account | Sellora',
  description: 'Create your Sellora account and get started in minutes',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SignUpPage() {
  const session = await auth()
  
  // ✅ Redirect based on role
  if (session?.user) {
    redirect(session.user.role === 'ADMIN' ? '/dashboard' : '/')
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Create your Sellora account to shop faster and track all your orders.{' '}
          <span className="hidden sm:inline">
            Fast, secure, and completely free.
          </span>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  )
}