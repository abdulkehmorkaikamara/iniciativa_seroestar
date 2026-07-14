# Phase 1 Audit: Mocked Frontend Features and Backend Mapping

## Overview
This audit confirms that the current React frontend is still largely simulated and does not use the existing FastAPI backend for most portal workflows.

### FastAPI backend already supports:
- `POST /api/register`
- `POST /api/login`
- `POST /api/live-sessions`
- `GET /api/live-sessions`
- `POST /api/attendance/join`
- `WS /ws/live-chat/{session_id}`
- `POST /api/blog`
- `GET /api/blog`
- `POST /api/images`

### Backend models already present:
- `User`
- `StudentProfile`
- `TeacherProfile`
- `LiveClassSession`
- `AttendanceRecord`
- `ChatMessage`
- `LessonNote`
- `RecordedClass`
- `BlogPost`
- `ImageUpload`
- `ChatbotFAQ`

## Mocked frontend data stores and features

### 1. Authentication and registration
- `localStorage.getItem("portal_students")`
- `localStorage.setItem("portal_students", ...)`
- hardcoded teacher/admin credentials in `PortalGate.tsx`
- fake Google SSO modal and locally stored SSO profile
- duplicate registration logic in `src/App.tsx`

**Backend mapping:**
- `POST /api/register` → `User` + `StudentProfile`
- `POST /api/login` → user authentication
- missing: `GET /api/me` for session hydration
- missing: secure httpOnly cookie flow / token refresh

### 2. Welcome email / inbox
- `localStorage.setItem(
      \\`emails_${studentCode}\\`, ...)`
- local mail history stored purely in browser state
- welcome letter text is generated locally in `PortalGate.tsx` and `src/App.tsx`

**Backend mapping:**
- keep `POST /api/send-welcome` in Express as SMTP proxy
- add backend model (e.g. `EmailMessage` or `StudentInboxMessage`) if inbox history should persist

### 3. Announcements and class communications
- `localStorage.getItem("course_announcements")`
- `localStorage.setItem("course_announcements", ...)`
- `TeacherDashboard.tsx` writes announcements to localStorage only
- `StudentDashboard.tsx` reads announcements from localStorage only

**Backend mapping:**
- new endpoint: `POST /api/announcements`
- new endpoint: `GET /api/announcements?course_level=A1`
- corresponding backend model: `CourseAnnouncement`

### 4. Personal notes, assignments, grades, and email metadata
- `notes_${student.studentIdCode}`
- `assignments_${student.studentIdCode}`
- `grades_${student.studentIdCode}`
- `emails_${student.studentIdCode}`

**Backend mapping:**
- `LessonNote` can replace shared notes
- new backend models needed:
  - `StudentNote`
  - `AssignmentSubmission`
  - `GradeRecord`
  - `StudentMessage`

### 5. Live class session simulation
- `StudentDashboard.tsx` and `TeacherDashboard.tsx` use static `activeSession` / `scheduledClasses`
- class launch is purely local state
- `TeacherDashboard.tsx` live chat is stored in component state only
- no real WebRTC/video provider integration exists
- `StudentDashboard.tsx` joins live class by toggling local flag and incrementing attendance stats

**Backend mapping:**
- `LiveClassSession` model exists
- `AttendanceRecord` model exists
- `ChatMessage` + `/ws/live-chat/{session_id}` exist
- missing: real video/session token provider integration
- missing: join/leave attendance metadata from actual session lifecycle

### 6. Recorded classes / video archive
- `INITIAL_RECORDINGS` hardcodes sample URLs to `w3schools.com/html/mov_bbb.mp4`
- Student archive playback is static mock data

**Backend mapping:**
- `RecordedClass` model exists
- missing: upload/storage pipeline and provider integration
- missing: playback URL storage and real file hosting

### 7. Teacher portal exports and roster data
- `TeacherDashboard.tsx` uses `INITIAL_STUDENT_ROSTER` static array
- attendance CSV and chat log export are generated from local state
- class scheduling uses local state only

**Backend mapping:**
- schedule classes with `POST /api/live-sessions`
- roster and attendance from `AttendanceRecord`
- chat history from `ChatMessage`

## Immediate Phase 1 actions completed
- Frontend TypeScript check passed (`npm run lint`)
- FastAPI backend launched successfully on port `8000`
- Alembic migration scaffold initialized
- Environment sample configuration added
- Added `/api/me` endpoint placeholder for frontend session hydration

## Phase 1 remaining stabilization checklist
1. Replace localStorage auth flows with backend registration/login.
2. Add secure JWT session hydration via `/api/me`.
3. Replace announcement localStorage with backend announcement endpoints.
4. Replace assignment/grade/note storage with backend persistence.
5. Replace class schedule / live session state with backend live session endpoints.
6. Replace recorded archive mocks with `RecordedClass` backend data.
7. Add Alembic migrations and remove reliance on `Base.metadata.create_all()` for production.
8. Add `ENV`-based API base URL and JWT secret support in frontend/backend configs.
