import type { AppUser, Course, CourseColor, Task, TaskInput } from "@/lib/types";
import type { Store, Workspace } from "@/lib/data/types";

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

function taskPayload(input: TaskInput) {
  return {
    title: input.title,
    notes: input.notes,
    courseId: input.courseId,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    priority: input.priority,
  };
}

export const serverStore: Store = {
  mode: "server",
  async bootstrap(): Promise<Workspace> {
    return requestJson<Workspace>("/api/bootstrap");
  },
  async createTask(input: TaskInput) {
    const result = await requestJson<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(taskPayload(input)) });
    return result.task;
  },
  async updateTask(id: string, input: TaskInput) {
    const result = await requestJson<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(taskPayload(input)) });
    return result.task;
  },
  async setTaskCompleted(id: string, completed: boolean) {
    const result = await requestJson<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ completed }) });
    return result.task;
  },
  async deleteTask(id: string) {
    await requestJson(`/api/tasks/${id}`, { method: "DELETE" });
  },
  async createCourse(name: string, color: CourseColor) {
    const result = await requestJson<{ course: Course }>("/api/courses", { method: "POST", body: JSON.stringify({ name, color }) });
    return result.course;
  },
  async updateCourse(id: string, name: string, color: CourseColor) {
    const result = await requestJson<{ course: Course }>(`/api/courses/${id}`, { method: "PATCH", body: JSON.stringify({ name, color }) });
    return result.course;
  },
  async deleteCourse(id: string) {
    await requestJson(`/api/courses/${id}`, { method: "DELETE" });
  },
  async register(name: string, email: string, password: string) {
    const result = await requestJson<{ user: AppUser }>("/api/auth", { method: "POST", body: JSON.stringify({ action: "register", name, email, password }) });
    return result.user;
  },
  async login(email: string, password: string) {
    const result = await requestJson<{ user: AppUser }>("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", email, password }) });
    return result.user;
  },
  async startDemo() {
    const result = await requestJson<{ user: AppUser }>("/api/auth", { method: "POST", body: JSON.stringify({ action: "demo" }) });
    return result.user;
  },
  async logout() {
    await requestJson("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
  },
};
