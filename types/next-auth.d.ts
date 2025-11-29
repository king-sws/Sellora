import NextAuth, { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      createdAt: Date
      phone?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: Role
    phone?: string
  }

  interface JWT {
    id: string
    role: Role
    phone?: string
  }
}
