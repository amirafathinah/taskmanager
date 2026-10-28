"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, GraduationCap, LockKeyhole, Mail, Plus, Trash2, X } from "lucide-react";
import { COURSE_COLORS, type Course, type CourseColor, type Task, type TaskInput } from "@/lib/types";
import { offsetDate } from "@/lib/dates";

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-header"><div><span className="modal-eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      {children}
    </section>
  </div>;
}

export function TaskModal({ task, courses, initialCourse, initialDate, onClose, onSave, onDelete }: {
  task: Task | null; courses: Course[]; initialCourse?: string | null; initialDate?: string | null;
  onClose: () => void; onSave: (input: TaskInput, task: Task | null) => void; onDelete: (task: Task) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [courseId, setCourseId] = useState(task?.courseId ?? initialCourse ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? initialDate ?? offsetDate(0));
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [priority, setPriority] = useState<TaskInput["priority"]>(task?.priority ?? "medium");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !dueDate) return;
    onSave({ title: title.trim(), notes: notes.trim(), courseId: courseId || null, dueDate, dueTime: dueTime || null, priority }, task);
    onClose();
  }
  return <ModalShell title={task ? "Edit task" : "Add a new task"} eyebrow="LET'S GET ORGANIZED" onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label>Task name <span className="required">*</span><input autoFocus required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish my research paper" /></label>
      <label>Notes <span className="label-optional">optional</span><textarea maxLength={2000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a few details about this task..." /></label>
      <label>Course<select value={courseId} onChange={(e) => setCourseId(e.target.value)}><option value="">No course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
      <div className="form-grid"><label>Deadline <span className="required">*</span><input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label><label>Time <span className="label-optional">optional</span><input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} /></label></div>
      <fieldset className="priority-field"><legend>Priority</legend><div className="priority-options">{(["low", "medium", "high"] as const).map((item) => <button type="button" key={item} className={`priority-option ${priority === item ? `selected ${item}` : ""}`} onClick={() => setPriority(item)}><span className={`priority-dot ${item}`} />{item[0].toUpperCase() + item.slice(1)}</button>)}</div></fieldset>
      <div className="modal-actions">{task && <button type="button" className="text-danger" onClick={() => { onClose(); onDelete(task); }}><Trash2 size={15} /> Delete</button>}<span className="action-spacer" /><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">{task ? "Save changes" : <><Plus size={16} /> Add task</>}</button></div>
    </form>
  </ModalShell>;
}

export function CourseModal({ course, onClose, onSave, onDelete }: { course: Course | null; onClose: () => void; onSave: (name: string, color: CourseColor, course: Course | null) => void; onDelete: (course: Course) => void }) {
  const [name, setName] = useState(course?.name ?? "");
  const [color, setColor] = useState<CourseColor>(course?.color ?? "violet");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color, course);
    onClose();
  }
  return <ModalShell title={course ? "Edit course" : "Add a course"} eyebrow="YOUR CLASSES" onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <p className="form-intro">Keep your tasks organized by the classes they belong to.</p>
      <label>Course name <span className="required">*</span><input autoFocus required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Introduction to Biology" /></label>
      <fieldset className="color-field"><legend>Pick a color</legend><div className="color-options">{COURSE_COLORS.map((item) => <button type="button" aria-label={`${item} color`} key={item} className={`color-choice color-${item} ${color === item ? "is-selected" : ""}`} onClick={() => setColor(item)}>{color === item && <Check size={15} />}</button>)}</div></fieldset>
      <div className="modal-actions">{course && <button type="button" className="text-danger" onClick={() => { onClose(); onDelete(course); }}><Trash2 size={15} /> Delete</button>}<span className="action-spacer" /><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">{course ? "Save changes" : "Add course"}</button></div>
    </form>
  </ModalShell>;
}

export function ConfirmModal({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  return <ModalShell title={title} eyebrow="JUST CHECKING" onClose={onCancel}><div className="confirm-body"><p>{description}</p><div className="modal-actions"><span className="action-spacer" /><button className="button secondary" onClick={onCancel}>Cancel</button><button className="button danger" onClick={onConfirm}>Yes, delete</button></div></div></ModalShell>;
}

type AuthAction = "login" | "register" | "demo";
export function AuthForm({ initialMode = "login", onAuth, onClose, claimDemo = false }: {
  initialMode?: "login" | "register"; onAuth: (action: AuthAction, values?: { name: string; email: string; password: string }) => Promise<void>; onClose?: () => void; claimDemo?: boolean;
}) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setLoading(true);
    try { await onAuth(mode, { name, email, password }); } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); } finally { setLoading(false); }
  }
  async function demo() {
    setError(""); setLoading(true);
    try { await onAuth("demo"); } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); } finally { setLoading(false); }
  }
  return <div className="auth-form-wrap">
    {onClose && <button className="icon-button auth-close" onClick={onClose} aria-label="Close"><X size={19} /></button>}
    <div className="auth-form-icon"><GraduationCap size={22} /></div>
    <span className="modal-eyebrow">YOUR SPACE TO SUCCEED</span>
    <h2>{mode === "login" ? "Welcome back!" : "Make it yours."}</h2>
    <p className="auth-subtitle">{mode === "login" ? "Sign in to pick up right where you left off." : claimDemo ? "Create an account to keep your demo tasks and courses." : "A little more organized, one day at a time."}</p>
    <form className="modal-form auth-form" onSubmit={submit}>
      {mode === "register" && <label>Your name<input autoFocus required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" /></label>}
      <label>Email address<div className="input-with-icon"><Mail size={16} /><input autoFocus={mode === "login"} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" /></div></label>
      <label>Password<div className="input-with-icon"><LockKeyhole size={16} /><input required minLength={mode === "register" ? 8 : 1} maxLength={128} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"} /></div></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button primary auth-submit" disabled={loading}>{loading ? "Just a moment..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button>
    </form>
    <p className="auth-switch">{mode === "login" ? "New to Studyspace?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
    {!claimDemo && <><div className="auth-divider"><span>or</span></div><button className="button secondary demo-button" disabled={loading} onClick={demo}><BookOpen size={16} /> Explore a demo workspace</button></>}
  </div>;
}

export function AuthModal({ onClose, onAuth, initialMode }: { onClose: () => void; onAuth: (action: AuthAction, values?: { name: string; email: string; password: string }) => Promise<void>; initialMode: "login" | "register" }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", listener); return () => document.removeEventListener("keydown", listener);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card auth-modal" role="dialog" aria-modal="true" aria-label="Account"><AuthForm initialMode={initialMode} onClose={onClose} onAuth={onAuth} claimDemo /></section></div>;
}
