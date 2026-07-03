import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Refuse the sign-in outright for banned accounts — no NextAuth session or
    // idToken is ever created for them, so the app never gets a chance to
    // exchange it for a backend JWT. The backend's own /api/auth/google check
    // remains as defense-in-depth (e.g. this lookup fails open on error).
    async signIn({ profile }) {
      const googleId = (profile as { sub?: string } | undefined)?.sub
      if (!googleId) return true
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/banned?googleId=${encodeURIComponent(googleId)}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const data = await res.json()
          if (data.banned) return '/?error=banned'
        }
      } catch {
        // Backend unreachable — fail open; the token exchange still enforces the ban.
      }
      return true
    },
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.idToken = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      // Expose the raw Google ID token to the client so it can send it to the Go backend
      ;(session as any).idToken = token.idToken
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
