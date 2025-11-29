// components/auth/ForgotPasswordForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, Check } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('')
    
    startTransition(async () => {
      try {
        // In a real app, you'd call your forgot password API here
        // For now, we'll simulate a successful response
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsSuccess(true)
      } catch (error) {
        setError('Failed to send reset email. Please try again.')
      }
    })
  }

  const isLoading = isPending || isSubmitting

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <Mail className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <div className="font-medium mb-1">Reset link sent</div>
            <div className="text-sm">
              We've sent a password reset link to <strong>{getValues('email')}</strong>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>What happens next?</strong></p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the reset link within 1 hour</li>
              <li>Create a new password</li>
            </ul>
          </div>

          <Button variant="outline" asChild className="w-full h-11">
            <Link href="/auth/sign-in">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="text-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email address
          </Label>
          <div className="relative">
            <Input
              {...register('email')}
              id="email"
              type="email"
              placeholder="Enter your email address"
              className="pl-10 h-11"
              disabled={isLoading}
            />
            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
          <p className="text-xs text-slate-500">
            We'll send you a link to reset your password
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-slate-900 hover:bg-slate-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending reset link...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/auth/sign-in"
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}