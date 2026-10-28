import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { isUuid, parseTaskInput } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  try {
    const body = await request.json();
    let changes: Partial<typeof tasks.$inferInsert>;
    if (typeof body.completed === "boolean" && Object.keys(body).length === 1) {
      changes = { completed: body.completed };
    } else {
      const parsed = parseTaskInput(body);
      if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (parsed.data.courseId) {
        const [course] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.id, parsed.data.courseId), eq(courses.userId, user.id))).limit(1);
        if (!course) return NextResponse.json({ error: "Course not found." }, { status: 400 });
      }
      changes = parsed.data;
    }
    const [task] = await db.update(tasks).set(changes).where(and(eq(tasks.id, id), eq(tasks.userId, user.id))).returning();
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task update failed", error);
    return NextResponse.json({ error: "Couldn't update this task." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  const [task] = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id))).returning({ id: tasks.id });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
