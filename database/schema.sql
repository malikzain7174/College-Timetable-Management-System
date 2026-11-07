-- Run in a newly created, empty application database. For upgrades, use npm run db:migrate.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
GO
CREATE TABLE [dbo].[AcademicSessions](
	[AcademicSessionId] [int] IDENTITY(1,1) NOT NULL,
	[SessionName] [nvarchar](20) NOT NULL,
	[StartDate] [date] NOT NULL,
	[EndDate] [date] NOT NULL,
	[IsCurrent] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[AcademicSessionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Campuses](
	[CampusId] [int] IDENTITY(1,1) NOT NULL,
	[CampusName] [nvarchar](100) NOT NULL,
	[CampusCode] [nvarchar](20) NOT NULL,
	[Location] [nvarchar](200) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[CampusId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[ClassYears](
	[ClassYearId] [int] IDENTITY(1,1) NOT NULL,
	[YearName] [nvarchar](30) NOT NULL,
	[YearNumber] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[ClassYearId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Departments](
	[DepartmentId] [int] IDENTITY(1,1) NOT NULL,
	[DepartmentName] [nvarchar](100) NOT NULL,
	[DepartmentCode] [nvarchar](20) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[DepartmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[PasswordResetTokens](
	[PasswordResetTokenId] [int] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[TokenHash] [nvarchar](255) NOT NULL,
	[ExpiresAt] [datetime2](7) NOT NULL,
	[UsedAt] [datetime2](7) NULL,
	[AttemptCount] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[PasswordResetTokenId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Programs](
	[ProgramId] [int] IDENTITY(1,1) NOT NULL,
	[ProgramName] [nvarchar](100) NOT NULL,
	[ProgramCode] [nvarchar](20) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[ProgramId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Rooms](
	[RoomId] [int] IDENTITY(1,1) NOT NULL,
	[CampusId] [int] NOT NULL,
	[RoomNumber] [nvarchar](30) NOT NULL,
	[RoomName] [nvarchar](100) NULL,
	[RoomType] [nvarchar](30) NOT NULL,
	[Capacity] [int] NOT NULL,
	[BuildingName] [nvarchar](100) NULL,
	[FloorNumber] [int] NULL,
	[IsLab] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[RoomId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Sections](
	[SectionId] [int] IDENTITY(1,1) NOT NULL,
	[CampusId] [int] NOT NULL,
	[AcademicSessionId] [int] NOT NULL,
	[ClassYearId] [int] NOT NULL,
	[ProgramId] [int] NOT NULL,
	[SectionName] [nvarchar](50) NOT NULL,
	[SectionCode] [nvarchar](50) NOT NULL,
	[StudentCount] [int] NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[DefaultRoomId] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[SectionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[SectionSubjects](
	[SectionSubjectId] [int] IDENTITY(1,1) NOT NULL,
	[SectionId] [int] NOT NULL,
	[SubjectId] [int] NOT NULL,
	[TeacherId] [int] NOT NULL,
	[WeeklyHours] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[SharedWithSectionId] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[SectionSubjectId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Subjects](
	[SubjectId] [int] IDENTITY(1,1) NOT NULL,
	[SubjectCode] [nvarchar](30) NOT NULL,
	[SubjectName] [nvarchar](100) NOT NULL,
	[DepartmentId] [int] NULL,
	[CreditHours] [decimal](3, 1) NULL,
	[WeeklyHours] [int] NOT NULL,
	[IsPractical] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[SubjectId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TeacherDepartments](
	[TeacherDepartmentId] [int] IDENTITY(1,1) NOT NULL,
	[TeacherId] [int] NOT NULL,
	[DepartmentId] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[TeacherDepartmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[Teachers](
	[TeacherId] [int] IDENTITY(1,1) NOT NULL,
	[DepartmentId] [int] NULL,
	[EmployeeCode] [nvarchar](30) NOT NULL,
	[FirstName] [nvarchar](50) NOT NULL,
	[LastName] [nvarchar](50) NULL,
	[Email] [nvarchar](150) NULL,
	[Phone] [nvarchar](30) NULL,
	[Designation] [nvarchar](100) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[TeacherId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TeacherSubjects](
	[TeacherSubjectId] [int] IDENTITY(1,1) NOT NULL,
	[TeacherId] [int] NOT NULL,
	[SubjectId] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[TeacherSubjectId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TeachingGroups](
	[TeachingGroupId] [int] IDENTITY(1,1) NOT NULL,
	[GroupName] [nvarchar](100) NOT NULL,
	[CampusId] [int] NOT NULL,
	[AcademicSessionId] [int] NOT NULL,
	[ClassYearId] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[TeachingGroupId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TeachingGroupSections](
	[TeachingGroupSectionId] [int] IDENTITY(1,1) NOT NULL,
	[TeachingGroupId] [int] NOT NULL,
	[SectionId] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[TeachingGroupSectionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TimeSlots](
	[TimeSlotId] [int] IDENTITY(1,1) NOT NULL,
	[DayOfWeek] [tinyint] NOT NULL,
	[StartTime] [time](7) NOT NULL,
	[EndTime] [time](7) NOT NULL,
	[SlotName] [nvarchar](50) NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[TimeSlotId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TimetableEntries](
	[TimetableEntryId] [int] IDENTITY(1,1) NOT NULL,
	[SectionSubjectId] [int] NOT NULL,
	[TeacherId] [int] NOT NULL,
	[RoomId] [int] NOT NULL,
	[TimeSlotId] [int] NOT NULL,
	[AcademicSessionId] [int] NOT NULL,
	[ClassType] [nvarchar](30) NOT NULL,
	[Notes] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED
(
	[TimetableEntryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
CREATE TABLE [dbo].[TimetableRules](
	[RuleId] [int] IDENTITY(1,1) NOT NULL,
	[RuleCode] [nvarchar](100) NOT NULL,
	[RuleName] [nvarchar](200) NOT NULL,
	[RuleType] [nvarchar](50) NOT NULL,
	[ScopeType] [nvarchar](50) NOT NULL,
	[ScopeId] [int] NULL,
	[RuleValue] [nvarchar](max) NULL,
	[IsEnabled] [bit] NOT NULL,
	[IsMandatory] [bit] NOT NULL,
	[Priority] [int] NOT NULL,
	[Description] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED
(
	[RuleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
CREATE TABLE [dbo].[Users](
	[UserId] [int] IDENTITY(1,1) NOT NULL,
	[TeacherId] [int] NULL,
	[Username] [nvarchar](100) NOT NULL,
	[PasswordHash] [nvarchar](255) NOT NULL,
	[Role] [nvarchar](30) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[Email] [nvarchar](255) NULL,
	[LastLoginAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[AuthVersion] [int] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO

GO
ALTER TABLE [dbo].[AcademicSessions] ADD UNIQUE NONCLUSTERED
(
	[SessionName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Campuses] ADD UNIQUE NONCLUSTERED
(
	[CampusCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ClassYears] ADD UNIQUE NONCLUSTERED
(
	[YearName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ClassYears] ADD UNIQUE NONCLUSTERED
(
	[YearNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Departments] ADD UNIQUE NONCLUSTERED
(
	[DepartmentCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_PasswordResetTokens_UserId_ExpiresAt] ON [dbo].[PasswordResetTokens]
(
	[UserId] ASC,
	[ExpiresAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Programs] ADD UNIQUE NONCLUSTERED
(
	[ProgramCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Rooms] ADD  CONSTRAINT [UQ_Rooms_Campus_RoomNumber] UNIQUE NONCLUSTERED
(
	[CampusId] ASC,
	[RoomNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Sections] ADD UNIQUE NONCLUSTERED
(
	[SectionCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[SectionSubjects] ADD  CONSTRAINT [UQ_SectionSubjects] UNIQUE NONCLUSTERED
(
	[SectionId] ASC,
	[SubjectId] ASC,
	[TeacherId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_SectionSubjects_Section_Subject] ON [dbo].[SectionSubjects]
(
	[SectionId] ASC,
	[SubjectId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Subjects] ADD UNIQUE NONCLUSTERED
(
	[SubjectCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_TeacherDepartments_Teacher_Department] ON [dbo].[TeacherDepartments]
(
	[TeacherId] ASC,
	[DepartmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Teachers] ADD UNIQUE NONCLUSTERED
(
	[EmployeeCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_TeacherSubjects_Teacher_Subject] ON [dbo].[TeacherSubjects]
(
	[TeacherId] ASC,
	[SubjectId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_TeachingGroupSections_Group_Section] ON [dbo].[TeachingGroupSections]
(
	[TeachingGroupId] ASC,
	[SectionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[TimeSlots] ADD  CONSTRAINT [UQ_TimeSlots] UNIQUE NONCLUSTERED
(
	[DayOfWeek] ASC,
	[StartTime] ASC,
	[EndTime] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_TimetableEntries_Room_TimeSlot_Session] ON [dbo].[TimetableEntries]
(
	[RoomId] ASC,
	[TimeSlotId] ASC,
	[AcademicSessionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_TimetableEntries_Teacher_TimeSlot_Session] ON [dbo].[TimetableEntries]
(
	[TeacherId] ASC,
	[TimeSlotId] ASC,
	[AcademicSessionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_TimetableEntries_SectionSubject_TimeSlot_Session] ON [dbo].[TimetableEntries]
(
	[SectionSubjectId] ASC,
	[TimeSlotId] ASC,
	[AcademicSessionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_TimetableRules_CodeScope] ON [dbo].[TimetableRules]
(
	[RuleCode] ASC,
	[ScopeType] ASC,
	[ScopeId] ASC,
	[IsEnabled] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_Users_Email] ON [dbo].[Users]
(
	[Email] ASC
)
WHERE ([Email] IS NOT NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_Users_Username] ON [dbo].[Users]
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AcademicSessions] ADD  DEFAULT ((0)) FOR [IsCurrent]
GO
ALTER TABLE [dbo].[AcademicSessions] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Campuses] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Campuses] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Departments] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Departments] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PasswordResetTokens] ADD  DEFAULT ((0)) FOR [AttemptCount]
GO
ALTER TABLE [dbo].[PasswordResetTokens] ADD  DEFAULT (sysdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Programs] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Programs] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Rooms] ADD  DEFAULT ('Classroom') FOR [RoomType]
GO
ALTER TABLE [dbo].[Rooms] ADD  DEFAULT ((0)) FOR [IsLab]
GO
ALTER TABLE [dbo].[Rooms] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Rooms] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Sections] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Sections] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[SectionSubjects] ADD  DEFAULT ((1)) FOR [WeeklyHours]
GO
ALTER TABLE [dbo].[SectionSubjects] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[SectionSubjects] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Subjects] ADD  DEFAULT ((1)) FOR [WeeklyHours]
GO
ALTER TABLE [dbo].[Subjects] ADD  DEFAULT ((0)) FOR [IsPractical]
GO
ALTER TABLE [dbo].[Subjects] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Subjects] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Teachers] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Teachers] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[TeachingGroups] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[TimeSlots] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[TimetableEntries] ADD  DEFAULT ('Lecture') FOR [ClassType]
GO
ALTER TABLE [dbo].[TimetableEntries] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[TimetableRules] ADD  CONSTRAINT [DF_TimetableRules_ScopeType]  DEFAULT ('Global') FOR [ScopeType]
GO
ALTER TABLE [dbo].[TimetableRules] ADD  CONSTRAINT [DF_TimetableRules_IsEnabled]  DEFAULT ((1)) FOR [IsEnabled]
GO
ALTER TABLE [dbo].[TimetableRules] ADD  CONSTRAINT [DF_TimetableRules_IsMandatory]  DEFAULT ((0)) FOR [IsMandatory]
GO
ALTER TABLE [dbo].[TimetableRules] ADD  CONSTRAINT [DF_TimetableRules_Priority]  DEFAULT ((100)) FOR [Priority]
GO
ALTER TABLE [dbo].[TimetableRules] ADD  CONSTRAINT [DF_TimetableRules_CreatedAt]  DEFAULT (sysdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_AuthVersion]  DEFAULT ((0)) FOR [AuthVersion]
GO
ALTER TABLE [dbo].[PasswordResetTokens]  WITH CHECK ADD  CONSTRAINT [FK_PasswordResetTokens_Users] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PasswordResetTokens] CHECK CONSTRAINT [FK_PasswordResetTokens_Users]
GO
ALTER TABLE [dbo].[Rooms]  WITH CHECK ADD  CONSTRAINT [FK_Rooms_Campuses] FOREIGN KEY([CampusId])
REFERENCES [dbo].[Campuses] ([CampusId])
GO
ALTER TABLE [dbo].[Rooms] CHECK CONSTRAINT [FK_Rooms_Campuses]
GO
ALTER TABLE [dbo].[Sections]  WITH CHECK ADD  CONSTRAINT [FK_Sections_AcademicSessions] FOREIGN KEY([AcademicSessionId])
REFERENCES [dbo].[AcademicSessions] ([AcademicSessionId])
GO
ALTER TABLE [dbo].[Sections] CHECK CONSTRAINT [FK_Sections_AcademicSessions]
GO
ALTER TABLE [dbo].[Sections]  WITH CHECK ADD  CONSTRAINT [FK_Sections_Campuses] FOREIGN KEY([CampusId])
REFERENCES [dbo].[Campuses] ([CampusId])
GO
ALTER TABLE [dbo].[Sections] CHECK CONSTRAINT [FK_Sections_Campuses]
GO
ALTER TABLE [dbo].[Sections]  WITH CHECK ADD  CONSTRAINT [FK_Sections_ClassYears] FOREIGN KEY([ClassYearId])
REFERENCES [dbo].[ClassYears] ([ClassYearId])
GO
ALTER TABLE [dbo].[Sections] CHECK CONSTRAINT [FK_Sections_ClassYears]
GO
ALTER TABLE [dbo].[Sections]  WITH CHECK ADD  CONSTRAINT [FK_Sections_DefaultRoom] FOREIGN KEY([DefaultRoomId])
REFERENCES [dbo].[Rooms] ([RoomId])
GO
ALTER TABLE [dbo].[Sections] CHECK CONSTRAINT [FK_Sections_DefaultRoom]
GO
ALTER TABLE [dbo].[Sections]  WITH CHECK ADD  CONSTRAINT [FK_Sections_Programs] FOREIGN KEY([ProgramId])
REFERENCES [dbo].[Programs] ([ProgramId])
GO
ALTER TABLE [dbo].[Sections] CHECK CONSTRAINT [FK_Sections_Programs]
GO
ALTER TABLE [dbo].[SectionSubjects]  WITH CHECK ADD  CONSTRAINT [FK_SectionSubjects_Sections] FOREIGN KEY([SectionId])
REFERENCES [dbo].[Sections] ([SectionId])
GO
ALTER TABLE [dbo].[SectionSubjects] CHECK CONSTRAINT [FK_SectionSubjects_Sections]
GO
ALTER TABLE [dbo].[SectionSubjects]  WITH CHECK ADD  CONSTRAINT [FK_SectionSubjects_SharedSections] FOREIGN KEY([SharedWithSectionId])
REFERENCES [dbo].[Sections] ([SectionId])
GO
ALTER TABLE [dbo].[SectionSubjects] CHECK CONSTRAINT [FK_SectionSubjects_SharedSections]
GO
ALTER TABLE [dbo].[SectionSubjects]  WITH CHECK ADD  CONSTRAINT [FK_SectionSubjects_Subjects] FOREIGN KEY([SubjectId])
REFERENCES [dbo].[Subjects] ([SubjectId])
GO
ALTER TABLE [dbo].[SectionSubjects] CHECK CONSTRAINT [FK_SectionSubjects_Subjects]
GO
ALTER TABLE [dbo].[SectionSubjects]  WITH CHECK ADD  CONSTRAINT [FK_SectionSubjects_Teachers] FOREIGN KEY([TeacherId])
REFERENCES [dbo].[Teachers] ([TeacherId])
GO
ALTER TABLE [dbo].[SectionSubjects] CHECK CONSTRAINT [FK_SectionSubjects_Teachers]
GO
ALTER TABLE [dbo].[Subjects]  WITH CHECK ADD  CONSTRAINT [FK_Subjects_Departments] FOREIGN KEY([DepartmentId])
REFERENCES [dbo].[Departments] ([DepartmentId])
GO
ALTER TABLE [dbo].[Subjects] CHECK CONSTRAINT [FK_Subjects_Departments]
GO
ALTER TABLE [dbo].[TeacherDepartments]  WITH CHECK ADD  CONSTRAINT [FK_TeacherDepartments_Departments] FOREIGN KEY([DepartmentId])
REFERENCES [dbo].[Departments] ([DepartmentId])
GO
ALTER TABLE [dbo].[TeacherDepartments] CHECK CONSTRAINT [FK_TeacherDepartments_Departments]
GO
ALTER TABLE [dbo].[TeacherDepartments]  WITH CHECK ADD  CONSTRAINT [FK_TeacherDepartments_Teachers] FOREIGN KEY([TeacherId])
REFERENCES [dbo].[Teachers] ([TeacherId])
GO
ALTER TABLE [dbo].[TeacherDepartments] CHECK CONSTRAINT [FK_TeacherDepartments_Teachers]
GO
ALTER TABLE [dbo].[Teachers]  WITH CHECK ADD  CONSTRAINT [FK_Teachers_Departments] FOREIGN KEY([DepartmentId])
REFERENCES [dbo].[Departments] ([DepartmentId])
GO
ALTER TABLE [dbo].[Teachers] CHECK CONSTRAINT [FK_Teachers_Departments]
GO
ALTER TABLE [dbo].[TeacherSubjects]  WITH CHECK ADD  CONSTRAINT [FK_TeacherSubjects_Subjects] FOREIGN KEY([SubjectId])
REFERENCES [dbo].[Subjects] ([SubjectId])
GO
ALTER TABLE [dbo].[TeacherSubjects] CHECK CONSTRAINT [FK_TeacherSubjects_Subjects]
GO
ALTER TABLE [dbo].[TeacherSubjects]  WITH CHECK ADD  CONSTRAINT [FK_TeacherSubjects_Teachers] FOREIGN KEY([TeacherId])
REFERENCES [dbo].[Teachers] ([TeacherId])
GO
ALTER TABLE [dbo].[TeacherSubjects] CHECK CONSTRAINT [FK_TeacherSubjects_Teachers]
GO
ALTER TABLE [dbo].[TeachingGroups]  WITH CHECK ADD  CONSTRAINT [FK_TeachingGroups_AcademicSessions] FOREIGN KEY([AcademicSessionId])
REFERENCES [dbo].[AcademicSessions] ([AcademicSessionId])
GO
ALTER TABLE [dbo].[TeachingGroups] CHECK CONSTRAINT [FK_TeachingGroups_AcademicSessions]
GO
ALTER TABLE [dbo].[TeachingGroups]  WITH CHECK ADD  CONSTRAINT [FK_TeachingGroups_Campuses] FOREIGN KEY([CampusId])
REFERENCES [dbo].[Campuses] ([CampusId])
GO
ALTER TABLE [dbo].[TeachingGroups] CHECK CONSTRAINT [FK_TeachingGroups_Campuses]
GO
ALTER TABLE [dbo].[TeachingGroups]  WITH CHECK ADD  CONSTRAINT [FK_TeachingGroups_ClassYears] FOREIGN KEY([ClassYearId])
REFERENCES [dbo].[ClassYears] ([ClassYearId])
GO
ALTER TABLE [dbo].[TeachingGroups] CHECK CONSTRAINT [FK_TeachingGroups_ClassYears]
GO
ALTER TABLE [dbo].[TeachingGroupSections]  WITH CHECK ADD  CONSTRAINT [FK_TeachingGroupSections_Sections] FOREIGN KEY([SectionId])
REFERENCES [dbo].[Sections] ([SectionId])
GO
ALTER TABLE [dbo].[TeachingGroupSections] CHECK CONSTRAINT [FK_TeachingGroupSections_Sections]
GO
ALTER TABLE [dbo].[TeachingGroupSections]  WITH CHECK ADD  CONSTRAINT [FK_TeachingGroupSections_TeachingGroups] FOREIGN KEY([TeachingGroupId])
REFERENCES [dbo].[TeachingGroups] ([TeachingGroupId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[TeachingGroupSections] CHECK CONSTRAINT [FK_TeachingGroupSections_TeachingGroups]
GO
ALTER TABLE [dbo].[TimetableEntries]  WITH CHECK ADD  CONSTRAINT [FK_TimetableEntries_AcademicSessions] FOREIGN KEY([AcademicSessionId])
REFERENCES [dbo].[AcademicSessions] ([AcademicSessionId])
GO
ALTER TABLE [dbo].[TimetableEntries] CHECK CONSTRAINT [FK_TimetableEntries_AcademicSessions]
GO
ALTER TABLE [dbo].[TimetableEntries]  WITH CHECK ADD  CONSTRAINT [FK_TimetableEntries_Rooms] FOREIGN KEY([RoomId])
REFERENCES [dbo].[Rooms] ([RoomId])
GO
ALTER TABLE [dbo].[TimetableEntries] CHECK CONSTRAINT [FK_TimetableEntries_Rooms]
GO
ALTER TABLE [dbo].[TimetableEntries]  WITH CHECK ADD  CONSTRAINT [FK_TimetableEntries_SectionSubjects] FOREIGN KEY([SectionSubjectId])
REFERENCES [dbo].[SectionSubjects] ([SectionSubjectId])
GO
ALTER TABLE [dbo].[TimetableEntries] CHECK CONSTRAINT [FK_TimetableEntries_SectionSubjects]
GO
ALTER TABLE [dbo].[TimetableEntries]  WITH CHECK ADD  CONSTRAINT [FK_TimetableEntries_Teachers] FOREIGN KEY([TeacherId])
REFERENCES [dbo].[Teachers] ([TeacherId])
GO
ALTER TABLE [dbo].[TimetableEntries] CHECK CONSTRAINT [FK_TimetableEntries_Teachers]
GO
ALTER TABLE [dbo].[TimetableEntries]  WITH CHECK ADD  CONSTRAINT [FK_TimetableEntries_TimeSlots] FOREIGN KEY([TimeSlotId])
REFERENCES [dbo].[TimeSlots] ([TimeSlotId])
GO
ALTER TABLE [dbo].[TimetableEntries] CHECK CONSTRAINT [FK_TimetableEntries_TimeSlots]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK_Users_Teachers] FOREIGN KEY([TeacherId])
REFERENCES [dbo].[Teachers] ([TeacherId])
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK_Users_Teachers]
GO
ALTER TABLE [dbo].[AcademicSessions]  WITH CHECK ADD  CONSTRAINT [CK_AcademicSessions_Dates] CHECK  (([EndDate]>[StartDate]))
GO
ALTER TABLE [dbo].[AcademicSessions] CHECK CONSTRAINT [CK_AcademicSessions_Dates]
GO
ALTER TABLE [dbo].[ClassYears]  WITH CHECK ADD  CONSTRAINT [CK_ClassYears_YearNumber] CHECK  (([YearNumber]>(0)))
GO
ALTER TABLE [dbo].[ClassYears] CHECK CONSTRAINT [CK_ClassYears_YearNumber]
GO
ALTER TABLE [dbo].[Rooms]  WITH CHECK ADD  CONSTRAINT [CK_Rooms_Capacity] CHECK  (([Capacity]>(0)))
GO
ALTER TABLE [dbo].[Rooms] CHECK CONSTRAINT [CK_Rooms_Capacity]
GO
ALTER TABLE [dbo].[Sections]  WITH CHECK ADD  CONSTRAINT [CK_Sections_StudentCount] CHECK  (([StudentCount] IS NULL OR [StudentCount]>=(0)))
GO
ALTER TABLE [dbo].[Sections] CHECK CONSTRAINT [CK_Sections_StudentCount]
GO
ALTER TABLE [dbo].[SectionSubjects]  WITH CHECK ADD  CONSTRAINT [CK_SectionSubjects_SharedSection] CHECK  (([SharedWithSectionId] IS NULL OR [SharedWithSectionId]<>[SectionId]))
GO
ALTER TABLE [dbo].[SectionSubjects] CHECK CONSTRAINT [CK_SectionSubjects_SharedSection]
GO
ALTER TABLE [dbo].[SectionSubjects]  WITH CHECK ADD  CONSTRAINT [CK_SectionSubjects_WeeklyHours] CHECK  (([WeeklyHours]>(0)))
GO
ALTER TABLE [dbo].[SectionSubjects] CHECK CONSTRAINT [CK_SectionSubjects_WeeklyHours]
GO
ALTER TABLE [dbo].[Subjects]  WITH CHECK ADD  CONSTRAINT [CK_Subjects_CreditHours] CHECK  (([CreditHours] IS NULL OR [CreditHours]>=(0)))
GO
ALTER TABLE [dbo].[Subjects] CHECK CONSTRAINT [CK_Subjects_CreditHours]
GO
ALTER TABLE [dbo].[Subjects]  WITH CHECK ADD  CONSTRAINT [CK_Subjects_WeeklyHours] CHECK  (([WeeklyHours]>(0)))
GO
ALTER TABLE [dbo].[Subjects] CHECK CONSTRAINT [CK_Subjects_WeeklyHours]
GO
ALTER TABLE [dbo].[TimeSlots]  WITH CHECK ADD  CONSTRAINT [CK_TimeSlots_DayOfWeek] CHECK  (([DayOfWeek]>=(1) AND [DayOfWeek]<=(7)))
GO
ALTER TABLE [dbo].[TimeSlots] CHECK CONSTRAINT [CK_TimeSlots_DayOfWeek]
GO
ALTER TABLE [dbo].[TimeSlots]  WITH CHECK ADD  CONSTRAINT [CK_TimeSlots_Time] CHECK  (([EndTime]>[StartTime]))
GO
ALTER TABLE [dbo].[TimeSlots] CHECK CONSTRAINT [CK_TimeSlots_Time]
GO
ALTER TABLE [dbo].[TimeSlots]  WITH CHECK ADD  CONSTRAINT [CK_TimeSlots_TimeRange] CHECK  (([EndTime]>[StartTime]))
GO
ALTER TABLE [dbo].[TimeSlots] CHECK CONSTRAINT [CK_TimeSlots_TimeRange]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [CK_Users_Role] CHECK  (([Role]='Teacher' OR [Role]='Admin'))
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [CK_Users_Role]
GO
