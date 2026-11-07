-- Optional synthetic data for a fresh development database.
IF EXISTS (SELECT 1 FROM dbo.AcademicSessions WHERE SessionName = N'Demo Session')
    RETURN;
IF EXISTS (SELECT 1 FROM dbo.AcademicSessions)
    THROW 50001, 'Demo data can only be added to an empty application database.', 1;

INSERT dbo.AcademicSessions (SessionName, StartDate, EndDate, IsCurrent)
VALUES (N'Demo Session', '2026-09-01', '2027-06-30', 1);
DECLARE @session int = SCOPE_IDENTITY();

INSERT dbo.Campuses (CampusName, CampusCode) VALUES (N'Demo Campus', N'DEMO');
DECLARE @campus int = SCOPE_IDENTITY();
INSERT dbo.ClassYears (YearName, YearNumber) VALUES (N'First Year', 1), (N'Second Year', 2);
DECLARE @year int = (SELECT ClassYearId FROM dbo.ClassYears WHERE YearNumber = 1);
INSERT dbo.Programs (ProgramName, ProgramCode) VALUES (N'Computer Science', N'DEMO-CS');
DECLARE @program int = SCOPE_IDENTITY();
INSERT dbo.Departments (DepartmentName, DepartmentCode) VALUES (N'Computing', N'DEMO-COMP');
DECLARE @department int = SCOPE_IDENTITY();

INSERT dbo.Teachers (DepartmentId, EmployeeCode, FirstName, LastName)
VALUES (@department, N'DEMO-T1', N'Demo', N'Instructor A');
DECLARE @teacher int = SCOPE_IDENTITY();
INSERT dbo.Teachers (DepartmentId, EmployeeCode, FirstName, LastName)
VALUES (@department, N'DEMO-T2', N'Demo', N'Instructor B');
DECLARE @labTeacher int = SCOPE_IDENTITY();

INSERT dbo.Subjects (DepartmentId, SubjectCode, SubjectName, WeeklyHours, IsPractical)
VALUES (@department, N'DEMO-101', N'Computing Fundamentals', 2, 0);
DECLARE @subject int = SCOPE_IDENTITY();
INSERT dbo.Subjects (DepartmentId, SubjectCode, SubjectName, WeeklyHours, IsPractical)
VALUES (@department, N'DEMO-LAB', N'Computing Lab', 1, 1);
DECLARE @practical int = SCOPE_IDENTITY();
INSERT dbo.TeacherDepartments (TeacherId, DepartmentId) VALUES (@teacher, @department), (@labTeacher, @department);
INSERT dbo.TeacherSubjects (TeacherId, SubjectId) VALUES (@teacher, @subject), (@labTeacher, @practical);

INSERT dbo.Rooms (CampusId, RoomNumber, RoomName, RoomType, Capacity, IsLab)
VALUES (@campus, N'DEMO-101', N'Demo Classroom A', N'Classroom', 50, 0);
DECLARE @roomA int = SCOPE_IDENTITY();
INSERT dbo.Rooms (CampusId, RoomNumber, RoomName, RoomType, Capacity, IsLab)
VALUES (@campus, N'DEMO-102', N'Demo Classroom B', N'Classroom', 50, 0),
       (@campus, N'DEMO-LAB', N'Demo Lab', N'Lab', 30, 1);
DECLARE @roomB int = (SELECT RoomId FROM dbo.Rooms WHERE RoomNumber = N'DEMO-102');

INSERT dbo.Sections (CampusId, AcademicSessionId, ClassYearId, ProgramId, SectionName, SectionCode, StudentCount, DefaultRoomId)
VALUES (@campus, @session, @year, @program, N'A', N'DEMO-A', 20, @roomA);
DECLARE @sectionA int = SCOPE_IDENTITY();
INSERT dbo.Sections (CampusId, AcademicSessionId, ClassYearId, ProgramId, SectionName, SectionCode, StudentCount, DefaultRoomId)
VALUES (@campus, @session, @year, @program, N'B', N'DEMO-B', 20, @roomB);
DECLARE @sectionB int = SCOPE_IDENTITY();

INSERT dbo.SectionSubjects (SectionId, SubjectId, TeacherId, WeeklyHours)
VALUES (@sectionA, @subject, @teacher, 2), (@sectionB, @subject, @teacher, 2),
       (@sectionA, @practical, @labTeacher, 1);

INSERT dbo.TeachingGroups (GroupName, CampusId, AcademicSessionId, ClassYearId)
VALUES (N'Demo Shared Group', @campus, @session, @year);
DECLARE @group int = SCOPE_IDENTITY();
INSERT dbo.TeachingGroupSections (TeachingGroupId, SectionId)
VALUES (@group, @sectionA), (@group, @sectionB);

INSERT dbo.TimeSlots (DayOfWeek, StartTime, EndTime, SlotName)
SELECT d.dayNumber, p.startTime, p.endTime, p.slotName
FROM (VALUES (1), (2), (3), (4), (5)) d(dayNumber)
CROSS JOIN (VALUES ('08:00', '08:40', N'Period 1'), ('08:40', '09:20', N'Period 2'),
                   ('09:30', '10:10', N'Period 3')) p(startTime, endTime, slotName);
