// app/(store)/layout.tsx
import { Suspense } from 'react'
import { StoreFooter } from '@/components/store/footer'
import { StoreHeader } from '@/components/store/header'
import { auth } from '@/auth'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  return (
    <>
      <StoreHeader session={session} />
      <main>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
              <p className="text-slate-600">Loading...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </main>
      <StoreFooter />
    </>
  )
}