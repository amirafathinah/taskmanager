"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Bell, BookOpen, CalendarClock, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleCheck, Clock3, GraduationCap, LayoutDashboard,
  ListTodo, LogOut, Menu, MoreHorizontal, Pencil, Plus, Search, Sparkles, Trash2,
  UserRound, X,
} from "lucide-react";
import { CalendarPanel } from "@/components/calendar-panel";
import { AuthForm, AuthModal, ConfirmModal, CourseModal, TaskModal } from "@/components/modals";
import { dateKey, formatTime, friendlyDate, localDate, offsetDate } from "@/lib/dates";
import { assetUrl, getStore } from "@/lib/data";
import type { Store } from "@/lib/data/types";
import type { AppUser, Course, CourseColor, Task, TaskInput } from "@/lib/types";

type View = "dashboard" | "tasks" | "calendar" | "completed" | "course";
type Tab = "all" | "today" | "upcoming";
type AuthAction = "login" | "register" | "demo";
type DeleteTarget = { type: "task"; item: Task } | { type: "course"; item: Course };

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function Logo() {
  return <div className="brand"><span className="brand-icon"><GraduationCap size={22} strokeWidth={2} /></span><span className="brand-copy"><strong>studyspace<span>.</span></strong><small>YOUR STUDENT PLANNER</small></span></div>;
}

function LoadingScreen() {
  return <div className="loading-shell"><div className="loading-sidebar"><Logo /><div className="skeleton sk-label" /><div className="skeleton sk-nav" /><div className="skeleton sk-nav" /><div className="skeleton sk-nav" /><div className="skeleton sk-label" /><div className="skeleton sk-nav" /><div className="skeleton sk-nav" /></div><div className="loading-content"><div className="skeleton sk-top" /><div className="loading-inner"><div className="skeleton sk-heading" /><div className="skeleton sk-subheading" /><div className="skeleton sk-hero" /><div className="loading-stats"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div><div className="skeleton sk-table" /></div></div></div>;
}

function SignedOut({ onAuth }: { onAuth: (action: AuthAction, values?: { name: string; email: string; password: string }) => Promise<void> }) {
  return <main className="auth-screen"><div className="auth-showcase"><Logo /><div className="auth-showcase-copy"><span className="showcase-kicker"><Sparkles size={14} /> A LITTLE MORE BALANCE</span><h1>Make room for<br /><em>your best work.</em></h1><p>All your tasks, deadlines, and little wins, together in one calm space.</p><div className="showcase-image" style={{ backgroundImage: `url(${assetUrl("/images/study-hero.jpg")})` }} /><div className="showcase-foot"><span><CheckCircle2 size={17} /> Stay on top of deadlines</span><span><CheckCircle2 size={17} /> Celebrate your progress</span></div></div><small className="showcase-copyright">© Studyspace · Made for students, by students.</small></div><div className="auth-side"><AuthForm onAuth={onAuth} /><p className="auth-side-foot">Your next good day starts here ✳</p></div></main>;
}

