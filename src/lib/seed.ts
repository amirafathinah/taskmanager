import { randomUUID } from "crypto";
import { db } from "@/db";
import { courses, tasks, users } from "@/db/schema";
import { DEMO_COURSES, DEMO_TASKS, demoDueDate } from "@/lib/demo-data";

export async function createDemoWorkspace() {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name: "Alex Morgan",
      email: `demo-${randomUUID()}@studyspace.local`,
      isDemo: true,
    }).returning();
    const createdCourses = await tx.insert(courses).values(
      DEMO_COURSES.map((course) => ({ userId: user.id, name: course.name, color: course.color })),
    ).returning();
    await tx.insert(tasks).values(
      DEMO_TASKS.map((task) => ({
        userId: user.id,
        courseId: task.courseIndex === null ? null : createdCourses[task.courseIndex].id,
        title: task.title,
        notes: task.notes,
        dueDate: demoDueDate(task.dueOffset),
        dueTime: task.dueTime,
        priority: task.priority,
        completed: task.completed,
      })),
    );
    return { id: user.id, name: user.name, email: user.email, isDemo: user.isDemo };
  });
}
