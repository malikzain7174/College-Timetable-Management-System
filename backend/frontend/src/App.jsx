import "./App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";

import Sections from "./pages/Sections";
import Subjects from "./pages/Subjects";
import Teachers from "./pages/Teachers";
import Departments from "./pages/Departments";
import Rooms from "./pages/Rooms";
import TimeSlots from "./pages/TimeSlots";
import SectionSubjects from "./pages/SectionSubjects";
import TeachingGroups from "./pages/TeachingGroups";
import Timetable from "./pages/Timetable";
import Conflicts from "./pages/Conflicts";
import TimetableRules from "./pages/TimetableRules";
import { api, apiUrl, getSessionToken, setSessionToken } from "./config/api";
import { getSectionLookups, getAllSections } from "./services/sectionService";
import { getAllSubjects } from "./services/subjectService";
import { getAllTeachers } from "./services/teacherService";
import { getAllRooms } from "./services/roomService";
import { getAllTimeSlots } from "./services/timeSlotService";
import { getAllSectionSubjects } from "./services/sectionSubjectService";
import { getConflictSummary } from "./services/conflictService";

const pages = [
    ["/sections", "Sections", "🏫", Sections, "Set up classes and academic sessions"],
    ["/departments", "Departments", "🏢", Departments, "Organize academic departments"],
    ["/subjects", "Subjects", "📚", Subjects, "Manage subjects and practical lessons"],
    ["/teachers", "Teachers", "👥", Teachers, "Manage faculty and assignments"],
    ["/rooms", "Rooms", "🚪", Rooms, "Configure classrooms and labs"],
    ["/timeslots", "Time Slots", "🕒", TimeSlots, "Define the teaching periods"],
    ["/sectionsubjects", "Section Subjects", "📋", SectionSubjects, "Assign subjects and teachers to sections"],
    ["/teaching-groups", "Teaching Groups", "🔗", TeachingGroups, "Group sections for shared lessons"],
    ["/timetable", "Timetable", "📅", Timetable, "Preview, save and print timetables"],
    ["/conflicts", "Conflicts", "⚠️", Conflicts, "Check timetable conflicts and coverage"],
    ["/timetable-rules", "Timetable Rules", "⚙️", TimetableRules, "Set scheduling constraints"]
];

function SignIn({ onSignIn }) {
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    async function submit(event) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setError("");
        setPending(true);
        try {
            const { data } = await api.post(apiUrl("/api/auth/login"), {
                username: values.get("username"), password: values.get("password")
            });
            setSessionToken(data.token);
            onSignIn(data.user);
        } catch (failure) {
            setError(failure.response?.data?.message || "Unable to connect. Try again.");
        } finally {
            setPending(false);
        }
    }

    return (
        <main className="signin-screen">
            <section className="panel signin-card">
                <h1>College Timetable</h1>
                <p>Sign in to open your timetable workspace.</p>
                <form onSubmit={submit}>
                    <label htmlFor="signin-username">Username</label>
                    <input id="signin-username" name="username" autoComplete="username" maxLength={100} required />
                    <label htmlFor="signin-password">Password</label>
                    <input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                    {error && <p className="app-error" role="alert">{error}</p>}
                    <button className="primary-action" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
                </form>
            </section>
        </main>
    );
}

function Dashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let cancelled = false;
        api.get(apiUrl("/health"), { validateStatus: status => status === 200 || status === 503 })
            .then(response => {
                if (!cancelled) setHealth({ online: true, connected: response.status === 200 });
            })
            .catch(() => { if (!cancelled) setHealth({ online: false, connected: false }); });

        async function load() {
            try {
                const [sections, subjects, teachers, rooms, slots, assignments, lookups] = await Promise.all([
                    getAllSections(), getAllSubjects(), getAllTeachers(), getAllRooms(),
                    getAllTimeSlots(), getAllSectionSubjects(), getSectionLookups()
                ]);
                if (cancelled) return;
                const sessions = lookups.academicSessions || [];
                const current = sessions.find(session => session.IsCurrent);
                const currentSectionIds = new Set(sections.filter(section =>
                    section.IsActive && section.AcademicSessionId === current?.AcademicSessionId
                ).map(section => section.SectionId));
                const prepared = !!current && assignments.some(assignment => assignment.IsActive && currentSectionIds.has(assignment.SectionId))
                    && rooms.some(room => room.IsActive) && slots.some(slot => slot.IsActive);
                setStats({ counts: [sections.length, subjects.length, teachers.length, rooms.length], prepared, current });
                const summary = current ? await getConflictSummary(current.AcademicSessionId) : null;
                if (!cancelled) {
                    setSchedule(summary);
                    setError("");
                }
            } catch {
                if (!cancelled) {
                    setStats(null);
                    setSchedule(null);
                    setError("Unable to load dashboard data. Check the connection and retry.");
                }
            }
        }
        load();
        return () => { cancelled = true; };
    }, [reload]);

    const scheduleText = {
        ready: "Timetable ready", empty: "No timetable saved", incomplete: "Timetable incomplete", conflicts: "Conflicts need attention"
    }[schedule?.status] || (stats && !stats.current ? "Set a current academic session" : "Timetable status unavailable");

    return (
        <>
            <header className="topbar">
                <div><h1>Dashboard</h1><p>College Timetable Management System</p></div>
                <div className="user-info"><div className="user-avatar" aria-hidden="true">{user.username[0].toUpperCase()}</div>
                    <div><strong>{user.username}</strong><span>Administrator</span></div></div>
            </header>
            <section className="stats-grid" aria-label="Overview">
                {["Sections", "Subjects", "Teachers", "Rooms"].map((label, index) => (
                    <div className="stat-card" key={label}>
                        <div className="stat-icon" aria-hidden="true">{["🏫", "📚", "👥", "🚪"][index]}</div>
                        <div><span>Total {label}</span><strong>{stats?.counts[index] ?? "—"}</strong></div>
                    </div>
                ))}
            </section>
            {error && <p className="app-error" role="alert">{error} <button onClick={() => setReload(value => value + 1)}>Retry</button></p>}
            <section className="dashboard-grid">
                <div className="panel">
                    <div className="panel-header">
                        <div><h2>Timetable</h2><p>{stats?.current?.SessionName || "Manage your college timetable"}</p></div>
                        <Link className="primary-action" to="/timetable">Generate Timetable</Link>
                    </div>
                    <div className="empty-state">
                        <span className="empty-icon" aria-hidden="true">📅</span>
                        <h3>{scheduleText}</h3>
                        {schedule?.missingAssignments?.length > 0 && <p>{schedule.missingAssignments.length} subject assignments still need periods.</p>}
                    </div>
                </div>
                <div className="panel">
                    <div className="panel-header"><div><h2>System Status</h2><p>Current system information</p></div></div>
                    <div className="status-list" aria-live="polite">
                        <div className="status-item"><span>Backend API</span><strong className={health?.online ? "status-success" : "status-neutral"}>{health ? health.online ? "Online" : "Offline" : "Checking…"}</strong></div>
                        <div className="status-item"><span>Database</span><strong className={health?.connected ? "status-success" : "status-neutral"}>{health ? health.connected ? "Connected" : "Unavailable" : "Checking…"}</strong></div>
                        <div className="status-item"><span>Generator</span><strong className={stats?.prepared ? "status-success" : "status-neutral"}>{stats ? stats.prepared ? "Inputs available" : "Setup required" : "Unavailable"}</strong></div>
                        <div className="status-item"><span>Schedule check</span><strong className={schedule?.isValid ? "status-success" : "status-neutral"}>{schedule ? scheduleText : "Unavailable"}</strong></div>
                    </div>
                </div>
            </section>
            <section className="panel quick-panel">
                <div className="panel-header"><div><h2>Quick Actions</h2><p>Manage timetable setup and scheduling</p></div></div>
                <div className="quick-actions">
                    {pages.map(([path, label, icon, , description]) => (
                        <Link to={path} className="quick-action-card" key={path}>
                            <span className="quick-action-icon" aria-hidden="true">{icon}</span>
                            <span className="quick-action-text"><strong>{label}</strong><small>{description}</small></span>
                        </Link>
                    ))}
                </div>
            </section>
        </>
    );
}

