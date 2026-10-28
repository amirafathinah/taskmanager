import { DEMO_COURSES, DEMO_TASKS, demoDueDate } from "@/lib/demo-data";
import type { AppUser, Course, CourseColor, Task, TaskInput } from "@/lib/types";
import type { Store, Workspace } from "@/lib/data/types";

const DATA_KEY = "studyspace.local.v1";
const SESSION_KEY = "studyspace.local.session";
const SESSION_DAYS = 30;

type LocalUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  isDemo: boolean;
  createdAt: string;
};

type LocalSession = { token: string; userId: string; expiresAt: number };

type LocalDatabase = {
  users: LocalUser[];
  sessions: LocalSession[];
  courses: Course[];
  tasks: Task[];
  demoSeeded: boolean;
};

function emptyDatabase(): LocalDatabase {
  return { users: [], sessions: [], courses: [], tasks: [], demoSeeded: false };
}

function readDatabase(): LocalDatabase {
  if (typeof window === "undefined") return emptyDatabase();
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) return emptyDatabase();
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
    return {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      courses: parsed.courses ?? [],
      tasks: parsed.tasks ?? [],
      demoSeeded: parsed.demoSeeded ?? false,
    };
  } catch {
    return emptyDatabase();
  }
}

function writeDatabase(database: LocalDatabase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DATA_KEY, JSON.stringify(database));
}

function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

function writeSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(SESSION_KEY, token);
  else window.localStorage.removeItem(SESSION_KEY);
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function hashPassword(password: string, salt: string) {
  const payload = `${salt}:${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for browsers without SubtleCrypto (non-secure contexts).
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv${(hash >>> 0).toString(16)}`;
}

function toAppUser(user: LocalUser): AppUser {
  return { id: user.id, name: user.name, email: user.email, isDemo: user.isDemo };
}

function currentUser(database: LocalDatabase): LocalUser | null {
  const token = readSessionToken();
  if (!token) return null;
  const session = database.sessions.find((item) => item.token === token && item.expiresAt > Date.now());
  if (!session) return null;
  return database.users.find((user) => user.id === session.userId) ?? null;
}

function startSession(database: LocalDatabase, userId: string) {
  const token = `local-${createId()}`;
  database.sessions = database.sessions.filter((session) => session.expiresAt > Date.now());
  database.sessions.push({ token, userId, expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 });
  writeSessionToken(token);
}

function seedDemoDatabase(database: LocalDatabase): LocalUser {
  const user: LocalUser = {
    id: createId(),
    name: "Alex Morgan",
    email: `demo-${createId()}@studyspace.local`,
    passwordHash: null,
    isDemo: true,
    createdAt: new Date().toISOString(),
  };
  database.users.push(user);
  const courses: Course[] = DEMO_COURSES.map((course) => ({
    id: createId(),
    userId: user.id,
    name: course.name,
    color: course.color,
    createdAt: new Date().toISOString(),
  }));
  database.courses.push(...courses);
  database.tasks.push(
    ...DEMO_TASKS.map((task) => ({
      id: createId(),
      userId: user.id,
      courseId: task.courseIndex === null ? null : courses[task.courseIndex].id,
      title: task.title,
      notes: task.notes,
      dueDate: demoDueDate(task.dueOffset),
      dueTime: task.dueTime,
      priority: task.priority,
      completed: task.completed,
      createdAt: new Date().toISOString(),
    })),
  );
  database.demoSeeded = true;
  startSession(database, user.id);
  return user;
}

function requireUser(database: LocalDatabase) {
  const user = currentUser(database);
  if (!user) throw new Error("Please sign in first.");
  return user;
}

function validateCourse(database: LocalDatabase, userId: string, courseId: string | null) {
  if (!courseId) return;
  if (!database.courses.some((course) => course.id === courseId && course.userId === userId)) {
    throw new Error("Course not found.");
  }
}

function normalizeTaskInput(input: TaskInput): TaskInput {
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error("Please enter a task title (up to 160 characters).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error("Please choose a valid deadline.");
  if (input.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.dueTime)) throw new Error("Please enter a valid time.");
  return { ...input, title, notes: (input.notes ?? "").trim() };
}

