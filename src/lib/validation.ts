import { COURSE_COLORS, type CourseColor, type TaskInput } from "@/lib/types";

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function parseTaskInput(body: Record<string, unknown>): { data: TaskInput; error?: never } | { error: string; data?: never } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : "";
  const dueTime = body.dueTime === "" || body.dueTime == null ? null : body.dueTime;
  const courseId = body.courseId === "" || body.courseId == null ? null : body.courseId;
  const priority = body.priority;
  if (!title || title.length > 160) return { error: "Please enter a task title (up to 160 characters)." };
  if (notes.length > 2000) return { error: "Notes must be under 2,000 characters." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`)) || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate) return { error: "Please choose a valid deadline." };
  if (dueTime !== null && (typeof dueTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime))) return { error: "Please enter a valid time." };
  if (courseId !== null && !isUuid(courseId)) return { error: "Please choose a valid course." };
  if (priority !== "high" && priority !== "medium" && priority !== "low") return { error: "Please choose a priority." };
  return { data: { title, notes, dueDate, dueTime, courseId, priority } };
}

export function parseCourse(body: Record<string, unknown>): { data: { name: string; color: CourseColor }; error?: never } | { error: string; data?: never } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) return { error: "Please enter a course name (up to 80 characters)." };
  if (typeof body.color !== "string" || !COURSE_COLORS.includes(body.color as CourseColor)) return { error: "Please select a course color." };
  return { data: { name, color: body.color as CourseColor } };
}
