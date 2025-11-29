// app/(store)/layout.tsx
import { StoreFooter } from '@/components/store/footer'
import { StoreHeader } from '@/components/store/header'
import { auth } from '@/auth' // Import your auth function

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth() // Fetch session on server
  
  return (
    <>
      <StoreHeader session={session} />
      <main>{children}</main>
      <StoreFooter />
    </>
  )
}