export const localStore: Store = {
  mode: "local",

  async bootstrap(): Promise<Workspace> {
    const database = readDatabase();
    let user = currentUser(database);
    if (!user && !database.demoSeeded) {
      user = seedDemoDatabase(database);
      writeDatabase(database);
    }
    if (!user) return { user: null, courses: [], tasks: [] };
    return {
      user: toAppUser(user),
      courses: database.courses.filter((course) => course.userId === user!.id),
      tasks: database.tasks.filter((task) => task.userId === user!.id),
    };
  },

  async createTask(input: TaskInput) {
    const database = readDatabase();
    const user = requireUser(database);
    const data = normalizeTaskInput(input);
    validateCourse(database, user.id, data.courseId);
    const task: Task = {
      id: createId(),
      userId: user.id,
      courseId: data.courseId,
      title: data.title,
      notes: data.notes,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      priority: data.priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    database.tasks.push(task);
    writeDatabase(database);
    return task;
  },

  async updateTask(id: string, input: TaskInput) {
    const database = readDatabase();
    const user = requireUser(database);
    const data = normalizeTaskInput(input);
    validateCourse(database, user.id, data.courseId);
    const task = database.tasks.find((item) => item.id === id && item.userId === user.id);
    if (!task) throw new Error("Task not found.");
    Object.assign(task, { ...data });
    writeDatabase(database);
    return task;
  },

  async setTaskCompleted(id: string, completed: boolean) {
    const database = readDatabase();
    const user = requireUser(database);
    const task = database.tasks.find((item) => item.id === id && item.userId === user.id);
    if (!task) throw new Error("Task not found.");
    task.completed = completed;
    writeDatabase(database);
    return task;
  },

  async deleteTask(id: string) {
    const database = readDatabase();
    const user = requireUser(database);
    const index = database.tasks.findIndex((item) => item.id === id && item.userId === user.id);
    if (index === -1) throw new Error("Task not found.");
    database.tasks.splice(index, 1);
    writeDatabase(database);
  },

  async createCourse(name: string, color: CourseColor) {
    const database = readDatabase();
    const user = requireUser(database);
    const clean = name.trim();
    if (!clean || clean.length > 80) throw new Error("Please enter a course name (up to 80 characters).");
    const course: Course = { id: createId(), userId: user.id, name: clean, color, createdAt: new Date().toISOString() };
    database.courses.push(course);
    writeDatabase(database);
    return course;
  },

  async updateCourse(id: string, name: string, color: CourseColor) {
    const database = readDatabase();
    const user = requireUser(database);
    const course = database.courses.find((item) => item.id === id && item.userId === user.id);
    if (!course) throw new Error("Course not found.");
    const clean = name.trim();
    if (!clean || clean.length > 80) throw new Error("Please enter a course name (up to 80 characters).");
    course.name = clean;
    course.color = color;
    writeDatabase(database);
    return course;
  },

  async deleteCourse(id: string) {
    const database = readDatabase();
    const user = requireUser(database);
    const index = database.courses.findIndex((item) => item.id === id && item.userId === user.id);
    if (index === -1) throw new Error("Course not found.");
    database.courses.splice(index, 1);
    database.tasks = database.tasks.map((task) => (task.userId === user.id && task.courseId === id ? { ...task, courseId: null } : task));
    writeDatabase(database);
  },

  async register(name: string, email: string, password: string) {
    const database = readDatabase();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 80) throw new Error("Please enter your name (2-80 characters).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("Please enter a valid email address.");
    if (password.length < 8 || password.length > 128) throw new Error("Your password must be at least 8 characters.");
    if (database.users.some((user) => user.email === cleanEmail)) throw new Error("An account with that email already exists.");

    const salt = createId();
    const passwordHash = `${salt}:${await hashPassword(password, salt)}`;
    const active = currentUser(database);
    let account: LocalUser;
    if (active?.isDemo) {
      // Claiming a demo workspace keeps all of the student's existing tasks.
      account = active;
      account.name = cleanName;
      account.email = cleanEmail;
      account.passwordHash = passwordHash;
      account.isDemo = false;
    } else {
      account = { id: createId(), name: cleanName, email: cleanEmail, passwordHash, isDemo: false, createdAt: new Date().toISOString() };
      database.users.push(account);
    }
    startSession(database, account.id);
    writeDatabase(database);
    return toAppUser(account);
  },

  async login(email: string, password: string) {
    const database = readDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const account = database.users.find((user) => user.email === cleanEmail && user.passwordHash);
    if (!account) throw new Error("That email and password don't match.");
    const [salt, expected] = (account.passwordHash as string).split(":");
    const actual = await hashPassword(password, salt);
    if (expected !== actual) throw new Error("That email and password don't match.");
    startSession(database, account.id);
    writeDatabase(database);
    return toAppUser(account);
  },

  async startDemo() {
    const database = readDatabase();
    const user = seedDemoDatabase(database);
    writeDatabase(database);
    return toAppUser(user);
  },

  async logout() {
    const database = readDatabase();
    const token = readSessionToken();
    database.sessions = database.sessions.filter((session) => session.token !== token);
    writeSessionToken(null);
    writeDatabase(database);
  },
};
