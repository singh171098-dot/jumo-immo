import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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
  session:   { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { id: string; name: string; email: string; role: string }).role;
        token.name = user.name ?? token.name;
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
