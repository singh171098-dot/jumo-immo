import NextAuth            from "next-auth";
import Google             from "next-auth/providers/google";
import Credentials        from "next-auth/providers/credentials";
import bcrypt             from "bcryptjs";
import { randomUUID }     from "crypto";
import { prisma }         from "@/lib/prisma";

/* ── Dev-only diagnostic: confirm Google credentials are loaded ─────────── */
if (process.env.NODE_ENV === "development") {
  const hasId     = !!process.env.GOOGLE_CLIENT_ID;
  const hasSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  if (!hasId || !hasSecret) {
    console.warn(
      "[auth] Google OAuth credentials missing:\n" +
      `  GOOGLE_CLIENT_ID     : ${hasId     ? "present" : "⚠ MISSING"}\n` +
      `  GOOGLE_CLIENT_SECRET : ${hasSecret ? "present" : "⚠ MISSING"}`,
    );
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [

    /* ── Google OAuth ──────────────────────────────────────────────────── */
    // Auth.js v5 bare-provider shorthand auto-discovers AUTH_GOOGLE_ID /
    // AUTH_GOOGLE_SECRET.  We use GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
    // instead, so we must pass them explicitly.
    // Redirect URI: {origin}/api/auth/callback/google
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    /* ── Email / Password ──────────────────────────────────────────────── */
    Credentials({
      credentials: {
        email:    { label: "Email",        type: "email"    },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where:  { email: String(credentials.email).toLowerCase().trim() },
          select: { id: true, name: true, email: true, hashedPassword: true, role: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          String(credentials.password),
          user.hashedPassword,
        );
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    /* ── JWT ─────────────────────────────────────────────────────────────
       Fires once on sign-in (user + account present), then on every
       session refresh (token only).  Google users are looked up / created
       in our DB here so session.user.id always refers to our Prisma ID.
    ───────────────────────────────────────────────────────────────────── */
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          const email = user.email?.toLowerCase().trim();

          if (email) {
            let dbUser = await prisma.user.findUnique({
              where:  { email },
              select: { id: true, role: true, name: true },
            });

            if (!dbUser) {
              // First Google sign-in — create account with an unusable password hash
              dbUser = await prisma.user.create({
                data: {
                  email,
                  name:           user.name ?? "Utilisateur",
                  hashedPassword: await bcrypt.hash(randomUUID(), 10),
                  role:           "BUYER",
                },
                select: { id: true, role: true, name: true },
              });
            }

            token.id   = dbUser.id;
            token.role = dbUser.role;
            if (!token.name && dbUser.name) token.name = dbUser.name;
          }
        } else {
          // Credentials provider: user object is our DB record
          token.id   = user.id;
          token.role = (user as { id: string; name: string; email: string; role: string }).role;
          if (user.name) token.name = user.name;
        }
      }
      return token;
    },

    session({ session, token }) {
      session.user.id   = token.id   as string;
      session.user.role = token.role as string;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },

  pages:     { signIn: "/" },
  trustHost: true,
});
