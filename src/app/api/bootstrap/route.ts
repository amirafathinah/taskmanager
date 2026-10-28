import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { courses, tasks } from "@/db/schema";
import { attachSession, createSession, getSessionUser, SIGNED_OUT_COOKIE } from "@/lib/auth";
import { createDemoWorkspace } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let user = await getSessionUser();
    let token: string | null = null;
    if (!user && !(await cookies()).get(SIGNED_OUT_COOKIE)) {
      user = await createDemoWorkspace();
      token = await createSession(user.id);
    }
    if (!user) return NextResponse.json({ user: null, courses: [], tasks: [] });
    const [userCourses, userTasks] = await Promise.all([
      db.select().from(courses).where(eq(courses.userId, user.id)).orderBy(asc(courses.createdAt)),
      db.select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(asc(tasks.dueDate), asc(tasks.createdAt)),
    ]);
    const response = NextResponse.json({ user, courses: userCourses, tasks: userTasks });
    return token ? attachSession(response, token) : response;
  } catch (error) {
    console.error("Workspace loading failed", error);
    return NextResponse.json({ error: "Could not load your workspace. Please try again." }, { status: 500 });
  }
}
