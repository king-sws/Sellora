"use client"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"

export default function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="flex items-center justify-between p-4 shadow">
      <Link href="/" className="font-bold text-xl">E-Com</Link>
      <div className="flex items-center gap-4">
        <Link href="/products">Products</Link>
        <Link href="/cart">Cart</Link>

        {session?.user ? (
          <>
            <span>{session.user.name}</span>
            <button onClick={() => signOut()} className="bg-red-500 text-white px-3 py-1 rounded">
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/sign-in" className="bg-blue-500 text-white px-3 py-1 rounded">Sign In</Link>
            <Link href="/auth/sign-up" className="bg-green-500 text-white px-3 py-1 rounded">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
