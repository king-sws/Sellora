// app/auth/sign-in/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In | Sellora',
  description: 'Sign in to your Sellora account',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SignInPage() {
  const session = await auth()
  
  // ✅ Redirect based on role
  if (session?.user) {
    redirect(session.user.role === 'ADMIN' ? '/dashboard' : '/')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          Sign in to access your orders and continue shopping.{` `}
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