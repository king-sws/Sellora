// in your Navbar or dropdown component
"use client"

import { signOut } from "next-auth/react"


function handleSignOut() {
  signOut({ callbackUrl: "/" }) // redirect to home
}
export function SignOut() {
  return (
    <button onClick={handleSignOut} className="btn-ghost btn">
      Sign Out
    </button>
  )
}