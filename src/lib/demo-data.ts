import { offsetDate } from "@/lib/dates";
import type { CourseColor, Priority } from "@/lib/types";

export type DemoCourse = { name: string; color: CourseColor };
export type DemoTask = {
  title: string;
  notes: string;
  courseIndex: number | null;
  dueOffset: number;
  dueTime: string | null;
  priority: Priority;
  completed: boolean;
};

export const DEMO_COURSES: DemoCourse[] = [
  { name: "Biology 101", color: "mint" },
  { name: "Calculus II", color: "blue" },
  { name: "English Literature", color: "peach" },
  { name: "Psychology", color: "violet" },
];

export const DEMO_TASKS: DemoTask[] = [
  { title: "Finish research paper outline", notes: "Bring your ideas together and outline the key arguments.", courseIndex: 3, dueOffset: 0, dueTime: "17:00", priority: "high", completed: false },
  { title: "Complete problem set 04", notes: "Exercises 1-12 from this week's lecture.", courseIndex: 1, dueOffset: 0, dueTime: "23:59", priority: "high", completed: false },
  { title: "Read chapters 5-6", notes: "Take notes on cell structure and genetics.", courseIndex: 0, dueOffset: 0, dueTime: "18:00", priority: "medium", completed: false },
  { title: "Submit lab report", notes: "Proofread and upload to the course portal.", courseIndex: 0, dueOffset: 1, dueTime: "17:00", priority: "high", completed: false },
  { title: "Prepare presentation slides", notes: "A short presentation on modern poetry.", courseIndex: 2, dueOffset: 2, dueTime: "12:00", priority: "medium", completed: false },
  { title: "Review lecture notes", notes: "Go over this week's lecture before the seminar.", courseIndex: 3, dueOffset: 4, dueTime: null, priority: "low", completed: false },
  { title: "Work on essay draft", notes: "Write the first draft and collect references.", courseIndex: 2, dueOffset: 6, dueTime: null, priority: "medium", completed: false },
  { title: "Quiz: limits & derivatives", notes: "", courseIndex: 1, dueOffset: -1, dueTime: null, priority: "high", completed: true },
  { title: "Watch lecture recording", notes: "", courseIndex: 3, dueOffset: -2, dueTime: null, priority: "low", completed: true },
];

export function demoDueDate(offset: number) {
  return offsetDate(offset);
}
