import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { attachSession, clearSession, createSession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { createDemoWorkspace } from "@/lib/seed";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "logout") {
      return clearSession(NextResponse.json({ ok: true }));
    }
    if (body.action === "demo") {
      const user = await createDemoWorkspace();
      return attachSession(NextResponse.json({ user }), await createSession(user.id));
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (body.action === "login") {
      const [account] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!account?.passwordHash || !(await verifyPassword(password, account.passwordHash))) {
        return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
      }
      const user = { id: account.id, name: account.name, email: account.email, isDemo: account.isDemo };
      return attachSession(NextResponse.json({ user }), await createSession(user.id));
    }
    if (body.action === "register") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Please enter your name (2-80 characters)." }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Your password must be at least 8 characters." }, { status: 400 });
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
      const passwordHash = await hashPassword(password);
      const current = await getSessionUser();
      // Claiming a demo workspace keeps all the student's existing tasks and courses.
      const [account] = current?.isDemo
        ? await db.update(users).set({ name, email, passwordHash, isDemo: false }).where(eq(users.id, current.id)).returning()
        : await db.insert(users).values({ name, email, passwordHash, isDemo: false }).returning();
      const user = { id: account.id, name: account.name, email: account.email, isDemo: false };
      return attachSession(NextResponse.json({ user }), await createSession(user.id));
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Authentication failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