export default function Dashboard() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [tab, setTab] = useState<Tab>("all");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("deadline");
  const [taskModal, setTaskModal] = useState<Task | "new" | null>(null);
  const [courseModal, setCourseModal] = useState<Course | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const started = useRef(false);
  const storeRef = useRef<Store | null>(null);
  const [storageMode, setStorageMode] = useState<"server" | "local">("server");

  const loadWorkspace = useCallback(async () => {
    const store = await getStore();
    storeRef.current = store;
    setStorageMode(store.mode);
    const data = await store.bootstrap();
    setUser(data.user); setCourses(data.courses); setTasks(data.tasks); setLoadError("");
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loadWorkspace().catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
  }, [loadWorkspace]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);

  const today = offsetDate(0);
  const dueToday = tasks.filter((task) => !task.completed && task.dueDate === today).length;
  const upcomingCount = tasks.filter((task) => !task.completed && task.dueDate > today && task.dueDate <= offsetDate(7)).length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;
  const progress = tasks.length ? Math.round(completedCount / tasks.length * 100) : 0;
  const courseName = courses.find((course) => course.id === selectedCourse)?.name;

  const filteredTasks = useMemo(() => {
    let list = tasks.filter((task) => view === "completed" ? task.completed : !task.completed);
    if (view === "course" && selectedCourse) list = list.filter((task) => task.courseId === selectedCourse);
    if (view === "calendar" && selectedDate) list = list.filter((task) => task.dueDate === selectedDate);
    if (tab === "today" && view !== "completed" && view !== "calendar") list = list.filter((task) => task.dueDate === today);
    if (tab === "upcoming" && view !== "completed" && view !== "calendar") list = list.filter((task) => task.dueDate > today);
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((task) => `${task.title} ${task.notes} ${courses.find((course) => course.id === task.courseId)?.name ?? ""}`.toLowerCase().includes(query));
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return list.slice().sort((a, b) => sort === "priority" ? priorityOrder[a.priority] - priorityOrder[b.priority] || a.dueDate.localeCompare(b.dueDate) : a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? "23:59").localeCompare(b.dueTime ?? "23:59"));
  }, [tasks, view, selectedCourse, selectedDate, tab, today, search, courses, sort]);
  const shownTasks = view === "dashboard" ? filteredTasks.slice(0, 5) : filteredTasks;

  function navigate(next: View, courseId: string | null = null) {
    setView(next); setSelectedCourse(courseId); setSelectedDate(next === "calendar" ? today : null); setTab("all"); setSearch(""); setMobileNav(false); setOpenMenu(null);
    if (next === "calendar" && window.innerWidth < 1050) setTimeout(() => document.getElementById("calendar-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  function showUpcoming() { setView("tasks"); setTab("upcoming"); setSelectedDate(null); setSelectedCourse(null); setSearch(""); setNotificationsOpen(false); }
  function markPending(id: string, pending: boolean) { setPendingIds((previous) => { const next = new Set(previous); if (pending) next.add(id); else next.delete(id); return next; }); }

  async function toggleTask(task: Task) {
    if (task.id.startsWith("temp-") || pendingIds.has(task.id)) return;
    markPending(task.id, true);
    setTasks((previous) => previous.map((item) => item.id === task.id ? { ...item, completed: !task.completed } : item));
    try {
      const updated = await storeRef.current!.setTaskCompleted(task.id, !task.completed);
      setTasks((previous) => previous.map((item) => item.id === task.id ? updated : item));
      setToast(task.completed ? "Task moved back to your list." : "Nice work! Task completed.");
    } catch (error) {
      setTasks((previous) => previous.map((item) => item.id === task.id ? { ...item, completed: task.completed } : item));
      setToast(error instanceof Error ? error.message : "Couldn't update task.");
    } finally { markPending(task.id, false); }
  }

  async function saveTask(input: TaskInput, task: Task | null) {
    if (!user) return;
    if (task) {
      setTasks((previous) => previous.map((item) => item.id === task.id ? { ...item, ...input } : item));
      try {
        const updated = await storeRef.current!.updateTask(task.id, input);
        setTasks((previous) => previous.map((item) => item.id === task.id ? updated : item)); setToast("Task updated.");
      } catch (error) { setTasks((previous) => previous.map((item) => item.id === task.id ? task : item)); setToast(error instanceof Error ? error.message : "Couldn't update task."); }
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Task = { ...input, id: tempId, userId: user.id, completed: false, createdAt: new Date().toISOString() };
      setTasks((previous) => [...previous, optimistic]);
      try {
        const created = await storeRef.current!.createTask(input);
        setTasks((previous) => previous.map((item) => item.id === tempId ? created : item)); setToast("Task added to your list.");
      } catch (error) { setTasks((previous) => previous.filter((item) => item.id !== tempId)); setToast(error instanceof Error ? error.message : "Couldn't add task."); }
    }
  }

  async function saveCourse(name: string, color: CourseColor, course: Course | null) {
    if (!user) return;
    if (course) {
      setCourses((previous) => previous.map((item) => item.id === course.id ? { ...item, name, color } : item));
      try {
        const updated = await storeRef.current!.updateCourse(course.id, name, color);
        setCourses((previous) => previous.map((item) => item.id === course.id ? updated : item)); setToast("Course updated.");
      } catch (error) { setCourses((previous) => previous.map((item) => item.id === course.id ? course : item)); setToast(error instanceof Error ? error.message : "Couldn't update course."); }
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Course = { id: tempId, userId: user.id, name, color, createdAt: new Date().toISOString() };
      setCourses((previous) => [...previous, optimistic]);
      try {
        const created = await storeRef.current!.createCourse(name, color);
        setCourses((previous) => previous.map((item) => item.id === tempId ? created : item)); setToast("Course added.");
      } catch (error) { setCourses((previous) => previous.filter((item) => item.id !== tempId)); setToast(error instanceof Error ? error.message : "Couldn't add course."); }
    }
  }

  async function confirmDelete() {
    const target = deleteTarget; setDeleteTarget(null); setOpenMenu(null);
    if (!target) return;
    if (target.type === "task") {
      setTasks((previous) => previous.filter((item) => item.id !== target.item.id));
      try { await storeRef.current!.deleteTask(target.item.id); setToast("Task deleted."); }
      catch (error) { setTasks((previous) => [...previous, target.item]); setToast(error instanceof Error ? error.message : "Couldn't delete task."); }
    } else {
      const affected = tasks.filter((task) => task.courseId === target.item.id).map((task) => task.id);
      setCourses((previous) => previous.filter((item) => item.id !== target.item.id));
      setTasks((previous) => previous.map((item) => item.courseId === target.item.id ? { ...item, courseId: null } : item));
      if (selectedCourse === target.item.id) navigate("tasks");
      try { await storeRef.current!.deleteCourse(target.item.id); setToast("Course deleted; its tasks were kept."); }
      catch (error) { setCourses((previous) => [...previous, target.item]); setTasks((previous) => previous.map((item) => affected.includes(item.id) ? { ...item, courseId: target.item.id } : item)); setToast(error instanceof Error ? error.message : "Couldn't delete course."); }
    }
  }

  async function handleAuth(action: AuthAction, values?: { name: string; email: string; password: string }) {
    const store = storeRef.current ?? (await getStore());
    storeRef.current = store;
    if (action === "register") await store.register(values?.name ?? "", values?.email ?? "", values?.password ?? "");
    else if (action === "login") await store.login(values?.email ?? "", values?.password ?? "");
    else await store.startDemo();
    await loadWorkspace(); setAuthModal(null); navigate("dashboard"); setToast(action === "register" ? "Your workspace is saved. Welcome!" : "Welcome to your workspace.");
  }
  async function signOut() {
    try { await storeRef.current?.logout(); setUser(null); setTasks([]); setCourses([]); setProfileOpen(false); setMobileNav(false); }
    catch (error) { setToast(error instanceof Error ? error.message : "Couldn't sign out."); }
  }

  if (loading) return <LoadingScreen />;
  if (loadError) return <div className="load-error"><div className="empty-icon"><BookOpen size={24} /></div><h2>We couldn't load your workspace</h2><p>{loadError}</p><button className="button primary" onClick={() => { setLoading(true); loadWorkspace().catch((error) => setLoadError(error.message)).finally(() => setLoading(false)); }}>Try again</button></div>;
  if (!user) return <SignedOut onAuth={handleAuth} />;

  const pageTitle = view === "dashboard" ? "Dashboard" : view === "tasks" ? "My tasks" : view === "calendar" ? "Calendar" : view === "completed" ? "Completed" : courseName ?? "Course";
  const sectionTitle = view === "completed" ? "Completed tasks" : view === "calendar" && selectedDate ? `Tasks for ${friendlyDate(selectedDate)}` : view === "course" ? `${courseName ?? "Course"} tasks` : "Your tasks";
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];
  const sortedNotifications = tasks.filter((task) => !task.completed).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);

  return <div className="app-shell">
    {mobileNav && <div className="sidebar-overlay" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Logo /><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="sidebar-scroll"><div className="nav-label">WORKSPACE</div><nav className="primary-nav" aria-label="Main navigation">
        <button className={`nav-link ${view === "dashboard" ? "active" : ""}`} onClick={() => navigate("dashboard")}><LayoutDashboard size={18} /><span>Dashboard</span></button>
        <button className={`nav-link ${view === "tasks" ? "active" : ""}`} onClick={() => navigate("tasks")}><ListTodo size={18} /><span>My tasks</span><b className="nav-count">{openCount}</b></button>
        <button className={`nav-link ${view === "calendar" ? "active" : ""}`} onClick={() => navigate("calendar")}><CalendarDays size={18} /><span>Calendar</span></button>
        <button className={`nav-link ${view === "completed" ? "active" : ""}`} onClick={() => navigate("completed")}><CircleCheck size={18} /><span>Completed</span></button>
      </nav>
      <div className="course-nav-heading"><span className="nav-label">MY COURSES</span><button className="tiny-icon" aria-label="Add course" onClick={() => setCourseModal("new")}><Plus size={16} /></button></div>
      <div className="course-nav-list">{courses.length ? courses.map((course) => <div className={`course-nav-row ${view === "course" && selectedCourse === course.id ? "course-active" : ""}`} key={course.id}><button className="course-nav-button" disabled={course.id.startsWith("temp-")} onClick={() => navigate("course", course.id)}><span className={`course-dot color-${course.color}`} /><span>{course.name}</span></button><button className="course-edit" disabled={course.id.startsWith("temp-")} aria-label={`Edit ${course.name}`} onClick={() => setCourseModal(course)}><Pencil size={13} /></button></div>) : <p className="no-courses">Your courses will show up here.</p>}
      <button className="add-course-link" onClick={() => setCourseModal("new")}><Plus size={15} /> Add a course</button></div></div>
      <div className="sidebar-bottom"><div className="sidebar-promo"><div className="promo-sparkle"><Sparkles size={16} /></div><strong>{user.isDemo ? "Make this space yours" : "A little progress adds up"}</strong><p>{user.isDemo ? "Save your tasks and pick up where you left off." : "You're building great habits, one task at a time."}</p><span className={`storage-chip ${storageMode}`}><i />{storageMode === "local" ? "Local browser database" : "PostgreSQL database"}</span><button onClick={() => user.isDemo ? setAuthModal("register") : setTaskModal("new")}>{user.isDemo ? "Create free account" : "Add a task"} <ArrowRight size={13} /></button></div>
      <div className="sidebar-profile"><span className="avatar avatar-small">{initials(user.name)}</span><span className="sidebar-profile-text"><strong>{user.name}</strong><small>{user.isDemo ? "Demo workspace" : "Student account"}</small></span><button className="tiny-icon" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></div></div>
    </aside>

    <div className="app-main"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div><div className="topbar-actions"><div className="search-box"><Search size={17} /><input aria-label="Search tasks" placeholder="Search tasks or courses..." value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value && view === "dashboard") setView("tasks"); }} /><span className="search-shortcut">⌘ K</span></div><div className="popover-wrap"><button className="icon-button notification-button" aria-label="View upcoming deadlines" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}><Bell size={19} />{dueToday > 0 && <span />}</button>{notificationsOpen && <div className="popover notification-popover"><div className="popover-title">Coming up <small>{openCount} to do</small></div>{sortedNotifications.length ? sortedNotifications.map((task) => <button key={task.id} className="notification-item" onClick={() => { setNotificationsOpen(false); setTaskModal(task); }}><span className="notification-dot" /><span><strong>{task.title}</strong><small>{friendlyDate(task.dueDate)}{task.dueTime ? ` · ${formatTime(task.dueTime)}` : ""}</small></span></button>) : <p className="popover-empty">You're all caught up!</p>}<button className="popover-footer" onClick={showUpcoming}>View upcoming tasks <ArrowRight size={14} /></button></div>}</div><div className="topbar-separator" /><div className="popover-wrap"><button className="top-profile" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} aria-label="Account menu"><span className="avatar">{initials(user.name)}</span><span className="top-profile-copy"><strong>{user.name}</strong><small>{user.isDemo ? "Demo account" : "Student"}</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="popover profile-popover"><div className="profile-popover-heading"><strong>{user.name}</strong><span>{user.isDemo ? "Demo workspace" : user.email}</span></div>{user.isDemo && <><button onClick={() => { setAuthModal("register"); setProfileOpen(false); }}><UserRound size={15} /> Create account</button><button onClick={() => { setAuthModal("login"); setProfileOpen(false); }}><GraduationCap size={15} /> Sign in</button></>}<button onClick={signOut}><LogOut size={15} /> Sign out</button></div>}</div></div></header>

    <div className="workspace-layout"><main className="main-content">
      <div className="page-heading"><div><div className="date-eyebrow"><span /> {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div><h1>{view === "dashboard" ? <>{greeting}, {firstName} <span className="wave">👋</span></> : pageTitle}</h1><p>{view === "dashboard" ? "Let's make today a good day for progress." : view === "completed" ? "A little celebration for everything you've finished." : view === "calendar" ? "Pick a day to see what's on your schedule." : view === "course" ? "Everything you need for this class, in one place." : "All your to-dos, organized and ready for you."}</p></div><button className="button primary add-task-button" onClick={() => setTaskModal("new")}><Plus size={17} /> Add new task</button></div>
      {view === "dashboard" && <><section className="hero-card" style={{ backgroundImage: `url(${assetUrl("/images/study-hero.jpg")})` }}><div className="hero-content"><div className="hero-eyebrow"><Sparkles size={13} /> A LITTLE PROGRESS EVERY DAY</div><h2>You've got this, {firstName}!</h2><p>Small steps lead to big things. Let's make<br className="hero-break" /> today a productive one.</p><button className="hero-link" onClick={() => navigate("completed")}>See your progress <ArrowRight size={14} /></button></div><div className="hero-progress"><div><span>YOUR PROGRESS</span><strong>{progress}%</strong></div><div className="hero-track"><span style={{ width: `${progress}%` }} /></div><small>{completedCount} of {tasks.length} tasks completed</small></div></section>
      <div className="stats-grid"><button className="stat-card" onClick={() => { setView("tasks"); setTab("today"); setSearch(""); }}><span className="stat-icon stat-purple"><Clock3 size={19} /></span><span className="stat-copy"><span>Due today</span><strong>{dueToday} <small>{dueToday === 1 ? "task" : "tasks"}</small></strong><em>Let’s get them done</em></span><ChevronRight className="stat-arrow" size={16} /></button><button className="stat-card" onClick={showUpcoming}><span className="stat-icon stat-orange"><CalendarClock size={19} /></span><span className="stat-copy"><span>Upcoming</span><strong>{upcomingCount} <small>{upcomingCount === 1 ? "task" : "tasks"}</small></strong><em>In the next 7 days</em></span><ChevronRight className="stat-arrow" size={16} /></button><button className="stat-card" onClick={() => navigate("completed")}><span className="stat-icon stat-green"><CheckCircle2 size={19} /></span><span className="stat-copy"><span>Completed</span><strong>{completedCount} <small>{completedCount === 1 ? "task" : "tasks"}</small></strong><em>Look at you go!</em></span><ChevronRight className="stat-arrow" size={16} /></button></div></>}
      <section className="tasks-section"><div className="section-heading"><div><div className="section-title-line"><h2>{sectionTitle}</h2><span className="section-count">{filteredTasks.length}</span></div><p>{view === "completed" ? "All those little wins add up." : view === "calendar" && selectedDate ? localDate(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "A clear mind starts with a clear list."}</p></div>{view === "dashboard" && <button className="view-all-link" onClick={() => navigate("tasks")}>View all tasks <ArrowRight size={15} /></button>}{view === "calendar" && selectedDate && <button className="view-all-link" onClick={() => setSelectedDate(null)}>Clear date <X size={14} /></button>}</div>
        <div className="task-card"><div className="task-toolbar"><div className="task-tabs">{view === "completed" ? <span className="static-tab">Your wins</span> : view === "calendar" ? <span className="static-tab">{selectedDate ? "Selected day" : "All dates"}</span> : <>{([["all", "All tasks"], ["today", "Due today"], ["upcoming", "Upcoming"]] as [Tab, string][]).map(([value, label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>)}</>}</div><label className="sort-control"><span>Sort by:</span><select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value)}><option value="deadline">Deadline</option><option value="priority">Priority</option></select><ChevronDown size={13} /></label></div>
          {shownTasks.length > 0 ? <><div className="task-table-head task-grid"><span>TASK NAME</span><span>COURSE</span><span>DEADLINE</span><span>PRIORITY</span><span /></div><div className="task-list">{shownTasks.map((task) => {
            const course = courses.find((item) => item.id === task.courseId);
            const overdue = !task.completed && task.dueDate < today;
            return <div className={`task-row task-grid ${task.completed ? "is-completed" : ""} ${task.id.startsWith("temp-") ? "is-pending" : ""}`} key={task.id}>
              <div className="task-name-cell"><button role="checkbox" aria-checked={task.completed} aria-label={`${task.completed ? "Mark not complete" : "Complete"}: ${task.title}`} disabled={pendingIds.has(task.id) || task.id.startsWith("temp-")} className={`task-check ${task.completed ? "checked" : ""}`} onClick={() => toggleTask(task)}>{task.completed && <Check size={13} strokeWidth={3} />}</button><button className="task-title-button" disabled={task.id.startsWith("temp-")} onClick={() => setTaskModal(task)}><strong>{task.title}</strong><small>{task.notes || "No notes added"}</small></button></div>
              <div className="task-course-cell"><span className={`course-tag tag-${course?.color ?? "neutral"}`}><i className={`course-dot color-${course?.color ?? "neutral"}`} />{course?.name ?? "Personal"}</span></div>
              <div className={`due-cell ${overdue ? "overdue" : ""}`}><CalendarDays size={14} /><span><strong>{overdue ? "Overdue" : friendlyDate(task.dueDate)}</strong><small>{overdue ? friendlyDate(task.dueDate) : task.dueTime ? formatTime(task.dueTime) : "All day"}</small></span></div>
              <div className="task-priority-cell"><span className={`priority-badge priority-${task.priority}`}><i className={`priority-dot ${task.priority}`} />{task.priority[0].toUpperCase() + task.priority.slice(1)}</span></div>
              <div className="task-menu-wrap"><button className="task-more" aria-label={`Options for ${task.title}`} disabled={task.id.startsWith("temp-")} onClick={() => setOpenMenu(openMenu === task.id ? null : task.id)}><MoreHorizontal size={19} /></button>{openMenu === task.id && <div className="task-menu"><button onClick={() => { setTaskModal(task); setOpenMenu(null); }}><Pencil size={14} /> Edit task</button><button className="delete-menu" onClick={() => setDeleteTarget({ type: "task", item: task })}><Trash2 size={14} /> Delete task</button></div>}</div>
            </div>;
          })}</div>{view === "dashboard" && filteredTasks.length > 5 && <button className="table-footer" onClick={() => navigate("tasks")}><span>Showing 5 of {filteredTasks.length} tasks</span><strong>See all tasks <ArrowRight size={14} /></strong></button>}</> : <div className="empty-state"><span className="empty-icon">{view === "completed" ? <CheckCircle2 size={23} /> : <BookOpen size={23} />}</span><strong>{search ? "No matching tasks" : view === "completed" ? "Your wins will show up here" : selectedDate ? "Nothing on the list for this day" : tab === "today" ? "Nothing due today" : "A fresh start awaits"}</strong><p>{search ? "Try another search or clear your filters." : view === "completed" ? "Check off a task and give yourself a little credit." : "There’s room to breathe. Add a task whenever you’re ready."}</p>{view !== "completed" && <button className="empty-add" onClick={() => setTaskModal("new")}><Plus size={15} /> Add a task</button>}</div>}
        </div>
      </section><div className="main-footnote"><Sparkles size={13} /> One thing at a time. You're doing great.</div>
    </main><CalendarPanel tasks={tasks} courses={courses} selectedDate={selectedDate} onSelectDate={(value) => { setView("calendar"); setSelectedDate(value); setTab("all"); setSearch(""); }} onEditTask={(task) => { if (!task.id.startsWith("temp-")) setTaskModal(task); }} onSeeAll={showUpcoming} /></div></div>
    {taskModal && <TaskModal task={taskModal === "new" ? null : taskModal} courses={courses.filter((course) => !course.id.startsWith("temp-"))} initialCourse={view === "course" ? selectedCourse : null} initialDate={view === "calendar" ? selectedDate : null} onClose={() => setTaskModal(null)} onSave={saveTask} onDelete={(task) => setDeleteTarget({ type: "task", item: task })} />}
    {courseModal && <CourseModal course={courseModal === "new" ? null : courseModal} onClose={() => setCourseModal(null)} onSave={saveCourse} onDelete={(course) => setDeleteTarget({ type: "course", item: course })} />}
    {deleteTarget && <ConfirmModal title={deleteTarget.type === "task" ? "Delete this task?" : "Delete this course?"} description={deleteTarget.type === "task" ? `“${deleteTarget.item.title}” will be permanently removed from your list.` : `“${deleteTarget.item.name}” will be removed. Its tasks will stay in your list as personal tasks.`} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
    {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} onAuth={handleAuth} />}
    {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={15} /></button></div>}
  </div>;
}
