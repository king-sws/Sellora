import { Suspense } from 'react'
import { AdminHeader } from "@/components/admin/header"
import { Sidebar } from "@/components/Sidebar"
import { auth } from '@/auth'
import { redirect } from 'next/navigation'


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Check authentication
  const session = await auth()
  
  // Redirect to sign-in if not logged in
  if (!session?.user) {
    redirect('/auth/sign-in?callbackUrl=/dashboard')
  }

  // Redirect to home if not admin
  if (session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-1 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-3">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                  <p className="text-slate-600">Loading...</p>
                </div>
              </div>
            }>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}