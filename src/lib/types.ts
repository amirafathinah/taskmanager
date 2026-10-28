export type Priority = "high" | "medium" | "low";
export type CourseColor = "violet" | "blue" | "mint" | "peach" | "pink" | "yellow";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
};

export type Course = {
  id: string;
  userId: string;
  name: string;
  color: CourseColor;
  createdAt: string;
};

export type Task = {
  id: string;
  userId: string;
  courseId: string | null;
  title: string;
  notes: string;
  dueDate: string;
  dueTime: string | null;
  priority: Priority;
  completed: boolean;
  createdAt: string;
};

export type TaskInput = Pick<Task, "title" | "notes" | "courseId" | "dueDate" | "dueTime" | "priority">;

export const COURSE_COLORS: CourseColor[] = ["violet", "blue", "mint", "peach", "pink", "yellow"];
