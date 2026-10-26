import React, { useEffect, useState } from "react";
import {
  Users,
  Video,
  FileDown,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  VideoOff,
  LogOut,
  Send,
  Layers,
  Sparkles,
  Search,
  MessageSquare,
  Upload,
  Award,
  BookOpen,
  ExternalLink
} from "lucide-react";
import ChangePasswordButton from "./ChangePasswordButton";
import LiveVideoRoom from "../LiveVideoRoom";
import MessagesPanel from "./MessagesPanel";
import { useLiveChat } from "../useLiveChat";
import { findTutorByEmail } from "../../tutors";
import { CLASS_GROUPS, ClassGroup, classGroupLabel, classGroupValue, contentAudienceLabel, groupsForTutor } from "../../groups";

interface TeacherDashboardProps {
  onExit: () => void;
  teacherProfile?: any;
  lang?: "EN" | "ES";
}

export default function TeacherDashboard({ onExit, teacherProfile, lang = "EN" }: TeacherDashboardProps) {
  const d = (en: string, es: string) => (lang === "ES" ? es : en);
  const tutor = findTutorByEmail(teacherProfile?.email);
  const teacherName = teacherProfile?.fullName || tutor.name;
  const teacherDisplayName = teacherProfile?.displayName || tutor.displayName || teacherName;
  const teacherEmail = teacherProfile?.email || tutor.email;

  // The schools this tutor publishes to; every form targets one of them.
  const tutorGroups = groupsForTutor(teacherEmail);
  const groupByCode = (code: string): ClassGroup => CLASS_GROUPS.find((g) => g.code === code) || tutorGroups[0];
  const schoolSelect = (value: string, onChange: (code: string) => void, className: string) => (
    <select aria-label={d("School", "Escuela")} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {tutorGroups.map((g) => (
        <option key={g.code} value={g.code}>{classGroupLabel(g)} ({g.level})</option>
      ))}
    </select>
  );

  // Live class list state
  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [teacherProgress, setTeacherProgress] = useState<any | null>(null);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/live-sessions")
      .then((res) => res.json())
      .then((data) => {
        const mapped = data
          .filter((item: any) => !item.teacher_name || item.teacher_name === teacherName)
          .map((item: any) => ({
          id: item.id,
          title: item.title,
          level: item.course_level,
          classGroup: item.class_group,
          date: item.date_time,
          time: item.date_time,
          status: item.status,
          link: item.meeting_link,
          teacher: item.teacher_name
        }));
        setScheduledClasses(mapped);
      })
      .catch(() => {
        setScheduledClasses([]);
      });
  }, [teacherName]);

  useEffect(() => {
    fetch(`/api/teachers/progress?teacher_email=${encodeURIComponent(teacherEmail)}`)
      .then((res) => res.json())
      .then((data) => setTeacherProgress(data))
      .catch(() => setTeacherProgress(null));
  }, [teacherEmail, progressRefreshKey]);

  // Input states
  const [newTitle, setNewTitle] = useState("");
  const [newGroupCode, setNewGroupCode] = useState(tutorGroups[0].code);
  const newGroup = groupByCode(newGroupCode);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newMeetLink, setNewMeetLink] = useState("");
  // Which video provider the backend runs classes on (Daily or Google Meet).
  const [liveConfig, setLiveConfig] = useState<{ provider: string; meet_auto_create: boolean }>({ provider: "daily", meet_auto_create: false });
  const usesMeet = liveConfig.provider === "meet";
  const needsMeetLink = usesMeet && !liveConfig.meet_auto_create;

  useEffect(() => {
    fetch("/api/live-config")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setLiveConfig(data); })
      .catch(() => {});
  }, []);
  const [scheduleStatus, setScheduleStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Classes are stored in GMT; tutors outside Sierra Leone see what that means for them.
  const localTimeHint = (() => {
    if (!newDate || !newTime) return "";
    const gmt = new Date(`${newDate}T${newTime}:00Z`);
    if (Number.isNaN(gmt.getTime()) || gmt.getTimezoneOffset() === 0) return "";
    return gmt.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
  })();

  // Live class room simulation
  const [currentActiveRoom, setCurrentActiveRoom] = useState<any | null>(null);
  const [activeRoomMessage, setActiveRoomMessage] = useState("");
  const { messages: roomChatMessages, error: roomChatError, send: sendRoomChat } = useLiveChat(currentActiveRoom?.id);

  // Shared note uploads form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteGroupCode, setNoteGroupCode] = useState(tutorGroups[0].code);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteUploadStatus, setNoteUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Archive recording uploads form
  const [recTitle, setRecTitle] = useState("");
  const [recGroupCode, setRecGroupCode] = useState(tutorGroups[0].code);
  const [recDescription, setRecDescription] = useState("");
  const [recVideoUrl, setRecVideoUrl] = useState("");

  // Attendance sheet for one school: students x classes, marked by hand or by joining live.
  const [attendanceGroupCode, setAttendanceGroupCode] = useState(tutorGroups[0].code);
  const [attendanceSheet, setAttendanceSheet] = useState<{ students: any[]; sessions: any[]; marks: Record<string, Record<string, string>> }>({ students: [], sessions: [], marks: {} });
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [pastTitle, setPastTitle] = useState("");
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");

  // Content this tutor has published, so it can be reviewed and deleted.
  const [publishedRefreshKey, setPublishedRefreshKey] = useState(0);
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [myRecordings, setMyRecordings] = useState<any[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<any[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Cohort announcement builder
  const [annTitle, setAnnTitle] = useState("");
  const [annText, setAnnText] = useState("");
  const [annGroupCode, setAnnGroupCode] = useState(tutorGroups[0].code);
  const [annType, setAnnType] = useState("info");
  const [annSuccessMessage, setAnnSuccessMessage] = useState(false);

  const [annError, setAnnError] = useState<string | null>(null);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annText) return;
    setAnnError(null);
    const group = groupByCode(annGroupCode);
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: annTitle,
        text: annText,
        course_level: group.level,
        class_group: classGroupValue(group),
        alert_type: annType
      })
    }).catch(() => null);
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setAnnError(payload?.detail || d("The announcement could not be published.", "No se pudo publicar el anuncio."));
      return;
    }

    setPublishedRefreshKey((key) => key + 1);
    setAnnSuccessMessage(true);
    setAnnTitle("");
    setAnnText("");

    setTimeout(() => {
      setAnnSuccessMessage(false);
    }, 4500);
  };

  // Create a class record; shared by scheduling and "Start class now".
  const createClass = async (title: string, group: ClassGroup, dateTime: string, meetingLink?: string, completed = false) => {
    const response = await fetch("/api/live-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        course_level: group.level,
        class_group: classGroupValue(group),
        teacher_name: teacherName,
        date_time: dateTime,
        meeting_link: meetingLink || null,
        completed
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || d("The class could not be scheduled.", "No se pudo programar la clase."));
    }

    const created = await response.json();
    const newClass = {
      id: created.id,
      title: created.title,
      level: created.course_level,
      classGroup: created.class_group,
      date: created.date_time,
      time: created.date_time,
      status: created.status,
      link: created.meeting_link
    };
    setScheduledClasses((current) => [...current, newClass]);
    setProgressRefreshKey(prev => prev + 1);
    return newClass;
  };

  // Schedule class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleStatus(null);
    if (!newTitle || !newDate || !newTime) {
      setScheduleStatus({
        type: "error",
        message: d("Enter a class title, level, date, and time.", "Introduce el título, nivel, fecha y hora de la clase.")
      });
      return;
    }
    if (needsMeetLink && !newMeetLink.trim()) {
      setScheduleStatus({ type: "error", message: d("Paste the Google Meet link for this class.", "Pega el enlace de Google Meet de esta clase.") });
      return;
    }

    try {
      const created = await createClass(newTitle, newGroup, `${newDate} ${newTime}`, newMeetLink.trim());
      setScheduleStatus({
        type: "success",
        message: d(`${created.title} was scheduled for ${classGroupLabel(newGroup)}.`, `${created.title} se programó para ${classGroupLabel(newGroup)}.`)
      });
      setNewTitle("");
      setNewDate("");
      setNewTime("");
      setNewMeetLink("");
    } catch (error: any) {
      setScheduleStatus({
        type: "error",
        message: error?.message || d("Unable to reach the scheduling server.", "No se puede acceder al servidor de programación.")
      });
    }
  };

  // Launch live session
  const handleLaunchClass = async (cls: any) => {
    try {
      const response = await fetch(`/api/live-sessions/${cls.id}/start`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || d("The live classroom could not start.", "No se pudo iniciar el aula en vivo."));
      }
      setCurrentActiveRoom({ ...cls, roomUrl: payload.room_url, joinToken: payload.join_token, provider: payload.provider });
      setScheduledClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: "Live" } : c));
      setProgressRefreshKey(prev => prev + 1);
    } catch (error: any) {
      alert(error?.message || d("The live classroom could not start.", "No se pudo iniciar el aula en vivo."));
    }
  };

  // One click: create a class for the current GMT time and launch it.
  const [startingNow, setStartingNow] = useState(false);
  const handleStartClassNow = async () => {
    if (startingNow || currentActiveRoom) return;
    setScheduleStatus(null);
    if (needsMeetLink && !newMeetLink.trim()) {
      setScheduleStatus({ type: "error", message: d("Paste the Google Meet link for this class first.", "Primero pega el enlace de Google Meet de esta clase.") });
      return;
    }
    setStartingNow(true);
    try {
      const nowGmt = new Date().toISOString().slice(0, 16).replace("T", " ");
      const title = newTitle.trim() || d(`${classGroupLabel(newGroup)} live class`, `Clase en vivo ${classGroupLabel(newGroup)}`);
      const created = await createClass(title, newGroup, nowGmt, newMeetLink.trim());
      setNewTitle("");
      setNewMeetLink("");
      await handleLaunchClass(created);
    } catch (error: any) {
      setScheduleStatus({
        type: "error",
        message: error?.message || d("The live classroom could not start.", "No se pudo iniciar el aula en vivo.")
      });
    } finally {
      setStartingNow(false);
    }
  };

  // Attach or change the Meet link of an already-scheduled class.
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);

  const startEditingLink = (cls: any) => {
    setEditingLinkId(cls.id);
    setLinkDraft(cls.link || "");
    setLinkError(null);
  };

  const handleSaveMeetLink = async (cls: any) => {
    if (!linkDraft.trim()) {
      setLinkError(d("Paste the Google Meet link first.", "Primero pega el enlace de Google Meet."));
      return;
    }
    setSavingLink(true);
    setLinkError(null);
    try {
      const response = await fetch(`/api/live-sessions/${cls.id}/meeting-link`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_link: linkDraft.trim() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || d("The Meet link could not be saved.", "No se pudo guardar el enlace de Meet."));
      }
      setScheduledClasses(prev => prev.map(c => c.id === cls.id ? { ...c, link: payload.meeting_link } : c));
      setEditingLinkId(null);
    } catch (error: any) {
      setLinkError(error?.message || d("The Meet link could not be saved.", "No se pudo guardar el enlace de Meet."));
    } finally {
      setSavingLink(false);
    }
  };

  // End live class
  const handleEndClass = async () => {
    if (!currentActiveRoom) return;
    const roomId = currentActiveRoom.id;
    const response = await fetch(`/api/live-sessions/${roomId}/end`, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      alert(payload.detail || d("The live classroom could not be ended.", "No se pudo finalizar el aula en vivo."));
      return;
    }
    setScheduledClasses(prev => prev.map(c => c.id === roomId ? { ...c, status: "Completed" } : c));
    setCurrentActiveRoom(null);
    setProgressRefreshKey(prev => prev + 1);
  };

  // Send live chat teacher reply
  const handleSendTeacherReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomMessage.trim()) return;
    if (await sendRoomChat(activeRoomMessage)) {
      setActiveRoomMessage("");
    }
  };

  // Upload Shared Lesson Note
  const handleAddNoteRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteUploadStatus(null);
    if (!noteTitle || !noteFile) {
      setNoteUploadStatus({ type: "error", message: d("Enter a title and select a file.", "Introduce un título y selecciona un archivo.") });
      return;
    }
    if (noteFile.size > 4 * 1024 * 1024) {
      setNoteUploadStatus({
        type: "error",
        message: d("Choose a file no larger than 4 MB.", "Elige un archivo de no más de 4 MB.")
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", noteTitle);
    const noteGroup = groupByCode(noteGroupCode);
    formData.append("course_level", noteGroup.level);
    formData.append("class_group", classGroupValue(noteGroup));
    formData.append("created_by", teacherName);
    formData.append("file", noteFile);

    try {
      const response = await fetch("/api/lesson-notes", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || d("The file could not be uploaded.", "No se pudo subir el archivo."));
      }

      setPublishedRefreshKey((key) => key + 1);
      setNoteUploadStatus({
        type: "success",
        message: d(`Shared with ${classGroupLabel(noteGroup)} students.`, `Compartido con los estudiantes de ${classGroupLabel(noteGroup)}.`)
      });
      setNoteTitle("");
      setNoteFile(null);
      const input = document.getElementById("teacher-material-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (error: any) {
      setNoteUploadStatus({ type: "error", message: error?.message || d("Upload failed.", "Error al subir el archivo.") });
    }
  };

  // Upload Recording
  const handleAddRecordingRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle || !recVideoUrl) return;
    const recGroup = groupByCode(recGroupCode);

    const response = await fetch("/api/recordings/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: recTitle,
        teacher_name: teacherName,
        course_level: recGroup.level,
        class_group: classGroupValue(recGroup),
        video_url: recVideoUrl,
        duration: "50 mins",
        description: recDescription || "Class discussion capture"
      })
    });
    if (!response.ok) return;
    setPublishedRefreshKey((key) => key + 1);
    alert(d("Práctico! Recording successfully published inside the Student Recorded Class Archive.", "¡Práctico! Grabación publicada con éxito en el Archivo de Clases Grabadas del estudiante."));
    setRecTitle("");
    setRecDescription("");
    setRecVideoUrl("");
  };

  useEffect(() => {
    const group = groupByCode(attendanceGroupCode);
    setAttendanceError(null);
    fetch(`/api/tutor/group-attendance?course_level=${group.level}&class_group=${encodeURIComponent(classGroupValue(group))}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setAttendanceSheet(data))
      .catch(() => setAttendanceError(d("The attendance sheet could not be loaded.", "No se pudo cargar la hoja de asistencia.")));
  }, [attendanceGroupCode, progressRefreshKey]);

  const handleMarkAttendance = async (sessionId: number, studentCode: string, status: string) => {
    const key = String(sessionId);
    const previous = attendanceSheet.marks[key]?.[studentCode] || "";
    const applyMark = (value: string) => setAttendanceSheet((sheet) => {
      const sessionMarks = { ...(sheet.marks[key] || {}) };
      if (value) sessionMarks[studentCode] = value; else delete sessionMarks[studentCode];
      return { ...sheet, marks: { ...sheet.marks, [key]: sessionMarks } };
    });
    applyMark(status);
    setAttendanceError(null);
    const response = await fetch("/api/attendance/manual", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, student_id_code: studentCode, status })
    }).catch(() => null);
    if (!response?.ok) {
      applyMark(previous);
      const payload = await response?.json().catch(() => null);
      setAttendanceError(payload?.detail || d("That attendance mark could not be saved.", "No se pudo guardar esa asistencia."));
    }
  };

  const handleAddPastClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastDate || !pastTime) return;
    setAttendanceError(null);
    try {
      await createClass(pastTitle.trim() || d("Class", "Clase"), groupByCode(attendanceGroupCode), `${pastDate} ${pastTime}`, undefined, true);
      setPastTitle("");
      setPastDate("");
      setPastTime("");
    } catch (error: any) {
      setAttendanceError(error?.message || d("The class could not be added.", "No se pudo añadir la clase."));
    }
  };

  // Gradebook for one school: the tutor's assessments x students, scores typed in by hand.
  type Gradebook = { students: any[]; assessments: any[]; scores: Record<string, Record<string, { score: number; remarks?: string | null }>> };
  const [gradeGroupCode, setGradeGroupCode] = useState(tutorGroups[0].code);
  const [gradebookRefresh, setGradebookRefresh] = useState(0);
  const [gradebook, setGradebook] = useState<Gradebook>({ students: [], assessments: [], scores: {} });
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState("");
  const [newAssessmentMax, setNewAssessmentMax] = useState("100");
  const [newAssessmentDate, setNewAssessmentDate] = useState("");
  // The score whose comment the tutor is writing, and the text so far.
  const [commentTarget, setCommentTarget] = useState<{ assessment: any; student: any } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  useEffect(() => {
    const group = groupByCode(gradeGroupCode);
    setGradeError(null);
    setGradeDrafts({});
    setCommentTarget(null);
    fetch(`/api/tutor/gradebook?course_level=${group.level}&class_group=${encodeURIComponent(classGroupValue(group))}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setGradebook(data))
      .catch(() => setGradeError(d("The gradebook could not be loaded.", "No se pudo cargar la libreta de calificaciones.")));
  }, [gradeGroupCode, gradebookRefresh]);

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newAssessmentTitle.trim();
    if (!title) return;
    const group = groupByCode(gradeGroupCode);
    setGradeError(null);
    const response = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        course_level: group.level,
        class_group: classGroupValue(group),
        max_score: Number(newAssessmentMax) || 100,
        assessed_on: newAssessmentDate || null
      })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (!response?.ok) {
      setGradeError((typeof payload?.detail === "string" && payload.detail) || d("The assessment could not be added.", "No se pudo añadir la evaluación."));
      return;
    }
    setGradebook((book) => ({ ...book, assessments: [...book.assessments, payload] }));
    setNewAssessmentTitle("");
    setNewAssessmentDate("");
  };

  const handleDeleteAssessment = async (assessment: any) => {
    if (!window.confirm(d(`Delete "${assessment.title}" and all its scores?`, `¿Eliminar "${assessment.title}" y todas sus calificaciones?`))) return;
    setGradeError(null);
    const response = await fetch(`/api/assessments/${assessment.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setGradeError(d("The assessment could not be deleted.", "No se pudo eliminar la evaluación."));
      return;
    }
    setGradebook((book) => {
      const scores = { ...book.scores };
      delete scores[String(assessment.id)];
      return { ...book, assessments: book.assessments.filter((a) => a.id !== assessment.id), scores };
    });
  };

  // Saves a typed score when the tutor leaves the box; an empty box clears the mark.
  const handleSaveScore = async (assessment: any, studentCode: string) => {
    const key = `${assessment.id}:${studentCode}`;
    const draft = gradeDrafts[key];
    if (draft === undefined) return;
    const clearDraft = () => setGradeDrafts((drafts) => {
      const next = { ...drafts };
      delete next[key];
      return next;
    });
    const stored = gradebook.scores[String(assessment.id)]?.[studentCode]?.score;
    const text = draft.trim();
    const score = text === "" ? null : Number(text);
    if (score === (stored ?? null)) return clearDraft();
    if (score !== null && (Number.isNaN(score) || score < 0 || score > assessment.max_score)) {
      setGradeError(d(`Scores for "${assessment.title}" must be between 0 and ${assessment.max_score}.`, `Las calificaciones de "${assessment.title}" deben estar entre 0 y ${assessment.max_score}.`));
      return clearDraft();
    }
    setGradeError(null);
    const response = await fetch(`/api/assessments/${assessment.id}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id_code: studentCode, score })
    }).catch(() => null);
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setGradeError((typeof payload?.detail === "string" && payload.detail) || d("That score could not be saved.", "No se pudo guardar esa calificación."));
      return clearDraft();
    }
    setGradebook((book) => {
      const assessmentScores = { ...(book.scores[String(assessment.id)] || {}) };
      if (score === null) delete assessmentScores[studentCode];
      else assessmentScores[studentCode] = { ...assessmentScores[studentCode], score };
      return { ...book, scores: { ...book.scores, [String(assessment.id)]: assessmentScores } };
    });
    clearDraft();
  };

  const openComment = (assessment: any, student: any) => {
    setGradeError(null);
    setCommentTarget({ assessment, student });
    setCommentDraft(gradebook.scores[String(assessment.id)]?.[student.student_id_code]?.remarks || "");
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentTarget) return;
    const { assessment, student } = commentTarget;
    const stored = gradebook.scores[String(assessment.id)]?.[student.student_id_code];
    if (!stored) return;
    setCommentSaving(true);
    setGradeError(null);
    const response = await fetch(`/api/assessments/${assessment.id}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id_code: student.student_id_code, score: stored.score, remarks: commentDraft })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setCommentSaving(false);
    if (!response?.ok) {
      setGradeError((typeof payload?.detail === "string" && payload.detail) || d("That comment could not be saved.", "No se pudo guardar ese comentario."));
      return;
    }
    setGradebook((book) => {
      const assessmentScores = { ...(book.scores[String(assessment.id)] || {}) };
      assessmentScores[student.student_id_code] = { score: payload.score, remarks: payload.remarks };
      return { ...book, scores: { ...book.scores, [String(assessment.id)]: assessmentScores } };
    });
    setCommentTarget(null);
  };

  // Homework for one school: set it, see who handed in, open files and grade them.
  type HomeworkSubmissionRow = { student_id_code: string; full_name: string; file_url: string; file_name: string; file_size?: string; note?: string | null; submitted_at: string; late: boolean; score: number | null; remarks?: string | null };
  type HomeworkItem = { id: number; title: string; instructions?: string | null; due_date?: string | null; assessment_id: number | null; max_score: number | null; submissions: HomeworkSubmissionRow[] };
  const [hwGroupCode, setHwGroupCode] = useState(tutorGroups[0].code);
  const [hwData, setHwData] = useState<{ students: any[]; homework: HomeworkItem[] }>({ students: [], homework: [] });
  const [hwRefresh, setHwRefresh] = useState(0);
  const [hwTitle, setHwTitle] = useState("");
  const [hwInstructions, setHwInstructions] = useState("");
  const [hwDue, setHwDue] = useState("");
  const [hwMax, setHwMax] = useState("10");
  const [hwError, setHwError] = useState<string | null>(null);
  const [hwSaving, setHwSaving] = useState(false);
  const [openHomeworkId, setOpenHomeworkId] = useState<number | null>(null);
  const [hwGradeDrafts, setHwGradeDrafts] = useState<Record<string, { score: string; remarks: string }>>({});
  const [hwGradeSaved, setHwGradeSaved] = useState<string | null>(null);

  useEffect(() => {
    const group = groupByCode(hwGroupCode);
    setHwError(null);
    fetch(`/api/tutor/homework?course_level=${group.level}&class_group=${encodeURIComponent(classGroupValue(group))}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setHwData(data))
      .catch(() => setHwError(d("Homework could not be loaded.", "No se pudieron cargar las tareas.")));
  }, [hwGroupCode, hwRefresh]);

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;
    const group = groupByCode(hwGroupCode);
    setHwSaving(true);
    setHwError(null);
    const response = await fetch("/api/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: hwTitle.trim(),
        instructions: hwInstructions.trim() || null,
        course_level: group.level,
        class_group: classGroupValue(group),
        due_date: hwDue || null,
        max_score: Number(hwMax) || 10
      })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setHwSaving(false);
    if (!response?.ok) {
      setHwError((typeof payload?.detail === "string" && payload.detail) || d("The homework could not be set.", "No se pudo publicar la tarea."));
      return;
    }
    setHwTitle("");
    setHwInstructions("");
    setHwDue("");
    setOpenHomeworkId(payload.id);
    setHwRefresh((n) => n + 1);
    setGradebookRefresh((n) => n + 1);
  };

  const handleDeleteHomework = async (homework: HomeworkItem) => {
    if (!window.confirm(d(
      `Delete "${homework.title}"? Students' files and scores for it will be removed too.`,
      `¿Eliminar "${homework.title}"? También se borrarán los archivos y las calificaciones de los estudiantes.`
    ))) return;
    const response = await fetch(`/api/homework/${homework.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setHwError(d("The homework could not be deleted.", "No se pudo eliminar la tarea."));
      return;
    }
    setHwRefresh((n) => n + 1);
    setGradebookRefresh((n) => n + 1);
  };

  const handleGradeSubmission = async (homework: HomeworkItem, sub: HomeworkSubmissionRow) => {
    if (!homework.assessment_id) return;
    const key = `${homework.id}:${sub.student_id_code}`;
    const draft = hwGradeDrafts[key] ?? { score: sub.score === null ? "" : String(sub.score), remarks: sub.remarks || "" };
    const text = draft.score.trim();
    const score = text === "" ? null : Number(text);
    if (score !== null && (Number.isNaN(score) || score < 0 || score > (homework.max_score ?? 0))) {
      setHwError(d(`The score must be between 0 and ${homework.max_score}.`, `La calificación debe estar entre 0 y ${homework.max_score}.`));
      return;
    }
    setHwError(null);
    const response = await fetch(`/api/assessments/${homework.assessment_id}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id_code: sub.student_id_code, score, remarks: draft.remarks })
    }).catch(() => null);
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setHwError((typeof payload?.detail === "string" && payload.detail) || d("That grade could not be saved.", "No se pudo guardar esa calificación."));
      return;
    }
    setHwGradeDrafts((drafts) => {
      const next = { ...drafts };
      delete next[key];
      return next;
    });
    setHwGradeSaved(key);
    setTimeout(() => setHwGradeSaved((current) => (current === key ? null : current)), 2500);
    setHwRefresh((n) => n + 1);
    setGradebookRefresh((n) => n + 1);
  };

  const formatSubmittedAt = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const studentAverage = (studentCode: string) => {
    const percents = gradebook.assessments
      .map((a) => gradebook.scores[String(a.id)]?.[studentCode]?.score)
      .map((score, i) => (score === undefined ? null : (score / gradebook.assessments[i].max_score) * 100))
      .filter((p): p is number => p !== null);
    return percents.length ? `${(percents.reduce((x, y) => x + y, 0) / percents.length).toFixed(0)}%` : "–";
  };

  useEffect(() => {
    const isMine = (value?: string) => {
      const normalized = (value || "").trim().toLowerCase();
      return [teacherEmail, teacherName, teacherDisplayName].some((own) => own && own.toLowerCase() === normalized);
    };
    fetch("/api/lesson-notes")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setMyNotes(Array.isArray(data) ? data.filter((note: any) => isMine(note.created_by)) : []))
      .catch(() => {});
    fetch("/api/recordings")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setMyRecordings(Array.isArray(data) ? data.filter((rec: any) => isMine(rec.teacher_name)) : []))
      .catch(() => {});
    fetch("/api/announcements")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setMyAnnouncements(Array.isArray(data) ? data.filter((ann: any) => isMine(ann.created_by)) : []))
      .catch(() => {});
  }, [publishedRefreshKey, teacherEmail, teacherName, teacherDisplayName]);

  const handleDeletePublished = async (kind: "class" | "note" | "recording" | "announcement", item: any) => {
    const warning = kind === "class"
      ? d(`Delete the class "${item.title}"? Students will no longer see it, and its attendance marks are deleted too.`, `¿Eliminar la clase "${item.title}"? Los estudiantes ya no la verán y también se borrará su asistencia.`)
      : d(`Delete "${item.title}"? Students will no longer see it.`, `¿Eliminar "${item.title}"? Los estudiantes ya no lo verán.`);
    if (!window.confirm(warning)) return;
    setDeleteError(null);
    const url = {
      class: `/api/live-sessions/${item.id}`,
      note: `/api/lesson-notes/${item.id}`,
      recording: `/api/recordings/${item.id}`,
      announcement: `/api/announcements/${item.id}`,
    }[kind];
    const response = await fetch(url, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setDeleteError(payload?.detail || d("It could not be deleted.", "No se pudo eliminar."));
      return;
    }
    if (kind === "class") {
      setScheduledClasses((prev) => prev.filter((cls) => cls.id !== item.id));
      setProgressRefreshKey((key) => key + 1);
    } else {
      setPublishedRefreshKey((key) => key + 1);
    }
  };

  const attendanceRows = attendanceSheet.students.map((student: any) => {
    const statuses = attendanceSheet.sessions.map((session: any) => attendanceSheet.marks[String(session.id)]?.[student.student_id_code] || "");
    const present = statuses.filter((value) => value === "Present").length;
    const late = statuses.filter((value) => value === "Late").length;
    const absent = statuses.filter((value) => value === "Absent").length;
    const marked = present + late + absent;
    return { ...student, statuses, present, late, absent, pct: marked ? Math.round(((present + late) / marked) * 100) : 0 };
  });

  // Export Attendance CSV
  const handleExportAttendanceCSV = () => {
    const csvCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const sessionHeaders = attendanceSheet.sessions.map((session: any) => csvCell(`${session.title} (${session.date_time})`));
    const headers = ["Student Code", "Student Name", ...sessionHeaders, "Present", "Late", "Absent", "Attendance %"].join(",") + "\n";
    const rows = attendanceRows
      .map((row) => [csvCell(row.student_id_code), csvCell(row.full_name), ...row.statuses.map(csvCell), row.present, row.late, row.absent, `${row.pct}%`].join(","))
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SeroEstar_Attendance_${groupByCode(attendanceGroupCode).code}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Export Class Chat logs
  const handleExportChatLogs = () => {
    const logs = roomChatMessages.map(m => `[${m.time}] ${m.sender}: ${m.text}`).join("\n");
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Class_Chat_Logs_${currentActiveRoom?.title.replace(/\s+/g, "_")}.txt`;
    a.click();
  };

  const filteredRoster = attendanceRows.filter((row) =>
    String(row.full_name).toLowerCase().includes(rosterSearch.toLowerCase()) ||
    String(row.student_id_code).toLowerCase().includes(rosterSearch.toLowerCase())
  );

  const progressCards = [
    {
      title: d("Hours Taught", "Horas Enseñadas"),
      value: `${teacherProgress?.total_hours ?? 0}h`,
      detail: d("Real start/end timestamps", "Tiempos reales de inicio/fin"),
      icon: Clock,
      color: "text-teal-600"
    },
    {
      title: d("Classes Given", "Clases Impartidas"),
      value: teacherProgress?.classes_given ?? 0,
      detail: d(`${teacherProgress?.completed_classes ?? 0} completed`, `${teacherProgress?.completed_classes ?? 0} completadas`),
      icon: Video,
      color: "text-indigo-600"
    },
    {
      title: d("Teacher Attendance", "Asistencia del Profesor"),
      value: `${teacherProgress?.attendance?.rate ?? 100}%`,
      detail: d(`${teacherProgress?.attendance?.late ?? 0} late sessions`, `${teacherProgress?.attendance?.late ?? 0} sesiones tarde`),
      icon: CheckCircle,
      color: "text-emerald-600"
    },
    {
      title: d("Auto-Marked Absent", "Ausencias Automáticas"),
      value: teacherProgress?.attendance?.absent ?? 0,
      detail: d("Missed sessions count as 0 hours", "Las sesiones perdidas cuentan como 0 horas"),
      icon: VideoOff,
      color: "text-rose-600"
    }
  ];

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-8" id="teacher-portal-viewport">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10 scale-150">
          <Users size={250} />
        </div>
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
            <span>{d("TEACHER CONTROL PANEL", "PANEL DE CONTROL DEL PROFESOR")}</span>
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
            {d(`Hello, ${teacherDisplayName}!`, `¡Hola, ${teacherDisplayName}!`)}
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            {d(
              "Create online interactive sessions with automatic logs, manage attendance percentages, or publish lesson records to active courses.",
              "Crea sesiones interactivas en línea con registros automáticos, administra porcentajes de asistencia o publica registros de lecciones en cursos activos."
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10">
          <ChangePasswordButton
            lang={lang}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
          />
          <button
            onClick={onExit}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 scroll-smooth"
          >
            <LogOut size={14} className="mr-2" />
            <span>{d("Exit Portal", "Salir del Portal")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {progressCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
              <div className={`p-3.5 bg-slate-50 rounded-2xl ${card.color} shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.title}</span>
                <span className="font-sans font-black text-lg text-slate-800 block">{card.value}</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">{card.detail}</span>
              </div>
            </div>
          );
        })}
      </div>

      <MessagesPanel role="tutor" d={d} />

      {currentActiveRoom ? (
        /* LIVE CALL CLASS INTERACTIVE WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {/* HD Livestream output screen */}
          <div className="lg:col-span-2 bg-slate-950 flex flex-col justify-between text-white relative min-h-[380px]">
            {/* Header controls active status */}
            <div className="bg-slate-900/80 backdrop-blur-xs p-4 flex justify-between items-center z-10">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">{d("LIVESTREAM CONSOLE", "CONSOLA DE TRANSMISIÓN EN VIVO")}</span>
                <h3 className="font-bold text-sm tracking-tight">{currentActiveRoom.title}</h3>
              </div>
              <button
                onClick={handleEndClass}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center"
              >
                <VideoOff size={14} className="mr-1.5" />
                <span>{d("End Session", "Terminar Sesión")}</span>
              </button>
            </div>

            {/* Embedded live room view */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-4">
              {currentActiveRoom.provider === "meet" && currentActiveRoom.roomUrl ? (
                <div className="space-y-4 max-w-sm">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40">
                    <Video size={30} className="text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-heading font-black text-lg text-emerald-300">{d("Your class runs in Google Meet", "Tu clase se realiza en Google Meet")}</span>
                    <p className="text-xs text-slate-400">
                      {d(
                        `Students of the ${currentActiveRoom.level} level can join now. Keep this page open for the class chat, and press End Session here when you finish.`,
                        `Los estudiantes del nivel ${currentActiveRoom.level} ya pueden entrar. Mantén esta página abierta para el chat y pulsa Terminar Sesión aquí al acabar.`
                      )}
                    </p>
                  </div>
                  <a
                    href={currentActiveRoom.roomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    <Video size={14} className="mr-1.5" />
                    {d("Open Google Meet", "Abrir Google Meet")}
                  </a>
                </div>
              ) : currentActiveRoom.roomUrl ? (
                <LiveVideoRoom
                  roomUrl={currentActiveRoom.roomUrl}
                  token={currentActiveRoom.joinToken}
                  userName={teacherName}
                  owner
                />
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/40 animate-pulse">
                    <Video size={30} className="text-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-heading font-black text-lg text-orange-400 uppercase tracking-wide">{d("Your HD webcam output is live", "Tu cámara web HD está transmitiendo")}</span>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {d(
                        `Your voice and visual prompts are broadcasted to enrolled students of the ${currentActiveRoom.level} course level.`,
                        `Tu voz y estímulos visuales se transmiten a los estudiantes inscritos del nivel de curso ${currentActiveRoom.level}.`
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Class metadata bottom */}
            <div className="bg-slate-900/90 p-4 flex flex-wrap justify-between items-center gap-3 z-10 mt-auto border-t border-slate-800">
              <div className="flex space-x-3.5 text-xs text-slate-400">
                <span>{d("Active Peers: 3 Students", "Compañeros activos: 3 Estudiantes")}</span>
                <span>•</span>
                <span>{d("Resolution: 1080p WebRTC", "Resolución: 1080p WebRTC")}</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono leading-none">
                {d("ATTENDANCE RECORDS LOGGING AUTOMATICALLY", "REGISTRO DE ASISTENCIA AUTOMÁTICO EN CURSO")}
              </span>
            </div>
          </div>

          {/* Teacher live Chat controls */}
          <div className="bg-slate-50 border-l border-slate-200 flex flex-col justify-between h-[450px] lg:h-auto">
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
              <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">{d("Student Classroom Questions", "Preguntas de Estudiantes en Clase")}</span>
              <button
                onClick={handleExportChatLogs}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold border border-slate-200 transition"
                title={d("Download txt logs", "Descargar registros txt")}
              >
                {d("Download Chat logs", "Descargar Chat")}
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans max-h-[350px]">
              {roomChatMessages.map((m) => (
                <div key={m.id} className="flex flex-col space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-600 font-bold">{m.sender}</span>
                    <span className="text-slate-400">{m.time}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl text-xs leading-normal max-w-[90%] ${
                    m.role === "teacher" ? "bg-orange-50 text-orange-950 border border-orange-100 align-right self-end" : "bg-white text-slate-800 border border-slate-200"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {roomChatError && (
              <p role="alert" className="px-4 py-1.5 text-[10px] font-semibold text-red-600 bg-red-50 border-t border-red-100">{roomChatError}</p>
            )}
            {/* Teacher Message input */}
            <form onSubmit={handleSendTeacherReply} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                required
                placeholder={d("Reply to students in real-time...", "Responde a los estudiantes en tiempo real...")}
                value={activeRoomMessage}
                onChange={(e) => setActiveRoomMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <button
                type="submit"
                className="p-2.5 bg-orange-550 hover:bg-orange-450 rounded-xl text-white font-bold shrink-0 cursor-pointer transition"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ASSIGNED COURSES & SCHEDULED INVENTORIES */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assigned Course boxes */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">{d("Your Assigned Groups", "Tus Grupos Asignados")}</h3>
            <div className="space-y-3.5">
              {tutorGroups.map(group => (
                <div key={group.code} className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{d(`Level ${group.level}`, `Nivel ${group.level}`)}</span>
                  <h4 className="font-bold text-slate-800 text-xs leading-none">{classGroupLabel(group)}</h4>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule class and Live Trigger list */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">{d("Scheduled Live Sessions", "Sesiones en Vivo Programadas")}</h3>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{d("Sierra Leone Time (GMT)", "Hora de Sierra Leona (GMT)")}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <p className="text-[11px] text-emerald-900 font-semibold leading-snug">
                  {needsMeetLink
                    ? d(`Start a ${classGroupLabel(newGroup)} class right away. Paste its Google Meet link below first; the title is optional.`, `Inicia una clase de ${classGroupLabel(newGroup)} ahora mismo. Primero pega abajo su enlace de Google Meet; el título es opcional.`)
                    : d(`Start a ${classGroupLabel(newGroup)} class right away. It uses the title below if you've typed one.`, `Inicia una clase de ${classGroupLabel(newGroup)} ahora mismo. Usa el título de abajo si escribiste uno.`)}
                </p>
                <button
                  type="button"
                  onClick={handleStartClassNow}
                  disabled={startingNow || Boolean(currentActiveRoom)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-sans text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
                >
                  <Video size={14} className="mr-1.5" />
                  {startingNow ? d("Starting...", "Iniciando...") : d("Start class now", "Iniciar clase ahora")}
                </button>
              </div>

              {/* Scheduled class lists */}
              <div className="space-y-3 max-h-[190px] overflow-y-auto">
                {scheduledClasses.map(cls => (
                  <div key={cls.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center flex-wrap gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2.5 py-0.2 rounded-full font-mono">
                          {cls.level} · {contentAudienceLabel(cls.level, cls.classGroup)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{cls.date} GMT</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">{cls.title}</h4>
                      {usesMeet && cls.status !== "Completed" && cls.status !== "Teacher Absent" && editingLinkId !== cls.id && (
                        <div className="flex items-center gap-2 text-[10px] font-semibold pt-0.5">
                          {cls.link ? (
                            <span className="text-emerald-700">{d("Meet link added", "Enlace de Meet añadido")}</span>
                          ) : (
                            <span className="text-amber-700">{d("No Meet link yet", "Aún sin enlace de Meet")}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditingLink(cls)}
                            className="text-teal-700 hover:text-teal-600 underline cursor-pointer"
                          >
                            {cls.link ? d("Change link", "Cambiar enlace") : d("Add Meet link", "Añadir enlace de Meet")}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 shrink-0">
                      {cls.status === "Completed" || cls.status === "Teacher Absent" ? (
                        <span className={`px-4 py-2 font-mono text-xs rounded-xl font-bold ${
                          cls.status === "Teacher Absent" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {cls.status === "Teacher Absent" ? d("Teacher Absent: 0h", "Profesor Ausente: 0h") : d("Completed Session", "Sesión Completada")}
                        </span>
                      ) : (
                        <button
                          onClick={() => (needsMeetLink && !cls.link ? startEditingLink(cls) : handleLaunchClass(cls))}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                        >
                          {d("Start HD Livestream", "Iniciar Transmisión HD")}
                        </button>
                      )}
                    </div>

                    {editingLinkId === cls.id && (
                      <div className="w-full space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            autoFocus
                            aria-label={d("Google Meet link", "Enlace de Google Meet")}
                            placeholder="https://meet.google.com/abc-defg-hij"
                            value={linkDraft}
                            onChange={(e) => setLinkDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveMeetLink(cls); } }}
                            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveMeetLink(cls)}
                            disabled={savingLink}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                          >
                            {savingLink ? d("Saving...", "Guardando...") : d("Save", "Guardar")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLinkId(null)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                          >
                            {d("Cancel", "Cancelar")}
                          </button>
                        </div>
                        {linkError && <p role="alert" className="text-[10px] font-semibold text-rose-600">{linkError}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add class simple form inline */}
            <form onSubmit={handleCreateClass} className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-6 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  placeholder={d("Class Title (e.g. Past tense story mapping)", "Título de la clase (ej. Mapeo de historias en pasado)")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.8 text-xs focus:outline-hidden"
                />
              </div>
              <div className="sm:col-span-1">
                {schoolSelect(newGroupCode, setNewGroupCode, "w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.8 text-xs text-slate-600 font-bold focus:outline-hidden")}
              </div>
              <div className="sm:col-span-1">
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.8 text-xs text-slate-500 focus:outline-hidden"
                />
              </div>
              <div className="sm:col-span-1">
                <input
                  type="time"
                  required
                  title={d("Enter the time in Sierra Leone Time (GMT).", "Introduce la hora en horario de Sierra Leona (GMT).")}
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.8 text-xs text-slate-500 focus:outline-hidden"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold font-sans text-xs transition cursor-pointer"
                >
                  <Plus size={14} className="mr-1.5" />
                  <span>{d("Schedule", "Programar")}</span>
                </button>
              </div>
              {usesMeet && (
                <div className="sm:col-span-6">
                  <input
                    type="url"
                    required={needsMeetLink}
                    placeholder={liveConfig.meet_auto_create
                      ? d("Google Meet link (optional, one is created automatically)", "Enlace de Google Meet (opcional, se crea automáticamente)")
                      : d("Google Meet link (e.g. https://meet.google.com/abc-defg-hij)", "Enlace de Google Meet (ej. https://meet.google.com/abc-defg-hij)")}
                    value={newMeetLink}
                    onChange={(e) => setNewMeetLink(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.8 text-xs focus:outline-hidden"
                  />
                </div>
              )}
              <span className="sm:col-span-6 text-[9px] text-slate-400 font-semibold -mt-1">
                {d("Times are in Sierra Leone Time (GMT).", "Los horarios están en horario de Sierra Leona (GMT).")}
                {localTimeHint && ` ${d(`That is ${localTimeHint} your local time.`, `Equivale a las ${localTimeHint} en tu hora local.`)}`}
              </span>
              {scheduleStatus && (
                <div
                  role="status"
                  className={`sm:col-span-6 rounded-xl border px-3 py-2 text-xs font-semibold ${
                    scheduleStatus.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {scheduleStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Grid Middle: 1. Attendance Roster list, 2. Materials Uploader */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance sheet: one school at a time, marks editable by the tutor */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 min-w-0">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">
              {d("Attendance", "Asistencia")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {schoolSelect(attendanceGroupCode, setAttendanceGroupCode, "bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 focus:outline-hidden")}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={d("Search students...", "Buscar estudiantes...")}
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-7.5 pr-2 py-1 text-[11px] focus:outline-hidden"
                />
              </div>
              <button
                onClick={handleExportAttendanceCSV}
                className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-150 border border-teal-200/60 rounded-xl text-teal-800 font-bold font-sans text-[11px] cursor-pointer transition flex items-center"
              >
                <FileDown size={12} className="mr-1.5" />
                <span>{d("Export CSV", "Exportar CSV")}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAddPastClass} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <input
              type="text"
              placeholder={d("Past class title (optional)", "Título de la clase pasada (opcional)")}
              value={pastTitle}
              onChange={(e) => setPastTitle(e.target.value)}
              className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
            />
            <input
              type="date"
              required
              aria-label={d("Date of the past class", "Fecha de la clase pasada")}
              max={new Date().toISOString().split("T")[0]}
              value={pastDate}
              onChange={(e) => setPastDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-500 focus:outline-hidden"
            />
            <input
              type="time"
              required
              aria-label={d("Time of the past class (GMT)", "Hora de la clase pasada (GMT)")}
              value={pastTime}
              onChange={(e) => setPastTime(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-500 focus:outline-hidden"
            />
            <button
              type="submit"
              className="col-span-2 sm:col-span-1 inline-flex justify-center items-center py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
            >
              <Plus size={13} className="mr-1" />
              {d("Add past class", "Añadir clase pasada")}
            </button>
          </form>

          {attendanceError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{attendanceError}</p>
          )}

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="p-3 sticky left-0 bg-slate-50">{d("Student", "Estudiante")}</th>
                  {attendanceSheet.sessions.map((session: any) => (
                    <th key={session.id} className="p-3 text-center whitespace-nowrap normal-case">
                      <span className="block text-slate-600">{session.title}</span>
                      <span className="block font-mono font-semibold">{session.date_time}</span>
                    </th>
                  ))}
                  <th className="p-3 text-right">{d("Rate", "Tasa")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.length === 0 && (
                  <tr>
                    <td colSpan={attendanceSheet.sessions.length + 2} className="p-6 text-center text-xs text-slate-400 font-semibold">
                      {attendanceSheet.students.length === 0
                        ? d("No students are registered in this school's group yet.", "Aún no hay estudiantes registrados en el grupo de esta escuela.")
                        : d("No students match your search.", "Ningún estudiante coincide con tu búsqueda.")}
                    </td>
                  </tr>
                )}
                {filteredRoster.map((row) => (
                  <tr key={row.student_id_code} className="hover:bg-slate-50">
                    <td className="p-3 sticky left-0 bg-white">
                      <span className="block font-semibold text-slate-800 whitespace-nowrap">{row.full_name}</span>
                      <span className="block font-mono text-[10px] font-bold text-teal-700">{row.student_id_code}</span>
                    </td>
                    {attendanceSheet.sessions.map((session: any, index: number) => (
                      <td key={session.id} className="p-2 text-center">
                        <select
                          aria-label={d(`${row.full_name}, ${session.title}`, `${row.full_name}, ${session.title}`)}
                          value={row.statuses[index]}
                          onChange={(e) => handleMarkAttendance(session.id, row.student_id_code, e.target.value)}
                          className={`rounded-lg border px-1.5 py-1 text-[11px] font-bold focus:outline-hidden ${
                            row.statuses[index] === "Present" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : row.statuses[index] === "Late" ? "border-amber-200 bg-amber-50 text-amber-700"
                              : row.statuses[index] === "Absent" ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-white text-slate-400"
                          }`}
                        >
                          <option value="">–</option>
                          <option value="Present">{d("Present", "Presente")}</option>
                          <option value="Late">{d("Late", "Tarde")}</option>
                          <option value="Absent">{d("Absent", "Ausente")}</option>
                        </select>
                      </td>
                    ))}
                    <td className="p-3 text-right font-mono font-extrabold text-teal-700">{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {attendanceSheet.sessions.length === 0 && (
            <p className="text-[11px] text-slate-400 font-semibold">
              {d("No classes for this school yet. Add the classes you've already taught with \"Add past class\", then mark each student.", "Aún no hay clases para esta escuela. Añade las clases que ya diste con \"Añadir clase pasada\" y marca a cada estudiante.")}
            </p>
          )}
        </div>

        {/* Note Lesson publishing */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
              <FileText size={15} className="mr-1.5 text-teal-600" />
              <span>{d("Share Notes & Study Slides", "Compartir Notas y Diapositivas")}</span>
            </h3>
          </div>

          <form onSubmit={handleAddNoteRecord} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{d("Note Title", "Título de la Nota")}</label>
              <input
                type="text"
                required
                placeholder={d("Title (e.g. Subjunctive matrix cheatsheet)", "Título (ej. Resumen de la matriz del subjuntivo)")}
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{d("School", "Escuela")}</label>
                {schoolSelect(noteGroupCode, setNoteGroupCode, "w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-hidden text-slate-600 font-bold")}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{d("Select File", "Seleccionar Archivo")}</label>
                <label
                  htmlFor="teacher-material-file"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-600 font-bold cursor-pointer flex items-center gap-1.5 truncate"
                >
                  <Upload size={13} className="text-teal-600 shrink-0" />
                  <span className="truncate">{noteFile?.name || d("Choose file", "Elegir archivo")}</span>
                </label>
                <input
                  id="teacher-material-file"
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.mp3,.mp4"
                  onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <span className="text-[9px] text-slate-400 block">{d("Maximum 4 MB", "Máximo 4 MB")}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex justify-center items-center py-2 bg-teal-600 hover:bg-teal-550 text-white rounded-xl font-bold font-sans text-xs tracking-wide transition cursor-pointer"
            >
              <Upload size={14} className="mr-1.5" />
              <span>{d("Upload & Share with Students", "Subir y Compartir con Estudiantes")}</span>
            </button>
            {noteUploadStatus && (
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                noteUploadStatus.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}>
                {noteUploadStatus.message}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Homework: set it per school, open students' files and grade them */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 min-w-0 text-left">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
          <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
            <BookOpen size={15} className="text-teal-600 mr-2" />
            {d("Homework", "Tareas")}
          </h3>
          {schoolSelect(hwGroupCode, (code) => { setHwGroupCode(code); setOpenHomeworkId(null); }, "bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 focus:outline-hidden")}
        </div>

        <form onSubmit={handleCreateHomework} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-start">
          <input
            type="text"
            required
            maxLength={255}
            placeholder={d("Homework title, e.g. Describe your family", "Título de la tarea, p. ej. Describe a tu familia")}
            value={hwTitle}
            onChange={(e) => setHwTitle(e.target.value)}
            className="col-span-2 sm:col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
          />
          <input
            type="date"
            aria-label={d("Due date", "Fecha de entrega")}
            title={d("Due date", "Fecha de entrega")}
            value={hwDue}
            onChange={(e) => setHwDue(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-500 focus:outline-hidden"
          />
          <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-500">
            <span className="whitespace-nowrap">{d("Out of", "Sobre")}</span>
            <input
              type="number"
              min="1"
              max="1000"
              step="any"
              required
              value={hwMax}
              onChange={(e) => setHwMax(e.target.value)}
              className="w-full bg-transparent font-bold text-slate-700 focus:outline-hidden"
            />
          </label>
          <button
            type="submit"
            disabled={hwSaving}
            className="col-span-2 sm:col-span-1 inline-flex justify-center items-center py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs transition cursor-pointer"
          >
            <Plus size={13} className="mr-1" />
            {hwSaving ? d("Setting...", "Publicando...") : d("Set homework", "Publicar tarea")}
          </button>
          <textarea
            rows={2}
            maxLength={5000}
            placeholder={d("Instructions for students (optional)", "Instrucciones para los estudiantes (opcional)")}
            value={hwInstructions}
            onChange={(e) => setHwInstructions(e.target.value)}
            className="col-span-2 sm:col-span-6 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
          />
        </form>

        {hwError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{hwError}</p>
        )}

        {hwData.homework.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-semibold">
            {d("No homework for this school yet. Students see homework in their portal as soon as you set it, and it gets its own column in the gradebook.", "Aún no hay tareas para esta escuela. Los estudiantes ven la tarea en su portal en cuanto la publicas, y tiene su propia columna en la libreta de calificaciones.")}
          </p>
        ) : (
          <div className="space-y-3">
            {hwData.homework.map((homework) => {
              const isOpen = openHomeworkId === homework.id;
              const handedIn = new Set(homework.submissions.map((sub) => sub.student_id_code));
              const missing = hwData.students.filter((student: any) => !handedIn.has(student.student_id_code));
              const ungraded = homework.submissions.filter((sub) => sub.score === null).length;
              return (
                <div key={homework.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setOpenHomeworkId(isOpen ? null : homework.id)}
                      aria-expanded={isOpen}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="block font-extrabold text-xs text-slate-900">{homework.title}</span>
                      <span className="block text-[10px] font-mono text-slate-500">
                        {homework.due_date ? d(`Due ${homework.due_date}`, `Entrega ${homework.due_date}`) : d("No due date", "Sin fecha de entrega")}
                        {homework.max_score !== null ? ` · ${d(`out of ${homework.max_score}`, `sobre ${homework.max_score}`)}` : ""}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                        {d(`${homework.submissions.length} / ${hwData.students.length} handed in`, `${homework.submissions.length} / ${hwData.students.length} entregadas`)}
                      </span>
                      {ungraded > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          {d(`${ungraded} to grade`, `${ungraded} por calificar`)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenHomeworkId(isOpen ? null : homework.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 cursor-pointer"
                      >
                        {isOpen ? d("Close", "Cerrar") : d("Open", "Abrir")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHomework(homework)}
                        aria-label={d(`Delete ${homework.title}`, `Eliminar ${homework.title}`)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-3 space-y-3">
                      {homework.instructions && (
                        <p className="text-xs text-slate-600 whitespace-pre-line bg-white border border-slate-100 rounded-xl p-3">{homework.instructions}</p>
                      )}
                      {homework.submissions.length === 0 && (
                        <p className="text-[11px] text-slate-400 font-semibold">{d("Nobody has handed this in yet.", "Nadie ha entregado esta tarea todavía.")}</p>
                      )}
                      {homework.submissions.map((sub) => {
                        const key = `${homework.id}:${sub.student_id_code}`;
                        const draft = hwGradeDrafts[key] ?? { score: sub.score === null ? "" : String(sub.score), remarks: sub.remarks || "" };
                        const setDraft = (patch: Partial<{ score: string; remarks: string }>) =>
                          setHwGradeDrafts((drafts) => ({ ...drafts, [key]: { ...draft, ...patch } }));
                        return (
                          <div key={sub.student_id_code} className="rounded-xl border border-slate-100 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="min-w-0">
                                <span className="block font-semibold text-xs text-slate-800">{sub.full_name}</span>
                                <span className="block text-[10px] font-mono text-slate-400">
                                  {d(`Handed in ${formatSubmittedAt(sub.submitted_at)}`, `Entregada ${formatSubmittedAt(sub.submitted_at)}`)}
                                  {sub.late && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">{d("LATE", "TARDE")}</span>}
                                </span>
                              </div>
                              <a
                                href={sub.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold max-w-full"
                              >
                                <ExternalLink size={11} className="shrink-0" />
                                <span className="truncate">{sub.file_name}</span>
                                {sub.file_size && <span className="text-teal-600/70 font-mono shrink-0">({sub.file_size})</span>}
                              </a>
                            </div>
                            {sub.note && <p className="text-[11px] text-slate-500 italic">"{sub.note}"</p>}
                            {homework.assessment_id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max={homework.max_score ?? undefined}
                                    step="any"
                                    aria-label={d(`Score for ${sub.full_name}`, `Calificación de ${sub.full_name}`)}
                                    value={draft.score}
                                    onChange={(e) => setDraft({ score: e.target.value })}
                                    className="w-16 rounded-lg border border-slate-200 px-1.5 py-1 text-center font-bold text-slate-800 focus:outline-hidden"
                                  />
                                  <span>/ {homework.max_score}</span>
                                </label>
                                <input
                                  type="text"
                                  maxLength={2000}
                                  placeholder={d("Comment for the student (optional)", "Comentario para el estudiante (opcional)")}
                                  value={draft.remarks}
                                  onChange={(e) => setDraft({ remarks: e.target.value })}
                                  className="flex-1 min-w-[160px] rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleGradeSubmission(homework, sub)}
                                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  {hwGradeSaved === key ? d("Saved ✓", "Guardado ✓") : d("Save grade", "Guardar nota")}
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400">{d("This homework's gradebook column was deleted, so it can't be graded here.", "La columna de esta tarea se eliminó de la libreta, así que no se puede calificar aquí.")}</p>
                            )}
                          </div>
                        );
                      })}
                      {missing.length > 0 && (
                        <p className="text-[11px] text-slate-500">
                          <span className="font-bold">{d("Not handed in:", "Sin entregar:")}</span> {missing.map((student: any) => student.full_name).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gradebook: one school at a time, scores typed in by the tutor */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 min-w-0 text-left">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
          <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
            <Award size={15} className="text-teal-600 mr-2" />
            {d("Gradebook", "Calificaciones")}
          </h3>
          {schoolSelect(gradeGroupCode, setGradeGroupCode, "bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 focus:outline-hidden")}
        </div>

        <form onSubmit={handleAddAssessment} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <input
            type="text"
            required
            placeholder={d("Assessment name, e.g. Quiz 1", "Nombre de la evaluación, p. ej. Prueba 1")}
            value={newAssessmentTitle}
            onChange={(e) => setNewAssessmentTitle(e.target.value)}
            className="col-span-2 sm:col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden"
          />
          <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-500">
            <span className="whitespace-nowrap">{d("Out of", "Sobre")}</span>
            <input
              type="number"
              min="1"
              max="1000"
              step="any"
              required
              value={newAssessmentMax}
              onChange={(e) => setNewAssessmentMax(e.target.value)}
              className="w-full bg-transparent font-bold text-slate-700 focus:outline-hidden"
            />
          </label>
          <input
            type="date"
            aria-label={d("Date of the assessment", "Fecha de la evaluación")}
            value={newAssessmentDate}
            onChange={(e) => setNewAssessmentDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-500 focus:outline-hidden"
          />
          <button
            type="submit"
            className="col-span-2 sm:col-span-1 inline-flex justify-center items-center py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
          >
            <Plus size={13} className="mr-1" />
            {d("Add assessment", "Añadir evaluación")}
          </button>
        </form>

        {gradeError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{gradeError}</p>
        )}

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-3 sticky left-0 bg-slate-50">{d("Student", "Estudiante")}</th>
                {gradebook.assessments.map((assessment: any) => (
                  <th key={assessment.id} className="p-3 text-center whitespace-nowrap normal-case">
                    <span className="flex items-center justify-center gap-1 text-slate-600">
                      {assessment.title}
                      <button
                        type="button"
                        onClick={() => handleDeleteAssessment(assessment)}
                        aria-label={d(`Delete ${assessment.title}`, `Eliminar ${assessment.title}`)}
                        className="text-slate-300 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                    <span className="block font-mono font-semibold">
                      {d(`out of ${assessment.max_score}`, `sobre ${assessment.max_score}`)}{assessment.assessed_on ? ` · ${assessment.assessed_on}` : ""}
                    </span>
                  </th>
                ))}
                <th className="p-3 text-right">{d("Average", "Promedio")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gradebook.students.length === 0 && (
                <tr>
                  <td colSpan={gradebook.assessments.length + 2} className="p-6 text-center text-xs text-slate-400 font-semibold">
                    {d("No students are registered in this school's group yet.", "Aún no hay estudiantes registrados en el grupo de esta escuela.")}
                  </td>
                </tr>
              )}
              {gradebook.students.map((student: any) => (
                <tr key={student.student_id_code} className="hover:bg-slate-50">
                  <td className="p-3 sticky left-0 bg-white">
                    <span className="block font-semibold text-slate-800 whitespace-nowrap">{student.full_name}</span>
                    <span className="block font-mono text-[10px] font-bold text-teal-700">{student.student_id_code}</span>
                  </td>
                  {gradebook.assessments.map((assessment: any) => {
                    const key = `${assessment.id}:${student.student_id_code}`;
                    const stored = gradebook.scores[String(assessment.id)]?.[student.student_id_code]?.score;
                    const remarks = gradebook.scores[String(assessment.id)]?.[student.student_id_code]?.remarks;
                    const isEditing = commentTarget?.assessment.id === assessment.id && commentTarget?.student.student_id_code === student.student_id_code;
                    return (
                      <td key={assessment.id} className="p-2 text-center whitespace-nowrap">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max={assessment.max_score}
                          step="any"
                          aria-label={`${student.full_name}, ${assessment.title}`}
                          value={gradeDrafts[key] ?? (stored ?? "")}
                          onChange={(e) => setGradeDrafts((drafts) => ({ ...drafts, [key]: e.target.value }))}
                          onBlur={() => handleSaveScore(assessment, student.student_id_code)}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          className={`w-16 rounded-lg border px-1.5 py-1 text-center text-[11px] font-bold focus:outline-hidden ${
                            stored === undefined ? "border-slate-200 bg-white text-slate-400" : "border-teal-200 bg-teal-50 text-teal-800"
                          }`}
                        />
                        <button
                          type="button"
                          disabled={stored === undefined}
                          onClick={() => openComment(assessment, student)}
                          aria-label={d(`Comment for ${student.full_name}, ${assessment.title}`, `Comentario para ${student.full_name}, ${assessment.title}`)}
                          title={stored === undefined ? d("Enter a score first", "Primero escribe una calificación") : (remarks || d("Add a comment", "Añadir un comentario"))}
                          className={`ml-1 align-middle p-1 rounded-md transition ${
                            stored === undefined ? "text-slate-200 cursor-not-allowed"
                              : isEditing ? "bg-teal-600 text-white cursor-pointer"
                              : remarks ? "text-teal-600 hover:bg-teal-50 cursor-pointer"
                              : "text-slate-300 hover:text-teal-600 hover:bg-teal-50 cursor-pointer"
                          }`}
                        >
                          <MessageSquare size={12} fill={remarks && !isEditing ? "currentColor" : "none"} />
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-mono font-extrabold text-teal-700">{studentAverage(student.student_id_code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {commentTarget && gradebook.scores[String(commentTarget.assessment.id)]?.[commentTarget.student.student_id_code] && (
          <form onSubmit={handleSaveComment} className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-2">
            <label htmlFor="grade-comment" className="block text-[11px] font-bold text-teal-900">
              {d(
                `Comment for ${commentTarget.student.full_name} on "${commentTarget.assessment.title}"`,
                `Comentario para ${commentTarget.student.full_name} en "${commentTarget.assessment.title}"`
              )}
            </label>
            <textarea
              id="grade-comment"
              autoFocus
              rows={3}
              maxLength={2000}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={d("e.g. Great progress! Review the verb endings for ser and estar.", "p. ej. ¡Buen progreso! Repasa las terminaciones de ser y estar.")}
              className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-teal-800/70 font-semibold">
                {d("The student sees this under their score. Leave it empty to remove the comment.", "El estudiante lo verá bajo su calificación. Déjalo vacío para quitar el comentario.")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCommentTarget(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs cursor-pointer"
                >
                  {d("Cancel", "Cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={commentSaving}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
                >
                  {commentSaving ? d("Saving...", "Guardando...") : d("Save comment", "Guardar comentario")}
                </button>
              </div>
            </div>
          </form>
        )}

        <p className="text-[11px] text-slate-400 font-semibold">
          {gradebook.assessments.length === 0
            ? d("No assessments for this school yet. Add one above, then type each student's score.", "Aún no hay evaluaciones para esta escuela. Añade una arriba y escribe la calificación de cada estudiante.")
            : d("Scores save when you leave the box. Clear a box to remove a score. Click the speech bubble next to a score to add a comment. Students see their own scores and comments in their portal.", "Las calificaciones se guardan al salir de la casilla. Vacía una casilla para quitar la calificación. Haz clic en el globo junto a una calificación para añadir un comentario. Cada estudiante ve sus calificaciones y comentarios en su portal.")}
        </p>
      </div>

      {/* PUBLISH RECORDED CLASS & ANNOUNCEMENT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PUBLISH RECORDED CLASS */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 text-left">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
              <Video size={16} className="text-teal-600 mr-1.5" />
              <span>{d("Publish Completed Class to Archive", "Publicar Clase Completada al Archivo")}</span>
            </h3>
          </div>

          <form onSubmit={handleAddRecordingRecord} className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            <div className="space-y-1 md:col-span-2 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("Recorded Title", "Título de la Grabación")}</label>
              <input
                type="text"
                placeholder={d("e.g. Surviving Spanish Restaurants ordering diagnostic", "ej. Sobrevivir en restaurantes españoles diagnóstico de pedidos")}
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("School", "Escuela")}</label>
              {schoolSelect(recGroupCode, setRecGroupCode, "w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-hidden text-slate-600 font-bold")}
            </div>
            <div className="space-y-1 text-left font-sans">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("Archive Actions", "Acciones de Archivo")}</label>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center py-2 bg-orange-500 hover:bg-orange-450 text-white rounded-xl font-bold font-sans text-xs tracking-wide cursor-pointer transition h-[38px]"
              >
                <Layers size={14} className="mr-1.5" />
                <span>{d("Publish Video", "Publicar Video")}</span>
              </button>
            </div>
            <div className="md:col-span-4 space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("Cloud Recording URL", "URL de Grabación en la Nube")}</label>
              <input
                type="url"
                placeholder="https://..."
                value={recVideoUrl}
                onChange={(e) => setRecVideoUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden mb-3"
              />
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("Lesson Description Overview", "Resumen de la Descripción de la Lección")}</label>
              <input
                type="text"
                placeholder={d("Provide context for what tenses, grammatical models, or vocab exercises are covered in this video archive.", "Proporciona contexto sobre los tiempos verbales, modelos gramaticales o ejercicios de vocabulario cubiertos en este archivo de video.")}
                value={recDescription}
                onChange={(e) => setRecDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>
          </form>
        </div>

        {/* BROADCAST COHORT ANNOUNCEMENT */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between text-left">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 flex justify-between items-center text-left">
              <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
                <MessageSquare size={16} className="text-teal-600 mr-1.5" />
                <span>{d("Publish Class Announcement", "Publicar Anuncio de la Clase")}</span>
              </h3>
            </div>

            {annSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl text-[10px] text-left leading-normal font-sans font-medium animate-fade-in">
                {d(`Published to ${classGroupLabel(groupByCode(annGroupCode))} students.`, `Publicado para los estudiantes de ${classGroupLabel(groupByCode(annGroupCode))}.`)}
              </div>
            )}
            {annError && (
              <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-[11px] font-semibold">{annError}</p>
            )}

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 pt-1 text-left w-full">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold">{d("Announcement Title", "Título del Anuncio")}</label>
                <input
                  type="text"
                  required
                  placeholder={d("e.g. Visual Metaphor Slide Pack Uploaded!", "ej. ¡Paquete de diapositivas de metáforas visuales subido!")}
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.8 text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold">{d("School", "Escuela")}</label>
                  {schoolSelect(annGroupCode, setAnnGroupCode, "w-full bg-[#fafbfb] border border-slate-200 rounded-xl px-2 py-1.8 text-[11px] focus:outline-hidden text-slate-600 font-bold")}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold">{d("Style Alert Type", "Tipo de Alerta Visual")}</label>
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value)}
                    className="w-full bg-[#fafbfb] border border-slate-200 rounded-xl px-2 py-1.8 text-[11px] focus:outline-hidden text-slate-600 font-bold"
                  >
                    <option value="info">{d("Info (Blue alert)", "Info (Alerta azul)")}</option>
                    <option value="success">{d("Success (Green alert)", "Éxito (Alerta verde)")}</option>
                    <option value="important">{d("Important (Rose alert)", "Importante (Alerta rosa)")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold">{d("Message Text", "Texto del Mensaje")}</label>
                <textarea
                  required
                  rows={2}
                  placeholder={d("Write message details...", "Escribe los detalles del mensaje...")}
                  value={annText}
                  onChange={(e) => setAnnText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.8 text-xs focus:outline-hidden focus:border-teal-600 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex justify-center items-center py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold font-sans text-xs tracking-wider cursor-pointer transition-colors"
              >
                <Send size={11} className="mr-1.5" />
                <span>{d("Publish Announcement", "Publicar Anuncio")}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MY PUBLISHED CONTENT: review and delete what students can see */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 text-left">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
            <Layers size={15} className="text-teal-600 mr-1.5" />
            <span>{d("My Published Content", "Mi Contenido Publicado")}</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            {d("Everything you've published, by school. Delete an item and students stop seeing it.", "Todo lo que has publicado, por escuela. Si eliminas algo, los estudiantes dejan de verlo.")}
          </p>
        </div>
        {deleteError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{deleteError}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              kind: "class" as const,
              heading: d("Classes", "Clases"),
              items: scheduledClasses.map((cls) => ({ id: cls.id, title: cls.title, level: cls.level, classGroup: cls.classGroup, detail: `${cls.date} GMT` })),
            },
            {
              kind: "note" as const,
              heading: d("Notes & files", "Notas y archivos"),
              items: myNotes.map((note) => ({ id: note.id, title: note.title, level: note.course_level, classGroup: note.class_group, detail: note.file_type })),
            },
            {
              kind: "recording" as const,
              heading: d("Recordings", "Grabaciones"),
              items: myRecordings.map((rec) => ({ id: rec.id, title: rec.title, level: rec.course_level, classGroup: rec.class_group, detail: rec.date_recorded })),
            },
            {
              kind: "announcement" as const,
              heading: d("Announcements", "Anuncios"),
              items: myAnnouncements.map((ann) => ({ id: ann.id, title: ann.title, level: ann.course_level, classGroup: ann.class_group, detail: ann.created_at ? new Date(ann.created_at).toLocaleDateString() : "" })),
            },
          ].map((column) => (
            <div key={column.kind} className="space-y-2 min-w-0">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{column.heading} ({column.items.length})</h4>
              {column.items.length === 0 && (
                <p className="text-[11px] text-slate-400 font-semibold">{d("Nothing published yet.", "Aún no hay nada publicado.")}</p>
              )}
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {column.items.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {contentAudienceLabel(item.level, item.classGroup)}
                      </span>
                      <h5 className="font-bold text-xs text-slate-800 mt-1 break-words">{item.title}</h5>
                      {item.detail && <p className="text-[10px] font-mono text-slate-400">{item.detail}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePublished(column.kind, item)}
                      aria-label={d(`Delete ${item.title}`, `Eliminar ${item.title}`)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
