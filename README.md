# College Timetable Management System

A full-stack College Timetable Management System designed to manage academic scheduling efficiently.

The system provides management of teachers, subjects, sections, rooms, time slots, teaching groups, section-subject assignments, timetable generation, and timetable conflict detection.

## Features

- Teacher Management
- Subject Management
- Section Management
- Room Management
- Time Slot Management
- Section Subject Assignment
- Teaching Group Management
- Teaching Group Section Management
- Automatic Timetable Generation
- Manual Timetable Entry
- Conflict Detection
- Teacher Conflict Detection
- Room Conflict Detection
- Section Conflict Detection
- Room Capacity Validation
- Teacher Daily Load Validation
- Common / Shared Lecture Support
- Class-Wise Timetable
- Teacher-Wise Timetable
- Printable Timetable Reports

## Technologies Used

### Frontend

- React
- Vite
- JavaScript
- HTML5
- CSS3
- Axios

### Backend

- Node.js
- Express.js
- JavaScript

### Database

- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- Windows Authentication
- ODBC Driver 17 for SQL Server

## Project Structure

```text
TimetableManagementSystem/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── frontend/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── package.json
│   └── server.js
│
├── database/
│   └── CollegeTimetableDB.sql
│
├── .gitignore
└── README.md