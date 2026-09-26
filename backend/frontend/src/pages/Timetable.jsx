import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import { getAllSections } from "../services/sectionService";
import { getAllSectionSubjects } from "../services/sectionSubjectService";
import { getAllRooms } from "../services/roomService";
import { getAllTimeSlots } from "../services/timeSlotService";
import {
  getTimetableEntriesBySession,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry
} from "../services/timetableEntryService";
import {
  generateTimetable,
  deleteGeneratedTimetable
} from "../services/timetableGeneratorService";
import "./Timetable.css";

const COLLEGE_NAME = "FEDERAL COLLEGE OF SCIENCE & COMMERCE ATTOCK CANTT";

const DAYS = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday"
};

const DAY_SHORT = {
  1: "M",
  2: "T",
  3: "W",
  4: "TH",
  5: "F",
  6: "SAT",
  7: "SUN"
};

const EMPTY_FORM = {
  SectionSubjectId: "",
  RoomId: "",
  TimeSlotId: "",
  ClassType: "Regular",
  Notes: ""
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const formatTime = (value) => (value ? String(value).slice(0, 5) : "");

const compactDays = (values) => {
  const days = [...new Set(values.map(Number).filter((d) => DAYS[d]))].sort((a, b) => a - b);
  if (days.length === 6 && [1, 2, 3, 4, 5, 6].every((d) => days.includes(d))) return "MON-SAT";
  return days.map((d) => DAY_SHORT[d]).join("-");
};

function Timetable() {
  const [sections, setSections] = useState([]);
  const [sectionSubjects, setSectionSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [entries, setEntries] = useState([]);

  const [selectedSession, setSelectedSession] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sectionData, mappingData, roomData, slotData] = await Promise.all([
          getAllSections(),
          getAllSectionSubjects(),
          getAllRooms(),
          getAllTimeSlots()
        ]);

        if (cancelled) return;

        const safeSections = asArray(sectionData);
        setSections(safeSections);
        setSectionSubjects(asArray(mappingData));
        setRooms(asArray(roomData));
        setTimeSlots(asArray(slotData));

        const sessions = [...new Set(
          safeSections
            .map((s) => Number(s.AcademicSessionId))
            .filter((id) => Number.isInteger(id) && id > 0)
        )].sort((a, b) => a - b);

        if (sessions.length) setSelectedSession(String(sessions[0]));
      } catch (error) {
        console.error("Load timetable base data error:", error);
        alert(error.response?.data?.message || "Failed to load timetable data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSession) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const data = await getTimetableEntriesBySession(Number(selectedSession));
        if (!cancelled) setEntries(asArray(data));
      } catch (error) {
        if (!cancelled) {
          console.error("Load session timetable error:", error);
          setEntries([]);
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSession]);

  const sessionOptions = useMemo(() => {
    const map = new Map();

    sections.forEach((section) => {
      const id = Number(section.AcademicSessionId);
      if (!Number.isInteger(id) || id <= 0 || map.has(id)) return;

      map.set(id, {
        id,
        name: section.SessionName || `Academic Session ${id}`
      });
    });

    return [...map.values()].sort((a, b) => a.id - b.id);
  }, [sections]);

  const sessionName = useMemo(
    () =>
      sessionOptions.find((x) => Number(x.id) === Number(selectedSession))?.name ||
      (selectedSession ? `Academic Session ${selectedSession}` : "Academic Session"),
    [sessionOptions, selectedSession]
  );

  const sectionMap = useMemo(
    () => new Map(sections.map((section) => [Number(section.SectionId), section])),
    [sections]
  );

  const sessionSections = useMemo(
    () =>
      sections
        .filter((section) => Number(section.AcademicSessionId) === Number(selectedSession))
        .sort((a, b) =>
          String(a.SectionCode || a.SectionName || "").localeCompare(
            String(b.SectionCode || b.SectionName || "")
          )
        ),
    [sections, selectedSession]
  );

  const availableMappings = useMemo(
    () =>
      sectionSubjects
        .filter((mapping) => {
          const section = sectionMap.get(Number(mapping.SectionId));
          return (
            section &&
            Number(section.AcademicSessionId) === Number(selectedSession) &&
            mapping.IsActive
          );
        })
        .sort((a, b) =>
          String(a.SectionCode || "").localeCompare(String(b.SectionCode || "")) ||
          String(a.SubjectName || "").localeCompare(String(b.SubjectName || ""))
        ),
    [sectionSubjects, sectionMap, selectedSession]
  );

  const selectedMapping = availableMappings.find(
    (mapping) => Number(mapping.SectionSubjectId) === Number(formData.SectionSubjectId)
  );

  const selectedSection = selectedMapping
    ? sectionMap.get(Number(selectedMapping.SectionId))
    : null;

  const availableRooms = rooms.filter((room) => {
    if (!room.IsActive) return false;
    if (!selectedSection) return true;

    return (
      Number(room.CampusId) === Number(selectedSection.CampusId) &&
      Number(room.Capacity) >= Number(selectedSection.StudentCount || 0)
    );
  });

  const slotsByDay = useMemo(() => {
    const map = new Map();

    timeSlots
      .filter((slot) => slot.IsActive !== false)
      .forEach((slot) => {
        const day = Number(slot.DayOfWeek);
        if (!map.has(day)) map.set(day, []);
        map.get(day).push(slot);
      });

    for (const [day, list] of map) {
      map.set(
        day,
        list.sort((a, b) =>
          String(a.StartTime || "").localeCompare(String(b.StartTime || ""))
        )
      );
    }

    return map;
  }, [timeSlots]);

  const activeDays = useMemo(() => {
    const entryDays = [...new Set(entries.map((e) => Number(e.DayOfWeek)).filter((d) => DAYS[d]))]
      .sort((a, b) => a - b);

    if (entryDays.length) return entryDays;

    return [...slotsByDay.keys()].filter((d) => DAYS[d]).sort((a, b) => a - b);
  }, [entries, slotsByDay]);

  const maxPeriods = useMemo(() => {
    let max = 0;
    for (const list of slotsByDay.values()) max = Math.max(max, list.length);
    return max;
  }, [slotsByDay]);

  const periodIndexes = useMemo(
    () => Array.from({ length: maxPeriods }, (_, index) => index + 1),
    [maxPeriods]
  );

  const getPeriodIndex = useCallback(
    (entry) => {
        const list =
            slotsByDay.get(Number(entry.DayOfWeek)) || [];

        let index = list.findIndex(
            (slot) =>
                Number(slot.TimeSlotId) ===
                Number(entry.TimeSlotId)
        );

        if (index < 0) {
            index = list.findIndex(
                (slot) =>
                    formatTime(slot.StartTime) ===
                    formatTime(entry.StartTime)
            );
        }

        return index >= 0 ? index + 1 : null;
    },
    [slotsByDay]
);

  const getTimeForPeriod = (period, preferredDay) => {
    const preferred = (slotsByDay.get(preferredDay) || [])[period - 1];

    if (preferred) {
      return `${formatTime(preferred.StartTime)}-${formatTime(preferred.EndTime)}`;
    }

    for (const day of activeDays) {
      const slot = (slotsByDay.get(day) || [])[period - 1];
      if (slot) return `${formatTime(slot.StartTime)}-${formatTime(slot.EndTime)}`;
    }

    return "—";
  };

  const campusOptions = useMemo(
    () =>
      [...new Set(
        sessionSections
          .map((s) => s.CampusName || (s.CampusId ? `Campus ${s.CampusId}` : ""))
          .filter(Boolean)
      )].sort(),
    [sessionSections]
  );

  const yearOptions = useMemo(
    () =>
      [...new Set(
        sessionSections
          .map((s) => s.YearName || (s.ClassYearId ? `Class Year ${s.ClassYearId}` : ""))
          .filter(Boolean)
      )].sort(),
    [sessionSections]
  );

  const filteredReportSections = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();

    return sessionSections.filter((section) => {
      const campus =
        section.CampusName || (section.CampusId ? `Campus ${section.CampusId}` : "");
      const year =
        section.YearName || (section.ClassYearId ? `Class Year ${section.ClassYearId}` : "");

      const text = [
        section.SectionCode,
        section.SectionName,
        section.ProgramName,
        campus,
        year
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (!campusFilter || campus === campusFilter) &&
        (!yearFilter || year === yearFilter)
      );
    });
  }, [sessionSections, reportSearch, campusFilter, yearFilter]);

  const classReportGroups = useMemo(() => {
    const map = new Map();

    filteredReportSections.forEach((section) => {
      const campus =
        section.CampusName || (section.CampusId ? `Campus ${section.CampusId}` : "Campus");
      const year =
        section.YearName ||
        (section.ClassYearId ? `Class Year ${section.ClassYearId}` : "Class Year");
      const key = `${campus}||${year}`;

      if (!map.has(key)) map.set(key, { key, campus, year, sections: [] });
      map.get(key).sections.push(section);
    });

    return [...map.values()].sort((a, b) =>
      `${a.campus} ${a.year}`.localeCompare(`${b.campus} ${b.year}`)
    );
  }, [filteredReportSections]);

  const getClassCellGroups = (sectionId, period) => {
    const map = new Map();

    entries
      .filter(
        (entry) =>
          Number(entry.SectionId) === Number(sectionId) &&
          getPeriodIndex(entry) === period
      )
      .forEach((entry) => {
        const key = [
          entry.SubjectId || entry.SubjectCode || entry.SubjectName,
          entry.TeacherId || entry.TeacherName,
          entry.RoomId || entry.RoomNumber,
          entry.ClassType
        ].join("|");

        if (!map.has(key)) {
          map.set(key, {
            key,
            days: [],
            subjectCode: entry.SubjectCode,
            subjectName: entry.SubjectName,
            teacherName: entry.TeacherName,
            roomNumber: entry.RoomNumber,
            classType: entry.ClassType
          });
        }

        map.get(key).days.push(Number(entry.DayOfWeek));
      });

    return [...map.values()].sort(
      (a, b) => Math.min(...a.days) - Math.min(...b.days)
    );
  };

  const teacherReportRows = useMemo(() => {
    const map = new Map();

    entries.forEach((entry) => {
      const teacherId = Number(entry.TeacherId);
      if (!Number.isInteger(teacherId)) return;

      if (!map.has(teacherId)) {
        map.set(teacherId, {
          teacherId,
          teacherName: entry.TeacherName || `Teacher ${teacherId}`,
          subjectLabels: new Set(),
          entries: []
        });
      }

      const row = map.get(teacherId);
      row.entries.push(entry);

      const subject = entry.SubjectName || entry.SubjectCode;
      if (subject) row.subjectLabels.add(subject);
    });

    const query = reportSearch.trim().toLowerCase();

    return [...map.values()]
      .map((row) => {
        const occupiedPeriods = new Set(
          row.entries.map(getPeriodIndex).filter(Boolean)
        );

        const weeklyLectureKeys = new Set(
          row.entries.map((entry) =>
            [
              entry.DayOfWeek,
              entry.TimeSlotId,
              entry.SubjectId || entry.SubjectCode,
              entry.RoomId || entry.RoomNumber
            ].join("|")
          )
        );

        return {
          ...row,
          subjectText: [...row.subjectLabels].sort().join(" / "),
          totalPeriods: occupiedPeriods.size,
          weeklyLectures: weeklyLectureKeys.size
        };
      })
      .filter((row) =>
        !query ||
        `${row.teacherName} ${row.subjectText}`.toLowerCase().includes(query)
      )
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [entries, reportSearch, getPeriodIndex]);

  const getTeacherCellGroups = (teacherId, period) => {
    const physical = new Map();

    entries
      .filter(
        (entry) =>
          Number(entry.TeacherId) === Number(teacherId) &&
          getPeriodIndex(entry) === period
      )
      .forEach((entry) => {
        const lectureKey = [
          entry.DayOfWeek,
          entry.TimeSlotId,
          entry.SubjectId || entry.SubjectCode || entry.SubjectName,
          entry.RoomId || entry.RoomNumber,
          entry.ClassType
        ].join("|");

        if (!physical.has(lectureKey)) {
          physical.set(lectureKey, {
            day: Number(entry.DayOfWeek),
            subjectCode: entry.SubjectCode,
            subjectName: entry.SubjectName,
            roomNumber: entry.RoomNumber,
            classType: entry.ClassType,
            sections: new Set()
          });
        }

        physical
          .get(lectureKey)
          .sections.add(
            entry.SectionCode || entry.SectionName || `Section ${entry.SectionId}`
          );
      });

    const grouped = new Map();

    for (const lecture of physical.values()) {
      const sectionList = [...lecture.sections].sort();
      const key = [
        lecture.subjectCode || lecture.subjectName,
        lecture.roomNumber,
        lecture.classType,
        sectionList.join("+")
      ].join("|");

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          days: [],
          subjectCode: lecture.subjectCode,
          subjectName: lecture.subjectName,
          roomNumber: lecture.roomNumber,
          classType: lecture.classType,
          sectionList
        });
      }

      grouped.get(key).days.push(lecture.day);
    }

    return [...grouped.values()].sort(
      (a, b) => Math.min(...a.days) - Math.min(...b.days)
    );
  };

  const summary = useMemo(
    () => ({
      entries: entries.length,
      sections: new Set(entries.map((e) => Number(e.SectionId))).size,
      teachers: new Set(entries.map((e) => Number(e.TeacherId))).size,
      common: entries.filter((e) => e.ClassType === "Common").length
    }),
    [entries]
  );

  const refreshTimetable = async () => {
    if (!selectedSession) return;

    setSessionLoading(true);

    try {
      const data = await getTimetableEntriesBySession(Number(selectedSession));
      setEntries(asArray(data));
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSessionChange = (event) => {
    setSessionLoading(true);
    setSelectedSession(event.target.value);
    setSearch("");
    setDayFilter("");
    setReportSearch("");
    setCampusFilter("");
    setYearFilter("");
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "SectionSubjectId") {
      const mapping = availableMappings.find(
        (item) => Number(item.SectionSubjectId) === Number(value)
      );
      const section = mapping ? sectionMap.get(Number(mapping.SectionId)) : null;

      setFormData((previous) => ({
        ...previous,
        SectionSubjectId: value,
        RoomId: section?.DefaultRoomId ? String(section.DefaultRoomId) : "",
        TimeSlotId: ""
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (entry) => {
    setEditingId(entry.TimetableEntryId);

    setFormData({
      SectionSubjectId: String(entry.SectionSubjectId),
      RoomId: String(entry.RoomId),
      TimeSlotId: String(entry.TimeSlotId),
      ClassType: entry.ClassType || "Regular",
      Notes: entry.Notes || ""
    });

    setShowForm(true);
    setViewMode("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedSession) {
      alert("Select Academic Session.");
      return;
    }

    if (!formData.SectionSubjectId || !formData.RoomId || !formData.TimeSlotId) {
      alert("Section Subject, Room and Time Slot are required.");
      return;
    }

    const payload = {
      SectionSubjectId: Number(formData.SectionSubjectId),
      RoomId: Number(formData.RoomId),
      TimeSlotId: Number(formData.TimeSlotId),
      AcademicSessionId: Number(selectedSession),
      ClassType: formData.ClassType.trim(),
      Notes: formData.Notes.trim()
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateTimetableEntry(editingId, payload);
        alert("Timetable entry updated successfully.");
      } else {
        await createTimetableEntry(payload);
        alert("Timetable entry added successfully.");
      }

      resetForm();
      await refreshTimetable();
    } catch (error) {
      console.error("Save timetable error:", error);
      alert(error.response?.data?.message || "Failed to save timetable entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Delete this timetable entry?")) return;

    try {
      await deleteTimetableEntry(id);
      await refreshTimetable();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete entry.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedSession) {
      alert("Select Academic Session first.");
      return;
    }

    if (
      clearExisting &&
      entries.length > 0 &&
      !window.confirm("Existing timetable for this session will be replaced. Continue?")
    ) {
      return;
    }

    try {
      setGenerating(true);

      const result = await generateTimetable(
        Number(selectedSession),
        clearExisting
      );

      const info = result.data;

      await refreshTimetable();
      setViewMode("class");

      alert(
        `Timetable generated successfully.\nEntries: ${info.totalGenerated}\nUnscheduled tasks: ${info.unscheduledCount}\n\nClass Wise report is ready.`
      );
    } catch (error) {
      console.error("Generate timetable error:", error);
      alert(error.response?.data?.message || "Failed to generate timetable.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedSession || entries.length === 0) return;

    if (!window.confirm("Delete the complete timetable for this Academic Session?")) {
      return;
    }

    try {
      await deleteGeneratedTimetable(Number(selectedSession));
      setEntries([]);
      setViewMode("list");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete timetable.");
    }
  };

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const text =
        `${entry.SectionCode || ""} ${entry.SectionName || ""} ${entry.SubjectCode || ""} ${entry.SubjectName || ""} ${entry.TeacherName || ""} ${entry.RoomNumber || ""}`
          .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (!dayFilter || Number(entry.DayOfWeek) === Number(dayFilter))
      );
    });
  }, [entries, search, dayFilter]);

  const regularHeaderDay =
    activeDays.find((day) => day !== 5) || activeDays[0] || 1;

  const renderPeriodHeaders = () => {
    const cells = [];

    periodIndexes.forEach((period) => {
      cells.push(
        <th key={`period-${period}`} className="tt-report-period-head">
          {period}
        </th>
      );

      if (period === 3 && periodIndexes.length > 3) {
        cells.push(
          <th key="break" className="tt-report-break-head">
            BREAK
          </th>
        );
      }
    });

    return cells;
  };

  const renderTimeHeaders = (label, day) => {
    const cells = [];

    periodIndexes.forEach((period) => {
      cells.push(
        <th key={`${label}-${period}`}>
          {getTimeForPeriod(period, day)}
        </th>
      );

      if (period === 3 && periodIndexes.length > 3) {
        cells.push(
          <th key={`${label}-break`} className="tt-report-break-time">
            —
          </th>
        );
      }
    });

    return cells;
  };

  return (
    <div className="timetable-page">

      <div className="tt-hero">
        <div className="tt-hero-copy">
          <span className="tt-eyebrow">College Scheduling</span>
          <h1>Timetable</h1>
          <p>
            Generate, review and print complete class-wise and teacher-wise timetables.
          </p>
        </div>

        <div className="tt-hero-actions">
          <button
            type="button"
            className="tt-soft-btn"
            onClick={refreshTimetable}
            disabled={!selectedSession || sessionLoading}
          >
            ↻ Refresh
          </button>

          <button type="button" className="tt-add-btn" onClick={handleAdd}>
            + Manual Entry
          </button>
        </div>
      </div>


      <div className="tt-summary-grid">
        {[
          ["📚", "Timetable Entries", summary.entries],
          ["🏫", "Scheduled Classes", summary.sections],
          ["👨‍🏫", "Scheduled Teachers", summary.teachers],
          ["🔗", "Common Rows", summary.common]
        ].map(([icon, label, value]) => (
          <div className="tt-summary-card" key={label}>
            <span className="tt-summary-icon">{icon}</span>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>


      <div className="tt-generator-card">
        <div className="tt-generator-top">
          <div>
            <span className="tt-card-kicker">Generator</span>
            <h2>Build Session Timetable</h2>
          </div>

          <span className={entries.length ? "tt-ready-pill ready" : "tt-ready-pill"}>
            {entries.length ? "● Timetable Ready" : "○ No Timetable"}
          </span>
        </div>

        <div className="tt-generator-controls">
          <div className="tt-field tt-session-field">
            <label>Academic Session</label>

            <select value={selectedSession} onChange={handleSessionChange}>
              <option value="">Select Academic Session</option>
              {sessionOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <label className="tt-checkbox">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(event) => setClearExisting(event.target.checked)}
            />
            <span>Replace existing timetable</span>
          </label>

          <button
            type="button"
            className="tt-generate-btn"
            onClick={handleGenerate}
            disabled={generating || !selectedSession}
          >
            {generating ? "Generating..." : "⚡ Generate Timetable"}
          </button>

          <button
            type="button"
            className="tt-delete-all-btn"
            onClick={handleDeleteAll}
            disabled={entries.length === 0}
          >
            Delete Session
          </button>
        </div>
      </div>


      {showForm && (
        <div className="tt-form-card">
          <div className="tt-form-header">
            <div>
              <span className="tt-card-kicker">Manual Scheduling</span>
              <h2>{editingId ? "Edit Timetable Entry" : "Add Timetable Entry"}</h2>
            </div>

            <button type="button" className="tt-close-btn" onClick={resetForm}>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tt-form-grid">
              <div className="tt-field">
                <label>Section Subject *</label>

                <select
                  name="SectionSubjectId"
                  value={formData.SectionSubjectId}
                  onChange={handleChange}
                >
                  <option value="">Select Section / Subject</option>
                  {availableMappings.map((mapping) => (
                    <option
                      key={mapping.SectionSubjectId}
                      value={mapping.SectionSubjectId}
                    >
                      {mapping.SectionCode || mapping.SectionName}
                      {" — "}
                      {mapping.SubjectCode}
                      {" — "}
                      {mapping.SubjectName}
                      {" / "}
                      {mapping.TeacherName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tt-field">
                <label>Room *</label>

                <select
                  name="RoomId"
                  value={formData.RoomId}
                  onChange={handleChange}
                >
                  <option value="">Select Room</option>
                  {availableRooms.map((room) => (
                    <option key={room.RoomId} value={room.RoomId}>
                      {room.RoomNumber}
                      {room.RoomName ? ` — ${room.RoomName}` : ""}
                      {` — Capacity ${room.Capacity}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tt-field">
                <label>Time Slot *</label>

                <select
                  name="TimeSlotId"
                  value={formData.TimeSlotId}
                  onChange={handleChange}
                >
                  <option value="">Select Time Slot</option>

                  {timeSlots
                    .filter((slot) => slot.IsActive !== false)
                    .sort(
                      (a, b) =>
                        Number(a.DayOfWeek) - Number(b.DayOfWeek) ||
                        String(a.StartTime || "").localeCompare(String(b.StartTime || ""))
                    )
                    .map((slot) => (
                      <option key={slot.TimeSlotId} value={slot.TimeSlotId}>
                        {DAYS[slot.DayOfWeek]}
                        {" — "}
                        {formatTime(slot.StartTime)}
                        {" to "}
                        {formatTime(slot.EndTime)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="tt-field">
                <label>Class Type *</label>

                <select
                  name="ClassType"
                  value={formData.ClassType}
                  onChange={handleChange}
                >
                  <option value="Regular">Regular</option>
                  <option value="Practical">Practical</option>
                  <option value="Common">Common</option>
                </select>
              </div>

              <div className="tt-field tt-notes">
                <label>Notes</label>
                <textarea
                  name="Notes"
                  maxLength={500}
                  value={formData.Notes}
                  onChange={handleChange}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="tt-form-actions">
              <button type="button" className="tt-cancel-btn" onClick={resetForm}>
                Cancel
              </button>

              <button type="submit" className="tt-save-btn" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </form>
        </div>
      )}


      <div className="tt-view-card">
        <div className="tt-view-tabs">
          <button
            type="button"
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            ☷ List View
          </button>

          <button
            type="button"
            className={viewMode === "class" ? "active" : ""}
            onClick={() => setViewMode("class")}
          >
            🏫 Class Wise
          </button>

          <button
            type="button"
            className={viewMode === "teacher" ? "active" : ""}
            onClick={() => setViewMode("teacher")}
          >
            👨‍🏫 Teacher Wise
          </button>
        </div>

        {viewMode !== "list" && (
          <button
            type="button"
            className="tt-print-btn"
            onClick={() => window.print()}
            disabled={entries.length === 0}
          >
            🖨 Print / Save PDF
          </button>
        )}
      </div>


      {viewMode === "list" && (
        <>
          <div className="tt-toolbar">
            <div className="tt-search-wrap">
              <span>⌕</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search section, subject, teacher or room..."
              />
            </div>

            <select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
              <option value="">All Days</option>
              {Object.entries(DAYS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <span className="tt-entry-count">
              Entries: <strong>{filteredEntries.length}</strong>
            </span>
          </div>

          <div className="tt-table-card">
            {loading || sessionLoading ? (
              <div className="tt-message">
                <div className="tt-loader" />
                Loading timetable...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="tt-message">
                <div className="tt-empty-icon">📅</div>
                <h3>No Timetable Entries</h3>
                <p>Generate the timetable or add an entry manually.</p>
              </div>
            ) : (
              <div className="tt-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Section</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Room</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.TimetableEntryId}>
                        <td>
                          <strong>{DAYS[entry.DayOfWeek]}</strong>
                        </td>

                        <td className="tt-time-cell">
                          {formatTime(entry.StartTime)} — {formatTime(entry.EndTime)}
                        </td>

                        <td>
                          <span className="tt-section-pill">
                            {entry.SectionCode || entry.SectionName}
                          </span>
                        </td>

                        <td>
                          <strong>{entry.SubjectCode}</strong>
                          <div className="tt-secondary">{entry.SubjectName}</div>
                        </td>

                        <td>{entry.TeacherName}</td>

                        <td>
                          <strong>{entry.RoomNumber}</strong>
                          {entry.RoomName && (
                            <div className="tt-secondary">{entry.RoomName}</div>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              entry.ClassType === "Common"
                                ? "tt-type common"
                                : entry.ClassType === "Practical"
                                  ? "tt-type practical"
                                  : "tt-type"
                            }
                          >
                            {entry.ClassType}
                          </span>
                        </td>

                        <td>
                          <div className="tt-actions">
                            <button
                              type="button"
                              className="tt-edit-btn"
                              onClick={() => handleEdit(entry)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="tt-delete-btn"
                              onClick={() => handleDeleteEntry(entry.TimetableEntryId)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}


      {viewMode !== "list" && (
        <div className="tt-report-toolbar">
          <div className="tt-search-wrap">
            <span>⌕</span>
            <input
              type="text"
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder={
                viewMode === "class"
                  ? "Search class, program, campus..."
                  : "Search teacher or subject..."
              }
            />
          </div>

          {viewMode === "class" && (
            <>
              <select
                value={campusFilter}
                onChange={(event) => setCampusFilter(event.target.value)}
              >
                <option value="">All Campuses</option>
                {campusOptions.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
              >
                <option value="">All Class Years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="tt-report-hint">
            {viewMode === "class"
              ? `${filteredReportSections.length} classes`
              : `${teacherReportRows.length} teachers`}
          </div>
        </div>
      )}


      {viewMode === "class" && (
        <div className="tt-print-root">
          {sessionLoading ? (
            <div className="tt-message">Loading class-wise timetable...</div>
          ) : entries.length === 0 ? (
            <div className="tt-message">
              <div className="tt-empty-icon">🏫</div>
              <h3>Class-wise report is empty</h3>
              <p>Generate a timetable first.</p>
            </div>
          ) : classReportGroups.length === 0 ? (
            <div className="tt-message">
              No classes match the selected report filters.
            </div>
          ) : (
            classReportGroups.map((group) => (
              <section className="tt-report-sheet" key={group.key}>
                <div className="tt-report-heading">
                  <div className="tt-report-logo">FC</div>

                  <div>
                    <h2>{COLLEGE_NAME}</h2>
                    <h3>
                      TIME TABLE FOR {String(group.year).toUpperCase()}
                      {" — "}
                      {String(group.campus).toUpperCase()}
                    </h3>
                    <p>{sessionName}</p>
                  </div>
                </div>

                <div className="tt-report-table-wrap">
                  <table className="tt-report-table tt-class-report-table">
                    <thead>
                      <tr>
                        <th className="tt-report-label-col">LEC</th>
                        {renderPeriodHeaders()}
                      </tr>

                      <tr>
                        <th className="tt-report-label-col">MON-SAT</th>
                        {renderTimeHeaders("regular", regularHeaderDay)}
                      </tr>

                      {slotsByDay.has(5) && (
                        <tr>
                          <th className="tt-report-label-col">FRI</th>
                          {renderTimeHeaders("friday", 5)}
                        </tr>
                      )}
                    </thead>

                    <tbody>
                      {group.sections.map((section) => (
                        <tr key={section.SectionId}>
                          <th className="tt-class-name-cell">
                            <strong>{section.SectionCode || section.SectionName}</strong>

                            {section.ProgramName && (
                              <small>{section.ProgramName}</small>
                            )}

                            {section.DefaultRoomNumber && (
                              <span>Room {section.DefaultRoomNumber}</span>
                            )}
                          </th>

                          {periodIndexes.map((period) => {
                            const cellGroups = getClassCellGroups(
                              section.SectionId,
                              period
                            );

                            return (
                              <Fragment
                                key={`class-period-${section.SectionId}-${period}`}
                              >
                                <td className="tt-report-content-cell">
                                  {cellGroups.length === 0 ? (
                                    <span className="tt-report-dash">—</span>
                                  ) : (
                                    cellGroups.map((item) => (
                                      <div className="tt-cell-block" key={item.key}>
                                        <span className="tt-cell-days">
                                          {compactDays(item.days)}
                                        </span>

                                        <strong>
                                          {item.subjectName || item.subjectCode}
                                        </strong>

                                        <small>{item.teacherName}</small>

                                        {item.roomNumber && (
                                          <em>
                                            {item.roomNumber}
                                            {item.classType === "Common"
                                              ? " • Common"
                                              : ""}
                                          </em>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </td>

                                {period === 3 && periodIndexes.length > 3 && (
                                  <td className="tt-report-break-cell">
                                    <span>
                                      B<br />R<br />E<br />A<br />K
                                    </span>
                                  </td>
                                )}
                              </Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="tt-report-footer">
                  <span>Generated from College Timetable Management System</span>
                  <strong>PRINCIPAL: ____________________</strong>
                </div>
              </section>
            ))
          )}
        </div>
      )}


      {viewMode === "teacher" && (
        <div className="tt-print-root">
          {sessionLoading ? (
            <div className="tt-message">Loading teacher-wise timetable...</div>
          ) : entries.length === 0 ? (
            <div className="tt-message">
              <div className="tt-empty-icon">👨‍🏫</div>
              <h3>Teacher-wise report is empty</h3>
              <p>Generate a timetable first.</p>
            </div>
          ) : (
            <section className="tt-report-sheet">
              <div className="tt-report-heading">
                <div className="tt-report-logo">FC</div>

                <div>
                  <h2>{COLLEGE_NAME}</h2>
                  <h3>TEACHER WISE TIMETABLE</h3>
                  <p>{sessionName}</p>
                </div>
              </div>

              <div className="tt-report-table-wrap">
                <table className="tt-report-table tt-teacher-report-table">
                  <thead>
                    <tr>
                      <th rowSpan="3">SR.</th>
                      <th rowSpan="3">TEACHER NAME</th>
                      <th rowSpan="3">SUBJECT</th>
                      {renderPeriodHeaders()}
                      <th rowSpan="3">
                        TOTAL
                        <br />
                        LECTURE
                        <br />
                        SLOTS
                      </th>
                    </tr>

                    <tr>
                      {renderTimeHeaders("teacher-regular", regularHeaderDay)}
                    </tr>

                    <tr>
                      {renderTimeHeaders("teacher-friday", 5)}
                    </tr>
                  </thead>

                  <tbody>
                    {teacherReportRows.map((teacher, index) => (
                      <tr key={teacher.teacherId}>
                        <td className="tt-teacher-sr">{index + 1}</td>

                        <th className="tt-teacher-name">
                          {teacher.teacherName}
                        </th>

                        <td className="tt-teacher-subjects">
                          {teacher.subjectText}
                        </td>

                        {periodIndexes.map((period) => {
                          const cellGroups = getTeacherCellGroups(
                            teacher.teacherId,
                            period
                          );

                          return (
                            <Fragment
                              key={`teacher-period-${teacher.teacherId}-${period}`}
                            >
                              <td className="tt-report-content-cell">
                                {cellGroups.length === 0 ? (
                                  <span className="tt-report-dash">—</span>
                                ) : (
                                  cellGroups.map((item) => (
                                    <div className="tt-cell-block" key={item.key}>
                                      <span className="tt-cell-days">
                                        {compactDays(item.days)}
                                      </span>

                                      <strong>
                                        {item.sectionList.join(" + ")}
                                      </strong>

                                      <small>
                                        {item.subjectName || item.subjectCode}
                                      </small>

                                      {item.roomNumber && (
                                        <em>
                                          {item.roomNumber}
                                          {item.classType === "Common"
                                            ? " • Common"
                                            : ""}
                                        </em>
                                      )}
                                    </div>
                                  ))
                                )}
                              </td>

                              {period === 3 && periodIndexes.length > 3 && (
                                <td className="tt-report-break-cell">
                                  <span>
                                    B<br />R<br />E<br />A<br />K
                                  </span>
                                </td>
                              )}
                            </Fragment>
                          );
                        })}

                        <td className="tt-teacher-total">
                          <strong>{teacher.totalPeriods}</strong>
                          <small>{teacher.weeklyLectures}/week</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tt-report-footer">
                <span>
                  Common Teaching Group rows are combined as one physical lecture.
                </span>
                <strong>PRINCIPAL: ____________________</strong>
              </div>
            </section>
          )}
        </div>
      )}

    </div>
  );
}

export default Timetable;