const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TeacherTimetable() {
    const [entries, setEntries] = useState(null);
    const [selected, setSelected] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        api.get(apiUrl("/api/auth/timetable"))
            .then(({ data }) => {
                if (cancelled) return;
                setEntries(data);
                setSelected(String((data.find(row => row.IsCurrent) || data.at(-1))?.AcademicSessionId || ""));
            })
            .catch(failure => { if (!cancelled) setError(failure.response?.data?.message || "Unable to load your timetable."); });
        return () => { cancelled = true; };
    }, []);

    const sessions = new Map((entries || []).map(row => [row.AcademicSessionId, row.SessionName]));
    const rows = (entries || []).filter(row => String(row.AcademicSessionId) === selected);
    return (
        <section>
            <h1>My Timetable</h1>
            {error ? <p role="alert">{error}</p> : !entries ? <p role="status">Loading your timetable…</p> : (
                rows.length ? <>
                    <label htmlFor="teacher-session">Academic session</label>{" "}
                    <select id="teacher-session" value={selected} onChange={event => setSelected(event.target.value)}>
                        {[...sessions].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                    <div className="teacher-timetable-table">
                        <table>
                            <thead><tr><th>Day</th><th>Time</th><th>Section</th><th>Subject</th><th>Room</th></tr></thead>
                            <tbody>{rows.map(row => <tr key={row.TimetableEntryId}>
                                <td>{days[row.DayOfWeek]}</td><td>{row.StartTime.slice(0, 5)} – {row.EndTime.slice(0, 5)}</td>
                                <td>{row.SectionCode}</td><td>{row.SubjectName}</td><td>{row.RoomNumber}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                </> : <p>You have no scheduled lessons.</p>
            )}
        </section>
    );
}

function Workspace({ user, onSignOut }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const admin = user.role === "Admin";
    const linkClass = ({ isActive }) => isActive ? "active" : undefined;
    const closeMenu = () => setMenuOpen(false);

    return (
        <div className="app" onKeyDown={event => { if (event.key === "Escape") closeMenu(); }}>
            <header className="mobile-header">
                <Link to="/" onClick={closeMenu}>College Timetable</Link>
                <button type="button" aria-controls="workspace-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
                    {menuOpen ? "Close menu" : "Menu"}
                </button>
            </header>
            <aside id="workspace-nav" className={`sidebar${menuOpen ? " is-open" : ""}`}>
                <div className="logo"><h2>College</h2><span>Timetable System</span></div>
                <nav aria-label="Main navigation">
                    <NavLink to="/" end className={linkClass} onClick={closeMenu}>{admin ? "🏠 Dashboard" : "📅 My Timetable"}</NavLink>
                    {admin && pages.map(([path, label, icon]) => (
                        <NavLink key={path} to={path} className={linkClass} onClick={closeMenu}><span aria-hidden="true">{icon} </span>{label}</NavLink>
                    ))}
                </nav>
                <button type="button" className="sidebar-signout" onClick={onSignOut}>Sign out</button>
            </aside>
            <main className="main-content">
                <Routes>
                    <Route path="/" element={admin ? <Dashboard user={user} /> : <TeacherTimetable />} />
                    {admin && pages.map(([path, , , Page]) => <Route key={path} path={path} element={<Page />} />)}
                    <Route path="*" element={<section><h1>Page not found</h1><Link to="/">Return to {admin ? "Dashboard" : "My Timetable"}</Link></section>} />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    const [user, setUser] = useState(null);
    const [restoring, setRestoring] = useState(() => Boolean(getSessionToken()));
    const [restoreError, setRestoreError] = useState("");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const expire = () => { setUser(null); setRestoring(false); setRestoreError(""); };
        window.addEventListener("timetable-session-expired", expire);
        if (getSessionToken()) {
            api.get(apiUrl("/api/auth/me"))
                .then(({ data }) => {
                    if (!cancelled) { setUser(data); setRestoreError(""); }
                })
                .catch(error => {
                    if (!cancelled && error.response?.status !== 401) setRestoreError("Unable to check your session.");
                })
                .finally(() => { if (!cancelled) setRestoring(false); });
        }
        return () => {
            cancelled = true;
            window.removeEventListener("timetable-session-expired", expire);
        };
    }, [retry]);

    async function signOut() {
        try {
            await api.post(apiUrl("/api/auth/logout"));
        } finally {
            setSessionToken(null);
            setRestoreError("");
            setUser(null);
        }
    }

    if (restoring) return <main className="signin-screen"><p role="status">Checking your session…</p></main>;
    if (restoreError) return <main className="signin-screen"><section className="panel signin-card">
        <p role="alert">{restoreError}</p>
        <button onClick={() => { setRestoring(true); setRetry(value => value + 1); }}>Retry</button>{" "}
        <button onClick={() => { setSessionToken(null); setRestoreError(""); }}>Return to sign in</button>
    </section></main>;
    if (!user) return <SignIn onSignIn={setUser} />;
    return <BrowserRouter><Workspace user={user} onSignOut={() => signOut().catch(() => {})} /></BrowserRouter>;
}

export default App;
