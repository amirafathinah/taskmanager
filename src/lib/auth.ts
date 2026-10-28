import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "studyspace_session";
export const SIGNED_OUT_COOKIE = "studyspace_signed_out";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    userId,
    tokenHash: tokenDigest(token),
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
  });
  return token;
}

export function attachSession(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  response.cookies.set(SIGNED_OUT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    isDemo: users.isDemo,
  }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(
    eq(sessions.tokenHash, tokenDigest(token)),
    gt(sessions.expiresAt, new Date()),
  )).limit(1);
  return user ?? null;
}

export async function clearSession(response: NextResponse) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenDigest(token)));
  response.cookies.set(SESSION_COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
  response.cookies.set(SIGNED_OUT_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: SESSION_SECONDS });
  return response;
}
