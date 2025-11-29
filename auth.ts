// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/db/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { Role } from "./lib/generated/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"

// Validation schema for credentials
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  
  // Session strategy
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),

    // GitHub OAuth
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // Email/Password credentials
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          // Validate input
          const { email, password } = loginSchema.parse(credentials)

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) {
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password)
          if (!isPasswordValid) {
            return null
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            phone: user.phone,
            role: user.role,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],

  // Custom pages
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },

  // Callbacks for customization
  callbacks: {
    // JWT callback - CRITICAL FIX
    jwt: async ({ token, user, account, trigger }) => {
      // Initial sign in - get data from user object
      if (user) {
        token.role = user.role
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.phone = user.phone
        token.picture = user.image
      }

      // For OAuth providers, fetch role from database on first sign-in
      if (account?.provider && account.provider !== "credentials" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { 
            id: true, 
            role: true, 
            email: true, 
            name: true, 
            image: true,
            phone: true
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.name = dbUser.name
          token.phone = dbUser.phone
          token.picture = dbUser.image
        }
      }

      // Refresh token data periodically or on update
      if (trigger === "update" || (token.email && !token.lastRefresh)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { 
            id: true, 
            role: true, 
            email: true, 
            name: true, 
            image: true,
            phone: true
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.name = dbUser.name
          token.phone = dbUser.phone
          token.picture = dbUser.image
          token.lastRefresh = Date.now()
        }
      }

      return token
    },

    // Session callback
    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.email = token.email!
        session.user.name = token.name
        session.user.phone = token.phone as string | undefined
        session.user.image = token.picture
      }

      return session
    },

    // Sign in callback - CRITICAL FIX
    signIn: async ({ user, account, profile }) => {
      try {
        // Always allow OAuth sign-ins
        if (account?.provider !== "credentials") {
          // For OAuth, ensure user exists in database
          if (user?.email) {
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email },
            })

            // If user doesn't exist, create them
            if (!existingUser) {
              const normalizedImage =
                typeof user.image === "string"
                  ? user.image
                  : typeof profile?.image === "string"
                  ? profile.image
                  : null

              const normalizedName =
                typeof user.name === "string"
                  ? user.name
                  : typeof profile?.name === "string"
                  ? profile.name
                  : null

              await prisma.user.create({
                data: {
                  email: user.email,
                  name: normalizedName || null,
                  image: normalizedImage || null,
                  role: "USER",
                  emailVerified: new Date(),
                }
              })
            }
          }
          return true
        }

        // For credentials, user must exist (handled in authorize)
        return !!user
      } catch (error) {
        console.error("Sign-in callback error:", error)
        // Allow sign-in even if database operations fail
        return true
      }
    },

    // Redirect callback - CRITICAL FIX
    redirect: async ({ url, baseUrl }) => {
      // Handle relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      
      // Handle same-origin URLs
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          return url
        }
      } catch {
        // Invalid URL, use default
      }
      
      // Default redirect to home page (not dashboard)
      return baseUrl
    },
  },

  // Events for logging and analytics
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      console.log(`✅ User ${user.email} signed in with ${account?.provider}`)
      
      if (isNewUser) {
        console.log(`🎉 New user registered: ${user.email}`)
      }
    },

    createUser: async ({ user }) => {
      console.log(`👤 New user created: ${user.email}`)
    },

    signOut: async (message) => {
      // The event message can be one of { session: ... } or { token: ... },
      // so guard access to token before reading its properties.
      let token = undefined
      if (message && "token" in message) {
        token = (message as { token?: { email?: string } | null }).token
      }
      console.log(`👋 User signed out: ${token?.email}`)
    },
  },

  // Security options
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // Debug in development
  debug: process.env.NODE_ENV === "development",

  // Custom error handling
  logger: {
    error: (error) => {
      // Log the Error object directly; metadata (if any) may be attached to the error.
      console.error(`❌ Auth error:`, error)
    },
    warn: (code) => {
      console.warn(`⚠️ Auth warning [${code}]`)
    },
    debug: (code, metadata) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(`🔍 Auth debug [${code}]:`, metadata)
      }
    },
  },

  // Ensure errors don't crash the app
  trustHost: true,
})