"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { dateKey, friendlyDate, localDate, offsetDate } from "@/lib/dates";
import type { Course, Task } from "@/lib/types";

export function CalendarPanel({ tasks, courses, selectedDate, onSelectDate, onEditTask, onSeeAll }: {
  tasks: Task[]; courses: Course[]; selectedDate: string | null; onSelectDate: (date: string | null) => void; onEditTask: (task: Task) => void; onSeeAll: () => void;
}) {
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const upcoming = tasks.filter((task) => !task.completed).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? "23:59").localeCompare(b.dueTime ?? "23:59")).slice(0, 3);
  const done = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  return <aside className="right-panel">
    <section id="calendar-card" className="calendar-section">
      <div className="aside-title-row"><div><h2>Calendar</h2><p>Make every day count.</p></div><span className="aside-title-icon"><CalendarDays size={18} /></span></div>
      <div className="month-nav"><h3>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3><div><button className="calendar-arrow" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Previous month"><ChevronLeft size={17} /></button><button className="calendar-arrow" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Next month"><ChevronRight size={17} /></button></div></div>
      <div className="calendar-grid calendar-weekdays">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={index}>{day}</span>)}</div>
      <div className="calendar-grid calendar-days">{cells.map((day, index) => {
        if (!day) return <span key={`blank-${index}`} />;
        const key = dateKey(new Date(year, monthIndex, day));
        const hasTask = tasks.some((task) => task.dueDate === key && !task.completed);
        const isToday = key === offsetDate(0);
        return <button key={key} aria-label={`${localDate(key).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${hasTask ? ", tasks due" : ""}`} aria-pressed={selectedDate === key} className={`calendar-day ${isToday ? "is-today" : ""} ${selectedDate === key ? "is-selected" : ""}`} onClick={() => onSelectDate(selectedDate === key ? null : key)}>{day}{hasTask && <span className="calendar-dot" />}</button>;
      })}</div>
      <div className="calendar-legend"><span><i /> Task deadline</span><button onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); onSelectDate(offsetDate(0)); }}>Today</button></div>
    </section>
    <div className="aside-divider" />
    <section className="deadline-section"><div className="aside-section-heading"><div><h2>Upcoming deadlines</h2><p>Don't let these sneak up on you.</p></div><button className="subtle-link" onClick={onSeeAll}>See all <ArrowRight size={13} /></button></div>
      <div className="deadline-list">{upcoming.length ? upcoming.map((task) => {
        const course = courses.find((item) => item.id === task.courseId);
        const date = localDate(task.dueDate);
        return <button className="deadline-item" key={task.id} onClick={() => onEditTask(task)}><span className={`deadline-date tint-${course?.color ?? "violet"}`}><small>{date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</small><b>{date.getDate()}</b></span><span className="deadline-info"><strong>{task.title}</strong><span>{course?.name ?? "Personal"} <i>·</i> {task.dueDate < offsetDate(0) ? "Overdue" : friendlyDate(task.dueDate)}</span></span><ChevronRight size={15} className="deadline-chevron" /></button>;
      }) : <div className="aside-empty">No upcoming deadlines. Enjoy the breathing room!</div>}</div>
    </section>
    <section className="little-progress"><div className="little-progress-top"><span className="progress-sparkle"><Sparkles size={16} /></span><span>YOUR PROGRESS</span></div><strong>Look at you go!</strong><p>You&apos;ve completed {done} {done === 1 ? "task" : "tasks"} so far. Keep up the great work.</p><div className="little-progress-bottom"><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><b>{percent}%</b></div></section>
    <div className="aside-footer">Made for your brightest days <span>✳</span></div>
  </aside>;
}
