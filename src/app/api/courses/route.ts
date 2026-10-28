import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { parseCourse } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  try {
    const parsed = parseCourse(await request.json());
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const [course] = await db.insert(courses).values({ ...parsed.data, userId: user.id }).returning();
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("Course creation failed", error);
    return NextResponse.json({ error: "Couldn't create this course." }, { status: 500 });
  }
}
