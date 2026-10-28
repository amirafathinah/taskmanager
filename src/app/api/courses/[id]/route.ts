import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { isUuid, parseCourse } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  try {
    const parsed = parseCourse(await request.json());
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const [course] = await db.update(courses).set(parsed.data).where(and(eq(courses.id, id), eq(courses.userId, user.id))).returning();
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    return NextResponse.json({ course });
  } catch (error) {
    console.error("Course update failed", error);
    return NextResponse.json({ error: "Couldn't update this course." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  const [course] = await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, user.id))).returning({ id: courses.id });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
