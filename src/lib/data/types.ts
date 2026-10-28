import type { AppUser, Course, CourseColor, Task, TaskInput } from "@/lib/types";

export type Workspace = {
  user: AppUser | null;
  courses: Course[];
  tasks: Task[];
};

export type StoreMode = "server" | "local";

export type Store = {
  mode: StoreMode;
  bootstrap(): Promise<Workspace>;
  createTask(input: TaskInput): Promise<Task>;
  updateTask(id: string, input: TaskInput): Promise<Task>;
  setTaskCompleted(id: string, completed: boolean): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  createCourse(name: string, color: CourseColor): Promise<Course>;
  updateCourse(id: string, name: string, color: CourseColor): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<AppUser>;
  login(email: string, password: string): Promise<AppUser>;
  startDemo(): Promise<AppUser>;
  logout(): Promise<void>;
};
