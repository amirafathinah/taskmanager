import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { parseTaskInput } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  try {
    const parsed = parseTaskInput(await request.json());
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (parsed.data.courseId) {
      const [course] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.id, parsed.data.courseId), eq(courses.userId, user.id))).limit(1);
      if (!course) return NextResponse.json({ error: "Course not found." }, { status: 400 });
    }
    const [task] = await db.insert(tasks).values({ ...parsed.data, userId: user.id }).returning();
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Task creation failed", error);
    return NextResponse.json({ error: "Couldn't create this task." }, { status: 500 });
  }
}
