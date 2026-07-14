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
  Upload
} from "lucide-react";
import LiveVideoRoom from "../LiveVideoRoom";
import { findTutorByEmail } from "../../tutors";

interface TeacherDashboardProps {
  onExit: () => void;
  teacherProfile?: any;
  onAddSharedNote: (note: any) => void;
  onAddRecording: (recording: any) => void;
  lang?: "EN" | "ES";
}

// Initial mock records for attendance reports
const INITIAL_STUDENT_ROSTER = [
  { id: "S01", code: "SER-219", name: "Sarah Jane", level: "A1", present: 14, absent: 1, late: 2, pct: 89 },
  { id: "S02", code: "ESTAR-492", name: "John Doe", level: "A1", present: 15, absent: 2, late: 0, pct: 88 },
  { id: "S03", code: "SER-784", name: "Alex Miller", level: "A1", present: 16, absent: 1, late: 0, pct: 94 },
  { id: "S04", code: "SER-112", name: "Elena Garcia", level: "A2", present: 17, absent: 0, late: 0, pct: 100 },
  { id: "S05", code: "ESTAR-303", name: "Emma Watson", level: "B1", present: 12, absent: 4, late: 1, pct: 76 }
];

export default function TeacherDashboard({ onExit, teacherProfile, onAddSharedNote, onAddRecording, lang = "EN" }: TeacherDashboardProps) {
  const d = (en: string, es: string) => (lang === "ES" ? es : en);
  const tutor = findTutorByEmail(teacherProfile?.email);
  const teacherName = teacherProfile?.fullName || tutor.name;
  const teacherDisplayName = teacherProfile?.displayName || tutor.displayName || teacherName;
  const teacherEmail = teacherProfile?.email || tutor.email;

  // Local active courses assigned
  const assignedLevels: string[] = teacherProfile?.assignedLevels || tutor.assignedLevels || ["A1", "A2"];
  const assignedCourses = assignedLevels.map((level: string, index: number) => ({
    code: index === 0 ? `${level}-G1` : `${level}-G${index + 1}`,
    level: d(`${level} Spanish Group`, `Grupo de Español ${level}`),
    time: index === 0 ? d("Tue/Thu 19:00 - 20:00", "Mar/Jue 19:00 - 20:00") : d("Saturday review block", "Bloque de repaso del sábado"),
    count: index === 0 ? 12 : 10
  }));
  const defaultAssignedCourses = [
    { code: "A1-M", level: d("A1 Beginner", "A1 Principiante"), time: d("Mon/Wed 09:00 - 10:30", "Lun/Miér 09:00 - 10:30"), count: 6 },
    { code: "A2-E", level: d("A2 Elementary", "A2 Elemental"), time: d("Tue/Thu 18:30 - 20:00", "Mar/Jue 18:30 - 20:00"), count: 4 },
    { code: "B1-W", level: d("B1 Intermediate", "B1 Intermedio"), time: d("Saturdays 10:00 - 13:00", "Sábados 10:00 - 13:00"), count: 5 }
  ];
  const visibleAssignedCourses = assignedCourses.length ? assignedCourses : defaultAssignedCourses;

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
  const [newLevel, setNewLevel] = useState("A1");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Live class room simulation
  const [currentActiveRoom, setCurrentActiveRoom] = useState<any | null>(null);
  const [activeRoomMessage, setActiveRoomMessage] = useState("");
  const [roomChatMessages, setRoomChatMessages] = useState<Array<{ sender: string; role: string; text: string; time: string }>>([]);
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!currentActiveRoom?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.port === "3000" ? `${window.location.hostname}:8000` : window.location.host;
    const socket = new WebSocket(`${protocol}://${wsHost}/ws/live-chat/${currentActiveRoom.id}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setRoomChatMessages(prev => [
        ...prev,
        {
          sender: payload.sender_name,
          role: payload.sender_role,
          text: payload.message,
          time: new Date(payload.time_sent).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    };
    setChatSocket(socket);

    return () => {
      socket.close();
      setChatSocket(null);
    };
  }, [currentActiveRoom?.id]);

  // Shared note uploads form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteLevel, setNoteLevel] = useState("A1");
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteUploadStatus, setNoteUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Archive recording uploads form
  const [recTitle, setRecTitle] = useState("");
  const [recLevel, setRecLevel] = useState("A1");
  const [recDescription, setRecDescription] = useState("");
  const [recVideoUrl, setRecVideoUrl] = useState("");

  // Attendance filter
  const [roster, setRoster] = useState(INITIAL_STUDENT_ROSTER);
  const [rosterSearch, setRosterSearch] = useState("");

  // Cohort announcement builder
  const [annTitle, setAnnTitle] = useState("");
  const [annText, setAnnText] = useState("");
  const [annLevel, setAnnLevel] = useState("A1");
  const [annType, setAnnType] = useState("info");
  const [annSuccessMessage, setAnnSuccessMessage] = useState(false);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annText) return;

    const newAnn = {
      id: `ann-${Date.now()}`,
      courseLevel: annLevel,
      title: annTitle,
      text: annText,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      type: annType,
      instructor: teacherName
    };

    // Store in course_announcements list
    const existing = JSON.parse(localStorage.getItem("course_announcements") || "[]");
    existing.push(newAnn);
    localStorage.setItem("course_announcements", JSON.stringify(existing));

    // Force custom visual refesh
    window.dispatchEvent(new Event("storage"));

    setAnnSuccessMessage(true);
    setAnnTitle("");
    setAnnText("");

    setTimeout(() => {
      setAnnSuccessMessage(false);
    }, 4500);
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

    try {
      const response = await fetch("/api/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          course_level: newLevel,
          teacher_name: teacherName,
          date_time: `${newDate} ${newTime}`
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
        date: created.date_time,
        time: created.date_time,
        status: created.status,
        link: created.meeting_link
      };

      setScheduledClasses((current) => [...current, newClass]);
      setProgressRefreshKey(prev => prev + 1);
      setScheduleStatus({
        type: "success",
        message: d(`${created.title} was scheduled for ${created.course_level}.`, `${created.title} se programó para el nivel ${created.course_level}.`)
      });
      setNewTitle("");
      setNewDate("");
      setNewTime("");
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
      setCurrentActiveRoom({ ...cls, roomUrl: payload.room_url, joinToken: payload.join_token });
      setScheduledClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: "Live" } : c));
      setProgressRefreshKey(prev => prev + 1);
    } catch (error: any) {
      alert(error?.message || d("The live classroom could not start.", "No se pudo iniciar el aula en vivo."));
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
  const handleSendTeacherReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomMessage.trim()) return;

    if (chatSocket?.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({
        sender_name: teacherName,
        sender_role: "teacher",
        message: activeRoomMessage
      }));
    }
    setActiveRoomMessage("");
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
    formData.append("course_level", noteLevel);
    formData.append("created_by", teacherName);
    formData.append("file", noteFile);

    try {
      const response = await fetch("/api/lesson-notes", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || d("The file could not be uploaded.", "No se pudo subir el archivo."));
      }

      onAddSharedNote(payload);
      setNoteUploadStatus({
        type: "success",
        message: d(`Shared with ${noteLevel} students successfully.`, `Compartido correctamente con los estudiantes de ${noteLevel}.`)
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

    const response = await fetch("/api/recordings/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: recTitle,
        teacher_name: teacherName,
        course_level: recLevel,
        video_url: recVideoUrl,
        duration: "50 mins",
        description: recDescription || "Class discussion capture"
      })
    });
    if (!response.ok) return;
    const created = await response.json();
    const newRec = {
      id: created.id,
      title: recTitle,
      teacher: teacherName,
      level: recLevel,
      date: new Date().toISOString().split("T")[0],
      duration: "50 mins",
      description: recDescription || "Class discussion capture",
      url: recVideoUrl
    };

    onAddRecording(newRec); // propagate up
    alert(d("Práctico! Recording successfully published inside the Student Recorded Class Archive.", "¡Práctico! Grabación publicada con éxito en el Archivo de Clases Grabadas del estudiante."));
    setRecTitle("");
    setRecDescription("");
    setRecVideoUrl("");
  };

  // Export Attendance CSV
  const handleExportAttendanceCSV = () => {
    const headers = "Student ID,Student Code,Student Name,Level,Days Present,Days Absent,Days Late,Attendance % \n";
    const rows = roster.map(r => `${r.id},${r.code},${r.name},${r.level},${r.present},${r.absent},${r.late},${r.pct}%`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SeroEstar_Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`;
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

  const filteredRoster = roster.filter(s =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(rosterSearch.toLowerCase())
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
        <button
          onClick={onExit}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 scroll-smooth relative z-10"
        >
          <LogOut size={14} className="mr-2" />
          <span>{d("Exit Portal", "Salir del Portal")}</span>
        </button>
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
              {currentActiveRoom.roomUrl ? (
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
              {roomChatMessages.map((m, idx) => (
                <div key={idx} className="flex flex-col space-y-1">
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
              {visibleAssignedCourses.map(crs => (
                <div key={crs.code} className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{crs.code}</span>
                    <h4 className="font-bold text-slate-800 text-xs leading-none">{crs.level}</h4>
                    <p className="text-[10px] font-mono text-slate-400">{crs.time}</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-xl text-teal-800 text-center">
                    <span className="block text-xs font-black font-mono leading-none">{crs.count}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wide">{d("Peers", "Alumnos")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule class and Live Trigger list */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">{d("Scheduled Live Sessions", "Sesiones en Vivo Programadas")}</h3>
              </div>

              {/* Scheduled class lists */}
              <div className="space-y-3 max-h-[190px] overflow-y-auto">
                {scheduledClasses.map(cls => (
                  <div key={cls.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center flex-wrap gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2.5 py-0.2 rounded-full font-mono">
                          {cls.level}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{cls.date} • {cls.time}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">{cls.title}</h4>
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
                          onClick={() => handleLaunchClass(cls)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                        >
                          {d("Start HD Livestream", "Iniciar Transmisión HD")}
                        </button>
                      )}
                    </div>
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
                <select
                  aria-label={d("Course level", "Nivel del curso")}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.8 text-xs text-slate-600 font-bold focus:outline-hidden"
                >
                  {assignedLevels.map((level) => (
                    <option key={level} value={level}>{d(`${level} Level`, `Nivel ${level}`)}</option>
                  ))}
                </select>
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
        
        {/* Automatic Attendance report viewer */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">
              {d("Automatic Attendance Roster Logs", "Registros de Asistencia Automática")}
            </h3>
            <div className="flex space-x-2 shrink-0">
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
                <span>{d("Export CSV Report", "Exportar Reporte CSV")}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="p-3">{d("ID Code", "Código ID")}</th>
                  <th className="p-3">{d("Student Name", "Nombre del Estudiante")}</th>
                  <th className="p-3">{d("Level Enrolled", "Nivel Inscrito")}</th>
                  <th className="p-3 text-center">{d("Days Present", "Días Presente")}</th>
                  <th className="p-3 text-center">{d("Days Absent", "Días Ausente")}</th>
                  <th className="p-3 text-center">{d("Late Sessions", "Llegadas Tarde")}</th>
                  <th className="p-3 text-right">{d("Attendance Rate", "Tasa de Asistencia")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-[10px] font-bold text-teal-700">{item.code}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-sm font-mono text-[9px] font-bold text-slate-500">
                        {d("Level", "Nivel")} {item.level}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-650">{item.present}</td>
                    <td className="p-3 text-center font-mono text-slate-650">{item.absent}</td>
                    <td className="p-3 text-center font-mono text-slate-650">{item.late}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-teal-700">{item.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{d("Level Segment", "Nivel de Destino")}</label>
                <select
                  value={noteLevel}
                  onChange={(e) => setNoteLevel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-hidden text-slate-600 font-bold"
                >
                  <option value="A1">{d("A1 Beginner", "A1 Principiante")}</option>
                  <option value="A2">{d("A2 Elementary", "A2 Elemental")}</option>
                  <option value="B1">{d("B1 Intermediate", "B1 Intermedio")}</option>
                  <option value="All">{d("All Students", "Todos los Alumnos")}</option>
                </select>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("Course Level Target", "Nivel de Curso Destino")}</label>
              <select
                value={recLevel}
                onChange={(e) => setRecLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-hidden text-slate-600 font-bold"
              >
                <option value="A1">{d("Level A1", "Nivel A1")}</option>
                <option value="A2">{d("Level A2", "Nivel A2")}</option>
                <option value="B1">{d("Level B1", "Nivel B1")}</option>
              </select>
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
                {d("¡Beamed! Pinned instantly to students gradebook feed dashboard.", "¡Enviado! Fijado instantáneamente en el panel de calificaciones de los alumnos.")}
              </div>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold">{d("Class Level", "Nivel de Clase")}</label>
                  <select
                    value={annLevel}
                    onChange={(e) => setAnnLevel(e.target.value)}
                    className="w-full bg-[#fafbfb] border border-slate-200 rounded-xl px-2 py-1.8 text-[11px] focus:outline-hidden text-slate-600 font-bold"
                  >
                    <option value="A1">{d("A1 Beginner", "A1 Principiante")}</option>
                    <option value="A2">{d("A2 Elementary", "A2 Elemental")}</option>
                    <option value="B1">{d("B1 Intermediate", "B1 Intermedio")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-bold">{d("Style Alert Type", "Tipo de Alerta Visual")}</label>
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value)}
                    className="w-full bg-[#fafbfb] border border-slate-200 rounded-xl px-2 py-1.8 text-[11px] focus:outline-hidden text-slate-600 font-bold"
                  >
                    <option value="info">{d("Info (Blue alert)", "Info (Alerta azul)")}</option>
                    <option value="success font-bold">{d("Success (Green alert)", "Éxito (Alerta verde)")}</option>
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
    </div>
  );
}
