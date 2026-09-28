import "./App.css";

import {
  useEffect,
  useState
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation
} from "react-router-dom";


// ==========================================
// PAGES
// ==========================================

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
// ==========================================
// SERVICES
// ==========================================

import {
  getAllSections
} from "./services/sectionService";

import {
  getAllSubjects
} from "./services/subjectService";

import {
  getAllTeachers
} from "./services/teacherService";

import {
  getAllRooms
} from "./services/roomService";


// ==========================================
// DASHBOARD
// ==========================================

function Dashboard() {

  // ========================================
  // DASHBOARD STATISTICS
  // ========================================

  const [stats, setStats] = useState({
    sections: 0,
    subjects: 0,
    teachers: 0,
    rooms: 0
  });


  const [statsLoading, setStatsLoading] =
    useState(true);


  const [statsError, setStatsError] =
    useState("");


  // ========================================
  // LOAD DASHBOARD STATISTICS
  // ========================================

  useEffect(() => {

    let cancelled = false;


    const loadDashboardStats = async () => {

      try {

        const [
          sectionsData,
          subjectsData,
          teachersData,
          roomsData
        ] = await Promise.all([
          getAllSections(),
          getAllSubjects(),
          getAllTeachers(),
          getAllRooms()
        ]);


        if (cancelled) {
          return;
        }


        setStats({

          sections:
            Array.isArray(sectionsData)
              ? sectionsData.length
              : 0,

          subjects:
            Array.isArray(subjectsData)
              ? subjectsData.length
              : 0,

          teachers:
            Array.isArray(teachersData)
              ? teachersData.length
              : 0,

          rooms:
            Array.isArray(roomsData)
              ? roomsData.length
              : 0
        });


        setStatsError("");


      } catch (error) {

        console.error(
          "Dashboard statistics error:",
          error
        );


        if (!cancelled) {

          setStatsError(
            "Unable to load dashboard statistics."
          );

        }


      } finally {

        if (!cancelled) {

          setStatsLoading(false);

        }

      }

    };


    loadDashboardStats();


    return () => {

      cancelled = true;

    };

  }, []);


  // ========================================
  // UI
  // ========================================

  return (
    <>

      {/* =====================================
          TOP BAR
      ====================================== */}

      <header className="topbar">

        <div>

          <h1>
            Dashboard
          </h1>

          <p>
            College Timetable Management System
          </p>

        </div>


        <div className="user-info">

          <div className="user-avatar">
            A
          </div>


          <div>

            <strong>
              Administrator
            </strong>

            <small>
              Admin
            </small>

          </div>

        </div>

      </header>


      {/* =====================================
          STATISTICS
      ====================================== */}

      <section className="stats-grid">


        {/* SECTIONS */}

        <div className="stat-card">

          <div className="stat-icon">
            👥
          </div>

          <div>

            <span>
              Total Sections
            </span>

            <h2>
              {statsLoading
                ? "..."
                : stats.sections
              }
            </h2>

          </div>

        </div>


        {/* SUBJECTS */}

        <div className="stat-card">

          <div className="stat-icon">
            📚
          </div>

          <div>

            <span>
              Total Subjects
            </span>

            <h2>
              {statsLoading
                ? "..."
                : stats.subjects
              }
            </h2>

          </div>

        </div>


        {/* TEACHERS */}

        <div className="stat-card">

          <div className="stat-icon">
            👨‍🏫
          </div>

          <div>

            <span>
              Total Teachers
            </span>

            <h2>
              {statsLoading
                ? "..."
                : stats.teachers
              }
            </h2>

          </div>

        </div>


        {/* ROOMS */}

        <div className="stat-card">

          <div className="stat-icon">
            🏫
          </div>

          <div>

            <span>
              Total Rooms
            </span>

            <h2>
              {statsLoading
                ? "..."
                : stats.rooms
              }
            </h2>

          </div>

        </div>

      </section>


      {/* =====================================
          STATISTICS ERROR
      ====================================== */}

      {statsError && (

        <div
          style={{
            marginBottom: "20px",
            color: "#dc2626"
          }}
        >
          {statsError}
        </div>

      )}


      {/* =====================================
          DASHBOARD MAIN PANELS
      ====================================== */}

      <section className="dashboard-grid">


        {/* TIMETABLE PANEL */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Timetable
              </h2>

              <p>
                Manage your college timetable
              </p>

            </div>


            <button
              type="button"
            >
              Generate Timetable
            </button>

          </div>


          <div className="empty-state">

            <div className="empty-icon">
              📅
            </div>

            <h3>
              Timetable Ready
            </h3>

            <p>
              Generate a timetable after configuring
              sections, subjects, teachers, rooms,
              time slots and teaching groups.
            </p>

          </div>

        </div>


        {/* SYSTEM STATUS */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                System Status
              </h2>

              <p>
                Current system information
              </p>

            </div>

          </div>


          <div className="status-list">


            <div className="status-item">

              <span>
                Backend API
              </span>

              <strong className="status-success">
                ● Online
              </strong>

            </div>


            <div className="status-item">

              <span>
                Database
              </span>

              <strong className="status-success">
                ● Connected
              </strong>

            </div>


            <div className="status-item">

              <span>
                Timetable Generator
              </span>

              <strong className="status-success">
                ● Ready
              </strong>

            </div>


            <div className="status-item">

              <span>
                Conflict Detection
              </span>

              <strong className="status-success">
                ● Ready
              </strong>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================
          QUICK ACTIONS
      ====================================== */}

      <section className="panel quick-panel">

        <div className="panel-header">

          <div>

            <h2>
              Quick Actions
            </h2>

            <p>
              Frequently used operations
            </p>

          </div>

        </div>


        <div className="quick-actions">


          {/* SECTIONS */}

          <Link
            to="/sections"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              👥
            </span>

            <span className="quick-action-text">

              <strong>
                Manage Sections
              </strong>

              <small>
                Add, edit and manage sections
              </small>

            </span>

          </Link>


          {/* SUBJECTS */}

          <Link
            to="/subjects"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              📚
            </span>

            <span className="quick-action-text">

              <strong>
                Manage Subjects
              </strong>

              <small>
                Manage subjects and departments
              </small>

            </span>

          </Link>


          {/* TEACHERS */}

          <Link
            to="/teachers"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              👨‍🏫
            </span>

            <span className="quick-action-text">

              <strong>
                Manage Teachers
              </strong>

              <small>
                Manage faculty information
              </small>

            </span>

          </Link>


          {/* ROOMS */}

          <Link
            to="/rooms"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              🏫
            </span>

            <span className="quick-action-text">

              <strong>
                Manage Rooms
              </strong>

              <small>
                Manage classrooms and labs
              </small>

            </span>

          </Link>


          {/* TIME SLOTS */}

          <Link
            to="/timeslots"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              ⏰
            </span>

            <span className="quick-action-text">

              <strong>
                Manage Time Slots
              </strong>

              <small>
                Configure timetable periods
              </small>

            </span>

          </Link>


          {/* SECTION SUBJECTS */}

          <Link
            to="/sectionsubjects"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              📖
            </span>

            <span className="quick-action-text">

              <strong>
                Section Subjects
              </strong>

              <small>
                Assign subjects and teachers
              </small>

            </span>

          </Link>


          {/* TEACHING GROUPS */}

          <Link
            to="/teaching-groups"
            className="quick-action-card"
          >

            <span className="quick-action-icon">
              🔗
            </span>

            <span className="quick-action-text">

              <strong>
                Teaching Groups
              </strong>

              <small>
                Combine sections for shared classes
              </small>

            </span>

          </Link>
           
         <Link
          to="/timetable"
          className="quick-action-card">
        <span className="quick-action-icon">
            📅
        </span>

            <span className="quick-action-text">
                       <strong>
                          Generate Timetable
                         </strong>

                 <small>
                    Generate and manage class timetable
                 </small>
               </span>
            </Link>

          {/* CONFLICTS */}

          <button
            type="button"
            className="quick-action-card quick-action-button"
          >

         <Link
    to="/conflicts"
    className="quick-action-card"
>

    <span className="quick-action-icon">
        ⚠️
    </span>

    <span className="quick-action-text">

        <strong>
            Check Conflicts
        </strong>

        <small>
            Detect timetable conflicts
        </small>

    </span>

</Link>

          </button>

        </div>

      </section>

    </>
  );
}


// ==========================================
// SIDEBAR
// ==========================================

function Sidebar() {

  const location =
    useLocation();


  // ========================================
  // ACTIVE ROUTE HELPER
  // ========================================

  const isActive = (path) => {

    return (
      location.pathname === path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );

  };


  return (

    <aside className="sidebar">


      {/* =====================================
          LOGO
      ====================================== */}

      <div className="logo">

        <h2>
          College
        </h2>

        <span>
          Timetable System
        </span>

      </div>


      {/* =====================================
          NAVIGATION
      ====================================== */}

      <nav>


        {/* DASHBOARD */}

        <Link
          className={
            location.pathname === "/"
              ? "active"
              : ""
          }
          to="/"
        >
          🏠 Dashboard
        </Link>


        {/* SECTIONS */}

        <Link
          className={
            isActive("/sections")
              ? "active"
              : ""
          }
          to="/sections"
        >
          👥 Sections
        </Link>
       <Link
    className={
        isActive("/departments")
            ? "active"
            : ""
    }
    to="/departments">
    🏢 Departments
    </Link>

        {/* SUBJECTS */}

        <Link
          className={
            isActive("/subjects")
              ? "active"
              : ""
          }
          to="/subjects"
        >
          📚 Subjects
        </Link>


        {/* TEACHERS */}

        <Link
          className={
            isActive("/teachers")
              ? "active"
              : ""
          }
          to="/teachers"
        >
          👨‍🏫 Teachers
        </Link>


        {/* ROOMS */}

        <Link
          className={
            isActive("/rooms")
              ? "active"
              : ""
          }
          to="/rooms"
        >
          🏫 Rooms
        </Link>


        {/* TIME SLOTS */}

        <Link
          className={
            isActive("/timeslots")
              ? "active"
              : ""
          }
          to="/timeslots"
        >
          ⏰ Time Slots
        </Link>


        {/* SECTION SUBJECTS */}

        <Link
          className={
            isActive("/sectionsubjects")
              ? "active"
              : ""
          }
          to="/sectionsubjects"
        >
          📖 Section Subjects
        </Link>


        {/* TEACHING GROUPS */}

        <Link
          className={
            isActive("/teaching-groups")
              ? "active"
              : ""
          }
          to="/teaching-groups"
        >
          🔗 Teaching Groups
        </Link>


        {/* =====================================
            FUTURE MODULES
        ====================================== */}

     <Link
               className={
             isActive("/timetable")
                ? "active"
               : ""}
              to="/timetable">
              📅 Timetable
    </Link>


        <Link
    className={
        isActive("/conflicts")
            ? "active"
            : ""
            }
           to="/conflicts">
           ⚠️ Conflicts
        </Link>
      <Link
    className={
        isActive("/timetable-rules")
            ? "active"
            : ""
    }
    to="/timetable-rules">
    ⚙️ Timetable Rules

   </Link>

      </nav>

    </aside>
  );
}


// ==========================================
// MAIN APP
// ==========================================

function App() {

  return (

    <BrowserRouter>

      <div className="app">


        {/* SIDEBAR */}

        <Sidebar />


        {/* MAIN CONTENT */}

        <main className="main-content">

          <Routes>


            {/* DASHBOARD */}

            <Route
              path="/"
              element={
                <Dashboard />
              }
            />


            {/* SECTIONS */}

            <Route
              path="/sections"
              element={
                <Sections />
              }
            />


            {/* SUBJECTS */}

            <Route
              path="/subjects"
              element={
                <Subjects />
              }
            />


            {/* TEACHERS */}

            <Route
              path="/teachers"
              element={
                <Teachers />
              }
            />


            {/* ROOMS */}

            <Route
              path="/rooms"
              element={
                <Rooms />
              }
            />


            {/* TIME SLOTS */}

            <Route
              path="/timeslots"
              element={
                <TimeSlots />
              }
            />


            {/* SECTION SUBJECTS */}

            <Route
              path="/sectionsubjects"
              element={
                <SectionSubjects />
              }
            />


            {/* TEACHING GROUPS */}

            <Route
              path="/teaching-groups"
              element={
                <TeachingGroups />
              }
            />
            <Route
             path="/timetable"
             element={<Timetable />} />
             <Route
              path="/conflicts"
               element={
        <Conflicts />
    }
/>      <Route
    path="/departments"
    element={
        <Departments />
    }
/>
<Route
    path="/timetable-rules"
    element={
        <TimetableRules />
    }
/>
          </Routes>

        </main>

      </div>

    </BrowserRouter>
  );
}


export default App;