import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Video,
  FileText,
  User,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle,
  FileDown,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  LogOut,
  Send,
  Sparkles,
  Mail,
  Award,
  AlertCircle,
  CheckCircle2,
  Inbox
} from "lucide-react";

import { TRANSLATIONS } from "../../translations";
import Logo from "../Logo";
import LiveVideoRoom from "../LiveVideoRoom";
import AdaptiveLessonPlayer from "../AdaptiveLessonPlayer";
import { TUTOR_PROFILES } from "../../tutors";

interface StudentProfile {
  fullName: string;
  studentIdCode: string;
  email: string;
  phoneNumber: string;
  courseLevel: string;
  classGroup: string;
  learningMode: string;
}

interface StudentDashboardProps {
  onExit: () => void;
  registeredStudent: StudentProfile | null;
  onOpenChatbot: () => void;
  lang?: "EN" | "ES";
}

// Default preloaded mock shared teacher notes
const INITIAL_SHARED_NOTES = [
  { id: "note-1", title: "Definición del Ser: Identidad, Origen y Profesiones", courseLevel: "A1", fileType: "PDF", size: "2.4 MB", date: "2026-06-18" },
  { id: "note-2", title: "Metáforas Cognitivas para Estar: La Brújula de Localización", courseLevel: "A1", fileType: "PDF", size: "1.8 MB", date: "2026-06-19" },
  { id: "note-3", title: "Pretérito Indefinido vs Imperfecto: Cheat Sheet", courseLevel: "A2", fileType: "DOCX", size: "1.1 MB", date: "2026-06-10" },
  { id: "note-4", title: "El Modo Subjuntivo: Guía Práctica de Expresión Indirecta", courseLevel: "B1", fileType: "PDF", size: "3.5 MB", date: "2026-06-12" }
];

const INITIAL_RECORDINGS: any[] = [
  {
    id: "a1-describir-personas-objetos",
    title: "Describir personas y objetos",
    teacher_name: "Xiomara Villamizar",
    course_level: "A1",
    date_recorded: "2026-07-13",
    duration: "7 mins",
    description: "Ejemplo práctico de nivel A1 para aprender a describir personas y objetos en español.",
    video_url: "/videos/describir-personas-y-objetos-a1.mp4"
  }
];

type WelcomeLetterSession = {
  time: string;
  day: string;
  session: string;
};

type WelcomeLetterConfig = {
  level: "A1" | "A2";
  group: 1 | 2;
  durationWeeks: number;
  courseDates: string;
  sessions: WelcomeLetterSession[];
};

const WELCOME_LETTERS: Record<string, WelcomeLetterConfig> = {
  "A1-G1": {
    level: "A1",
    group: 1,
    durationWeeks: 6,
    courseDates: "19 May to 27 June 2026",
    sessions: [
      { time: "19:00-20:00", day: "Tuesday", session: "Grammar-Lab" },
      { time: "19:00-20:00", day: "Thursday", session: "Vocabulary & Conversation" },
      { time: "10:00-11:00", day: "Saturday", session: "Listening Practice. Review" },
      { time: "11:00-12:00", day: "Saturday", session: "Final Project Coaching (Week 3-6)" },
    ],
  },
  "A1-G2": {
    level: "A1",
    group: 2,
    durationWeeks: 6,
    courseDates: "25 May to 04 July 2026",
    sessions: [
      { time: "19:00-20:00", day: "Monday", session: "Grammar-Lab" },
      { time: "19:00-20:00", day: "Wednesday", session: "Vocabulary & Conversation" },
      { time: "08:00-09:00", day: "Saturday", session: "Listening Practice. Review" },
      { time: "09:00-10:00", day: "Saturday", session: "Final Project Coaching (Week 3-6)" },
    ],
  },
  "A2-G1": {
    level: "A2",
    group: 1,
    durationWeeks: 8,
    courseDates: "11 May to 04 July 2026",
    sessions: [
      { time: "19:00-20:00", day: "Tuesday", session: "Grammar-Lab" },
      { time: "19:00-20:00", day: "Thursday", session: "Vocabulary & Conversation" },
      { time: "12:00-13:00", day: "Saturday", session: "Listening Practice. Review" },
      { time: "13:00-14:00", day: "Saturday", session: "Final Project Coaching (Week 5-8)" },
    ],
  },
};

function getWelcomeLetter(courseLevel: string, classGroup: string) {
  const level = courseLevel?.match(/\b(A1|A2)\b/i)?.[1]?.toUpperCase();
  if (!level) return null;
  const groupText = classGroup || "";
  const group = /(?:group|grupo|g)[\s-]*2\b/i.test(groupText) || /evening/i.test(groupText) ? 2 : 1;
  return WELCOME_LETTERS[`${level}-G${group}`] || WELCOME_LETTERS[`${level}-G1`] || null;
}

export default function StudentDashboard({ onExit, registeredStudent, onOpenChatbot, lang = "EN" }: StudentDashboardProps) {
  const t = TRANSLATIONS[lang];
  const d = (en: string, es: string) => lang === "ES" ? es : en;

  // Use dummy fallbacks if not registered during this session
  const student = registeredStudent || {
    fullName: "Alex Miller",
    studentIdCode: "SER-784",
    email: "alex.miller@gmail.com",
    phoneNumber: "+34 611 223 344",
    courseLevel: "A1",
    classGroup: "Morning Group",
    learningMode: "Online"
  };
  const welcomeLetter = getWelcomeLetter(student.courseLevel, student.classGroup);

  // Student portal tabs: 'lessons' | 'grades-assignments' | 'message-instructors'
  const [activeTab, setActiveTab ] = useState<"lessons" | "grades-assignments" | "message-instructors">("lessons");

  // State
  const [personalNotes, setPersonalNotes] = useState<Array<{ id: string; title: string; content: string; date: string }>>(() => {
    const saved = localStorage.getItem(`notes_${student.studentIdCode}`);
    return saved ? JSON.parse(saved) : [
      { id: "p1", title: "My Ser vs Estar Metaphor Tracker", content: "Ser = What somethings is (Identity). Estar = How something is (state/feeling). Exception: Location is ALWAYS Estar even if Madrid stands forever!", date: "2026-06-20" }
    ];
  });
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [personalNotesSearch, setPersonalNotesSearch] = useState("");

  // Interactive Live Teacher Announcements state (polls localStorage)
  const [announcements, setAnnouncements] = useState<Array<{ id: string; courseLevel: string; title: string; text: string; date: string; type: string; instructor: string }>>(() => {
    const saved = localStorage.getItem("course_announcements");
    const baseline = [
      { id: "ann-init-1", courseLevel: "A1", title: "Visual Metaphor Slide Pack Uploaded!", text: "Please review the new Ser vs Estar cognitive metaphor map in your Materials Locker before Wednesday's live oral drills class.", date: "2026-06-21", type: "important", instructor: TUTOR_PROFILES[0].name },
      { id: "ann-init-2", courseLevel: "A1", title: "Morning Grammar Drills Schedule change", text: "Wednesday session will begin exactly 15 minutes earlier due to mock certification tests with UNIMAK.", date: "2026-06-22", type: "info", instructor: TUTOR_PROFILES[1].name },
      { id: "ann-init-3", courseLevel: "A2", title: "Quiz 3 Deadline Rescheduled", text: "The Elementary past tenses homework has been shifted to Friday night. Practice the difference between indefinido and imperfecto.", date: "2026-06-21", type: "info", instructor: TUTOR_PROFILES[2].name },
      { id: "ann-init-4", courseLevel: "B1", title: "Subjunctive Essay Prompt released", text: "Submit your final essays in the assignments tab directly. 500 words on Spain's local cultural metaphors.", date: "2026-06-22", type: "success", instructor: TUTOR_PROFILES[3].name }
    ];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Combine baseline and saved
        return [...parsed, ...baseline.filter(b => !parsed.some((p: any) => p.id === b.id))];
      } catch (err) {
        return baseline;
      }
    }
    return baseline;
  });
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`announcement_reads_${student.studentIdCode}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [deletedAnnouncementIds, setDeletedAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`announcement_deleted_${student.studentIdCode}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Direct Student Grades Tracker
  const [gradesList, setGradesList] = useState<Array<{ id: string; subject: string; score: string; weight: string; date: string; remarks: string }>>(() => {
    const saved = localStorage.getItem(`grades_${student.studentIdCode}`);
    const defaultGrades = [
      { id: "g1", subject: "Oral Drill Fluency Exam (Ser o Estar)", score: "94/100", weight: "20%", date: "2026-06-15", remarks: "Great metaphorical application. Fluid speech patterns." },
      { id: "g2", subject: "Weekly Grammar Assessment (Present Indicator)", score: "88/100", weight: "15%", date: "2026-06-18", remarks: "Solid conjugation! Watch out for irregular first-person roots like 'Tengo' or 'Oigo'." },
      { id: "g3", subject: "Active Classroom Participation Audit", score: "98/100", weight: "10%", date: "2026-06-20", remarks: "Phenomenal questions and peer collaboration during Jitsi breakouts." },
      { id: "g4", subject: "Prueba: Cultural Idioms & Dialects", score: "Pending Review", weight: "15%", date: "2026-06-22", remarks: "Instructor's grading board is actively reviewing." }
    ];
    return saved ? JSON.parse(saved) : defaultGrades;
  });

  // Assignments submitted & pending
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string; deadline: string; status: "Submitted" | "Not Submitted" | "Graded"; score: string; uploadedFile?: string; dateSubmitted?: string }>>(() => {
    const saved = localStorage.getItem(`assignments_${student.studentIdCode}`);
    const defaultAssignments = [
      { id: "asg-1", title: "Cognitive Concept Map: Ser (Who) vs Estar (How)", deadline: "2026-06-25", status: "Not Submitted", score: "TBD" },
      { id: "asg-2", title: "Oral Diary Recording: My Local Environment Description", deadline: "2026-06-29", status: "Not Submitted", score: "TBD" },
      { id: "asg-3", title: "Translation Clinic Exercises: Emotional Subjunctive Conjugations", deadline: "2026-07-04", status: "Not Submitted", score: "TBD" }
    ];
    return saved ? JSON.parse(saved) : defaultAssignments;
  });

  // Direct Tutor Correspondences Mailbox
  const [emails, setEmails] = useState<Array<{ id: string; instructor: string; subject: string; text: string; date: string; status: string }>>(() => {
    const saved = localStorage.getItem(`emails_${student.studentIdCode}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Interactive Upload Assignment Fields
  const [selectedAsgId, setSelectedAsgId] = useState(assignments[0]?.id || "");
  const [homeworkFileMockName, setHomeworkFileMockName] = useState("");
  const [homeworkSuccess, setHomeworkSuccess] = useState(false);

  // Email form fields
  const [instructorEmailTarget, setInstructorEmailTarget] = useState(TUTOR_PROFILES[0].email);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // File Upload State Simulation for Materials locker
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; type: string; size: string; date: string }>>([
    { name: "Syllabus_A1_Ser_o_Estar.pdf", type: "PDF", size: "1.4 MB", date: "2026-06-21" }
  ]);
  const [dragging, setDragging] = useState(false);

  // Live class and catalog states loaded from the backend
  const [activeSession, setActiveSession] = useState<{ id: string; title: string; teacher: string; startTime: string; isLive: boolean; roomUrl?: string; joinToken?: string } | null>(null);
  const [insideClassRoom, setInsideClassRoom] = useState(false);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [recordings, setRecordings] = useState(INITIAL_RECORDINGS);
  const [sharedNotes, setSharedNotes] = useState<any[]>(INITIAL_SHARED_NOTES);
  const [courseCatalog, setCourseCatalog] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; role: string; text: string; time: string }>>([]);
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);
  const [newChatMessage, setNewChatMessage] = useState("");

  // Attendance Tracker metrics
  const [attendanceRecords, setAttendanceRecords] = useState<{ present: number; absent: number; late: number; totalHours: number }>({
    present: 0,
    absent: 0,
    late: 0,
    totalHours: 0
  });

  // Recorded archives state filtered
  const [recSearch, setRecSearch] = useState("");
  const [recLevel, setRecLevel] = useState("All");

  // Welcome letter modal states
  const [isWelcomeLetterOpen, setIsWelcomeLetterOpen] = useState(false);
  const [welcomeLetterPage, setWelcomeLetterPage] = useState(1);
  const [portalTutors, setPortalTutors] = useState(TUTOR_PROFILES);

  useEffect(() => {
    localStorage.setItem(`notes_${student.studentIdCode}`, JSON.stringify(personalNotes));
  }, [personalNotes, student.studentIdCode]);

  useEffect(() => {
    fetch("/api/tutors")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setPortalTutors(data.map((tutor: any) => ({
          id: tutor.id,
          name: tutor.name,
          displayName: tutor.display_name || tutor.displayName || tutor.name,
          email: tutor.email,
          password: "",
          assignedLevels: tutor.assigned_levels || tutor.assignedLevels || ["A1"]
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const courseLevelCode = student.courseLevel?.match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();

    const loadLiveSessions = () => {
      fetch("/api/live-sessions")
        .then((res) => {
          if (!res.ok) throw new Error("Unable to load live sessions");
          return res.json();
        })
        .then((data) => {
          const sessions = Array.isArray(data) ? data : [];
          setLiveSessions(sessions);
          const matchingSessions = sessions
            .filter((item: any) => {
              const sessionLevel = String(item.course_level || "").match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();
              return (!courseLevelCode || sessionLevel === courseLevelCode) && (item.status === "Live" || item.status === "Scheduled");
            })
            .sort((a: any, b: any) => Number(b.status === "Live") - Number(a.status === "Live"));
          const upcoming = matchingSessions[0];

          if (!upcoming) {
            setActiveSession(null);
            return;
          }

          setActiveSession((current) => ({
            id: upcoming.id,
            title: upcoming.title,
            teacher: upcoming.teacher_name,
            startTime: upcoming.date_time,
            isLive: upcoming.status === "Live",
            roomUrl: current?.id === upcoming.id ? current.roomUrl : undefined,
            joinToken: current?.id === upcoming.id ? current.joinToken : undefined
          }));
        })
        .catch(() => {});
    };

    loadLiveSessions();
    const refreshTimer = window.setInterval(loadLiveSessions, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [student.courseLevel]);

  useEffect(() => {

    fetch(`/api/lesson-notes?course_level=${encodeURIComponent(student.courseLevel)}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setSharedNotes([
          ...data,
          ...INITIAL_SHARED_NOTES.filter((seeded) => !data.some((note: any) => note.id === seeded.id))
        ]);
      })
      .catch(() => {});

    fetch("/api/recordings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.length) {
          setRecordings([
            ...data,
            ...INITIAL_RECORDINGS.filter((seeded) => !data.some((recording: any) => recording.id === seeded.id))
          ]);
        }
      })
      .catch(() => {});

    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        setCourseCatalog(data || []);
      })
      .catch(() => {});

    fetch(`/api/my-courses?student_id_code=${encodeURIComponent(student.studentIdCode)}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (data?.length) {
          setCourseCatalog(data);
        }
      })
      .catch(() => {});

    fetch(`/api/attendance/summary?student_id_code=${encodeURIComponent(student.studentIdCode)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setAttendanceRecords({
            present: data.present || 0,
            absent: data.absent || 0,
            late: data.late || 0,
            totalHours: data.total_hours || 0
          });
        }
      })
      .catch(() => {});
  }, [student.studentIdCode, student.courseLevel]);

  useEffect(() => {
    localStorage.setItem(`assignments_${student.studentIdCode}`, JSON.stringify(assignments));
  }, [assignments, student.studentIdCode]);

  useEffect(() => {
    localStorage.setItem(`emails_${student.studentIdCode}`, JSON.stringify(emails));
  }, [emails, student.studentIdCode]);

  useEffect(() => {
    localStorage.setItem(`announcement_reads_${student.studentIdCode}`, JSON.stringify(readAnnouncementIds));
  }, [readAnnouncementIds, student.studentIdCode]);

  useEffect(() => {
    localStorage.setItem(`announcement_deleted_${student.studentIdCode}`, JSON.stringify(deletedAnnouncementIds));
  }, [deletedAnnouncementIds, student.studentIdCode]);

  useEffect(() => {
    if (!insideClassRoom || !activeSession?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.port === "3000" ? `${window.location.hostname}:8000` : window.location.host;
    const socket = new WebSocket(`${protocol}://${wsHost}/ws/live-chat/${activeSession.id}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setChatMessages(prev => [
        ...prev,
        {
          id: String(payload.id || Date.now()),
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
  }, [insideClassRoom, activeSession?.id]);

  // Handle Note Creation
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle || !newNoteContent) return;
    const newNote = {
      id: `pnote-${Date.now()}`,
      title: newNoteTitle,
      content: newNoteContent,
      date: new Date().toISOString().split("T")[0]
    };
    setPersonalNotes([newNote, ...personalNotes]);
    setNewNoteTitle("");
    setNewNoteContent("");
  };

  const handleMarkAnnouncementRead = (id: string) => {
    setReadAnnouncementIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const handleDeleteReadAnnouncement = (id: string) => {
    if (!readAnnouncementIds.includes(id)) return;
    const confirmed = window.confirm(
      d(
        "Delete this read message from your portal? The tutor's original announcement will remain available to other students.",
        "¿Eliminar este mensaje leído de tu portal? El anuncio original del tutor seguirá disponible para los demás estudiantes."
      )
    );
    if (!confirmed) return;
    setDeletedAnnouncementIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const handleDeleteNote = (id: string) => {
    setPersonalNotes(personalNotes.filter(n => n.id !== id));
  };

  // Submit Assignment Upload Handler
  const handleAddAssignmentSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkFileMockName || !selectedAsgId) return;

    setAssignments((prev) => 
      prev.map((asg) => 
        asg.id === selectedAsgId 
          ? { 
              ...asg, 
              status: "Submitted", 
              uploadedFile: homeworkFileMockName, 
              dateSubmitted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
            } 
          : asg
      )
    );

    // Append to general file locker list for visual feedback
    const newLockerRecord = {
      name: `${homeworkFileMockName} (Homework Submission)`,
      type: homeworkFileMockName.split(".").pop()?.toUpperCase() || "PDF",
      size: "1.8 MB",
      date: new Date().toISOString().split("T")[0]
    };
    setUploadedFiles((prev) => [newLockerRecord, ...prev]);

    setHomeworkSuccess(true);
    setTimeout(() => {
      setHomeworkSuccess(false);
      setHomeworkFileMockName("");
    }, 4500);
  };

  // Direct Mail Send Handler
  const handleSendInstructorEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return;

    const instructorsMap: Record<string, string> = Object.fromEntries(
      portalTutors.map(tutor => [tutor.email, tutor.name])
    );

    const newEmail = {
      id: `mail-${Date.now()}`,
      instructor: instructorsMap[instructorEmailTarget] || "Instructor",
      subject: emailSubject,
      text: emailBody,
      date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "SMTP RELAYED via Secure SSL"
    };

    setEmails([newEmail, ...emails]);
    setEmailSuccess(true);

    setTimeout(() => {
      setEmailSuccess(false);
      setEmailSubject("");
      setEmailBody("");
    }, 4500);
  };

  // Simulated drop upload handler for standard Locker
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const newFile = {
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() || "FILE",
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0]
      };
      setUploadedFiles([newFile, ...uploadedFiles]);
    }
  };

  // Manual File Select Simulation for standard Locker
  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newFile = {
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() || "FILE",
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0]
      };
      setUploadedFiles([newFile, ...uploadedFiles]);
    }
  };

  // Join a real provider-backed live class
  const joinLiveClassRoom = async () => {
    if (!activeSession) return;

    const joinResponse = await fetch(`/api/live-sessions/${activeSession.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id_code: student.studentIdCode })
    });
    const joinPayload = await joinResponse.json();
    if (!joinResponse.ok) {
      alert(joinPayload.detail || d("Unable to join this class.", "No se puede unir a esta clase."));
      return;
    }

    setActiveSession(prev => prev ? { ...prev, roomUrl: joinPayload.room_url, joinToken: joinPayload.join_token } : prev);
    setInsideClassRoom(true);
  };

  const recordVideoJoinAttendance = async () => {
    if (!activeSession) return;
    await fetch("/api/attendance/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id_code: student.studentIdCode, session_id: Number(activeSession.id) })
    });
  };

  const leaveLiveClassRoom = async () => {
    if (activeSession) {
      await fetch("/api/attendance/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id_code: student.studentIdCode, session_id: Number(activeSession.id) })
      }).catch(() => {});
      fetch(`/api/attendance/summary?student_id_code=${encodeURIComponent(student.studentIdCode)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            setAttendanceRecords({
              present: data.present || 0,
              absent: data.absent || 0,
              late: data.late || 0,
              totalHours: data.total_hours || 0
            });
          }
        })
        .catch(() => {});
    }
    setInsideClassRoom(false);
  };

  // Live Chat send helper
  const sendLiveChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    if (chatSocket?.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({
        sender_name: student.fullName,
        sender_role: "student",
        message: newChatMessage
      }));
    }
    setNewChatMessage("");
  };

  const calculatedPercentage = Math.round(
    ((attendanceRecords.present + attendanceRecords.late) /
      (attendanceRecords.present + attendanceRecords.late + attendanceRecords.absent)) *
      100
  );

  const filteredPersonalNotes = personalNotes.filter(n =>
    n.title.toLowerCase().includes(personalNotesSearch.toLowerCase()) ||
    n.content.toLowerCase().includes(personalNotesSearch.toLowerCase())
  );

  const filteredRecordings = recordings.filter((rec: any) => {
    const title = rec.title || "";
    const teacher = rec.teacher_name || rec.teacher || "";
    const level = rec.course_level || rec.level || "";
    const enrolledLevel = student.courseLevel?.match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();
    const matchesSearch = title.toLowerCase().includes(recSearch.toLowerCase()) || teacher.toLowerCase().includes(recSearch.toLowerCase());
    const matchesLevel = recLevel === "All" || level === recLevel;
    const matchesEnrollment = !enrolledLevel || level === enrolledLevel;
    return matchesSearch && matchesLevel && matchesEnrollment;
  });

  const visibleAnnouncements = announcements.filter(
    (announcement) =>
      announcement.courseLevel === student.courseLevel &&
      !deletedAnnouncementIds.includes(announcement.id)
  );

  const updateLessonProgress = async (lessonId: number, percentWatched: number, lastPositionSeconds: number, completed: boolean) => {
    await fetch(`/api/lessons/${lessonId}/progress?student_id_code=${encodeURIComponent(student.studentIdCode)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent_watched: percentWatched, last_position_seconds: lastPositionSeconds, completed })
    }).catch(() => {});
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-8" id="student-portal-viewport">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-indigo-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10 scale-150">
          <Sparkles size={250} />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
            <span>{d("STUDENT ENVIRONMENT", "ENTORNO DEL ESTUDIANTE")}</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
            ¡Hola, {student.fullName}!
          </h1>
          <p className="text-teal-100 text-sm max-w-xl text-left">
            {d(
              "Welcome back to Iniciativa Ser o Estar. Dive into your custom syllabus, watch recorded archives, or join active classes using your tools below.",
              "Bienvenido/a de nuevo a Iniciativa Ser o Estar. Explora tu plan de estudios personalizado, mira grabaciones archivadas o únete a clases en vivo con tus herramientas abajo."
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 shrink-0">
          <button
            onClick={onOpenChatbot}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 rounded-xl text-xs font-bold transition shadow-md cursor-pointer text-white"
          >
            {d("Ask Virtual Chatbot", "Preguntar al Chatbot Virtual")}
          </button>
          <button
            onClick={onExit}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer text-white"
          >
            <LogOut size={14} className="mr-2" />
            <span>{d("Exit Portal", "Salir del Portal")}</span>
          </button>
        </div>
      </div>

      {/* Course-group welcome letter alert card */}
      {welcomeLetter && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-teal-50 border border-teal-200 rounded-3xl p-6 text-left shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden"
          id="welcome-letter-callout"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-600 text-white rounded-2xl shrink-0 shadow-md">
              <Mail size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-teal-800 uppercase font-mono block">
                {d("OFFICIAL CORRESPONDENCE", "CORRESPONDENCIA OFICIAL")}
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                {d(
                  `Your Official Welcome Letter (${welcomeLetter.level} Group ${welcomeLetter.group})`,
                  `Tu Carta de Bienvenida Oficial (${welcomeLetter.level} Grupo ${welcomeLetter.group})`
                )}
              </h2>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                {d(
                  "A formal welcome letter from Iniciativa Ser o Estar, the Spanish Embassy, and Honorary Consulate. Please review the course schedules, working plan overview, and official certification requirements.",
                  "Una carta de bienvenida formal de Iniciativa Ser o Estar, la Embajada de España y el Consulado Honorario. Por favor, revisa los horarios del curso, el plan de trabajo y los requisitos oficiales de certificación."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setWelcomeLetterPage(1);
              setIsWelcomeLetterOpen(true);
            }}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-xs rounded-xl transition shadow-md shadow-teal-700/10 cursor-pointer shrink-0 flex items-center space-x-1.5"
          >
            <FileText size={14} />
            <span>{d("Open Official Letter", "Abrir Carta Oficial")}</span>
          </button>
        </motion.div>
      )}

      {/* Direct Class Announcements Billboard */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-3 font-sans text-left" id="class-announcements-locker">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-teal-850 uppercase tracking-wider">
            <AlertCircle size={13} className="text-teal-600 mb-0.5" />
            <span>{d(`Active Cohort Announcements (${student.courseLevel})`, `Anuncios de Cohorte Activa (${student.courseLevel})`)}</span>
          </div>
          {visibleAnnouncements.map((ann) => {
              const isRead = readAnnouncementIds.includes(ann.id);
              return (
              <div 
                key={ann.id} 
                className={`p-5 rounded-2xl border text-xs flex items-start gap-4 transition shadow-xs ${isRead ? "opacity-80" : ""} ${
                  ann.type === "important" ? "bg-rose-50/70 border-rose-200 text-rose-950" :
                  ann.type === "success" ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" :
                  "bg-indigo-50/70 border-indigo-200 text-slate-900"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  ann.type === "important" ? "bg-rose-100 text-rose-700" :
                  ann.type === "success" ? "bg-emerald-100 text-emerald-700" :
                  "bg-indigo-100 text-indigo-700"
                }`}>
                  <AlertCircle size={16} />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm uppercase tracking-tight">{ann.title}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isRead
                        ? "bg-slate-100 border-slate-200 text-slate-500"
                        : "bg-orange-100 border-orange-200 text-orange-700"
                    }`}>
                      {isRead ? d("Read", "Leído") : d("Unread", "No leído")}
                    </span>
                    <span className="text-[10px] bg-white border border-slate-200/50 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full">
                      {d(`Posted by ${ann.instructor}`, `Publicado por ${ann.instructor}`)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{ann.date}</span>
                  </div>
                  <p className="leading-relaxed text-slate-600 font-sans">{ann.text}</p>
                  <div className="pt-2 flex items-center gap-2">
                    {!isRead ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAnnouncementRead(ann.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-700 font-bold text-[10px] transition cursor-pointer"
                      >
                        <CheckCircle2 size={12} />
                        <span>{d("Mark as read", "Marcar como leído")}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteReadAnnouncement(ann.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-[10px] transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>{d("Delete read message", "Eliminar mensaje leído")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
        </div>
      )}

      {/* Modern Dashboard Segment Toggles */}
      <div className="flex border-b border-slate-200 overflow-x-auto flex-wrap" id="student-dashboard-tabs">
        <button
          onClick={() => setActiveTab("lessons")}
          className={`py-3 px-5 -mb-px text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition select-none cursor-pointer ${
            activeTab === "lessons" 
              ? "border-teal-600 text-teal-700 font-black" 
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <BookOpen size={14} />
          <span>{d("Active Learning Hub", "Centro de Aprendizaje Activo")}</span>
        </button>

        <button
          onClick={() => setActiveTab("grades-assignments")}
          className={`py-3 px-5 -mb-px text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition select-none cursor-pointer ${
            activeTab === "grades-assignments" 
              ? "border-teal-600 text-teal-700 font-black" 
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Award size={14} />
          <span>{d("Grades & Upload Assignments", "Calificaciones y Tareas")}</span>
        </button>

        <button
          onClick={() => setActiveTab("message-instructors")}
          className={`py-3 px-5 -mb-px text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition select-none cursor-pointer ${
            activeTab === "message-instructors" 
              ? "border-teal-600 text-teal-700 font-black" 
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Mail size={14} />
          <span>{d("Direct Email Tutors", "Enviar Correo a Tutores")}</span>
        </button>
      </div>

      {/* Conditionally Render Toggled Tab Workspace */}
      {activeTab === "lessons" && (
        <div className="space-y-8 animate-fade-in" id="lessons-hub-tab-pane">
          {insideClassRoom ? (
            /* SIMULATED CLASSROOM INTERACTIVE SCREEN */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
              {/* Embedded Video Area */}
              <div className="lg:col-span-2 bg-slate-950 flex flex-col justify-between text-white relative min-h-[350px]">
                {/* Class header */}
                <div className="bg-slate-900/80 backdrop-blur-xs p-4 flex justify-between items-center z-10 w-full">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">{d("ONLINE CLASS LIVE", "CLASE EN VIVO EN LÍNEA")}</span>
                    <h3 className="font-bold text-sm tracking-tight">{activeSession?.title}</h3>
                  </div>
                  <button
                    onClick={leaveLiveClassRoom}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold tracking-wide cursor-pointer transition text-white"
                  >
                    {d("Leave Class", "Salir de Clase")}
                  </button>
                </div>

                {/* Classroom feed video */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-4">
                  {activeSession?.roomUrl && activeSession?.joinToken ? (
                    <LiveVideoRoom
                      roomUrl={activeSession.roomUrl}
                      token={activeSession.joinToken}
                      userName={student.fullName}
                      onJoined={recordVideoJoinAttendance}
                      onLeft={leaveLiveClassRoom}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-teal-500/15 flex items-center justify-center animate-pulse border border-teal-500/40">
                        <Video size={32} className="text-teal-400" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-heading font-black text-lg sm:text-xl text-teal-300">{d("PROF. ALEJANDRO IS PRESENT", "EL PROF. ALEJANDRO ESTÁ PRESENTE")}</span>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                          {d(
                            "Audio & video streams synced via the live-room API. You have successfully logged join attendance to the school databases.",
                            "Flujos de audio y video sincronizados mediante la API de la sala en vivo. Has registrado con éxito tu asistencia en las bases de datos escolares."
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Classroom Footer controls */}
                <div className="bg-slate-900/85 p-4 flex flex-wrap justify-between items-center gap-3 z-10 mt-auto border-t border-slate-800 w-full">
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span>{d("Enrolled Peer Seats: 5 active students current", "Asientos de Compañeros Inscritos: 5 estudiantes activos actuales")}</span>
                  </div>
                  <div className="flex space-x-2">
                    <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-slate-300 text-[10px] font-mono">
                      Codec: Opus/VP8 HD
                    </span>
                    <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-slate-300 text-[10px] font-mono">
                      {d("Your Student Code:", "Tu Código de Estudiante:")} {student.studentIdCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Side Chat Workspace */}
              <div className="bg-slate-50 border-l border-slate-200 flex flex-col justify-between h-[450px] lg:h-auto">
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">{d("Interactive Class Chat", "Chat Interactivo de Clase")}</span>
                  <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                    Active WebSocket
                  </span>
                </div>

                {/* Chat message listing scrollpane */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans max-h-[350px]">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="flex flex-col space-y-1 text-left">
                      <div className="flex justify-between text-[10px] font-mono font-semibold">
                        <span className={msg.role === "teacher" ? "text-orange-600 font-bold" : "text-slate-600"}>
                          {msg.sender} <span className="text-slate-300">({d(msg.role, msg.role === "teacher" ? "profesor" : "estudiante")})</span>
                        </span>
                        <span className="text-slate-400">{msg.time}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl text-xs leading-relaxed max-w-[90%] ${
                        msg.role === "teacher" ? "bg-orange-50 text-orange-950 border border-orange-100" : "bg-white text-slate-800 border border-slate-200 shadow-xs"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input send bar */}
                <form onSubmit={sendLiveChatMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 w-full">
                  <input
                    type="text"
                    placeholder={d("Ask teacher a custom question...", "Hazle una pregunta al profesor...")}
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-250 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 rounded-xl text-white font-bold tracking-wide shrink-0 cursor-pointer transition flex items-center justify-center"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* LIVE SESSIONS ANNOUNCEMENT SECTION */
            activeSession && (
              <div className="bg-amber-50 rounded-3xl p-6 border-2 border-dashed border-amber-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-amber-100 rounded-2xl shrink-0 text-amber-700 animate-pulse">
                    <Video size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider bg-orange-100 px-2 py-0.5 rounded-full">
                        {activeSession.isLive
                          ? d("Live Session Ongoing", "Sesión en Vivo en Curso")
                          : d("Upcoming Live Session", "Próxima Sesión en Vivo")}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{d("Teacher:", "Profesor:")} {activeSession.teacher}</span>
                    </div>
                    <h4 className="font-sans font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      {activeSession.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {activeSession.isLive
                        ? d(
                            "Join now to participate in oral drill patterns. Joining automatically registers your present status metrics.",
                            "Únete ahora para participar en los patrones de práctica oral. Unirse registra automáticamente tu estado de asistencia como presente."
                          )
                        : d(`Scheduled for ${activeSession.startTime}. The join button becomes available up to 15 minutes before class.`, `Programada para ${activeSession.startTime}. Puedes entrar hasta 15 minutos antes de la clase.`)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={joinLiveClassRoom}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold font-sans text-xs tracking-wide shadow-md cursor-pointer shrink-0 transition-transform active:scale-95"
                >
                  {activeSession.isLive
                    ? d("Join Online Classroom", "Unirse al Aula Virtual")
                    : d("Join Scheduled Class", "Unirse a la Clase Programada")}
                </button>
              </div>
            )
          )}

          {courseCatalog.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-black text-slate-950 text-sm uppercase tracking-wider">{d("Course Library", "Biblioteca de Cursos")}</h3>
                  <p className="text-xs text-slate-500 mt-1">{d("Structured learning paths are now synced from the platform backend.", "Las rutas de aprendizaje estructuradas ahora se sincronizan desde el backend de la plataforma.")}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {courseCatalog.slice(0, 4).map((course: any) => (
                  <div key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{course.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1">{course.level} • {course.category}</div>
                      </div>
                      {typeof course.percent_complete === "number" && (
                        <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-1">
                          {course.percent_complete}%
                        </span>
                      )}
                    </div>
                    {course.certificate_eligible && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        {d("Certificate ready on completion record.", "Certificado listo en el registro de finalización.")}
                      </div>
                    )}
                    {course.modules?.slice(0, 2).map((module: any) => (
                      <div key={module.id} className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{module.title}</div>
                        {module.lessons?.slice(0, 2).map((lesson: any) => (
                          <div key={lesson.id} className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
                            <div className="flex justify-between gap-2">
                              <span className="text-xs font-bold text-slate-800">{lesson.title}</span>
                              <span className="text-[10px] font-mono text-slate-400">{lesson.progress?.percent_watched || 0}%</span>
                            </div>
                            {lesson.video_url && (
                              <AdaptiveLessonPlayer
                                src={lesson.video_url}
                                onProgress={(percent, position, completed) => updateLessonProgress(lesson.id, percent, position, completed)}
                              />
                            )}
                            {lesson.pdf_url && (
                              <a href={lesson.pdf_url} target="_blank" rel="noreferrer" className="inline-flex text-[10px] font-bold text-teal-700 hover:text-teal-500">
                                {d("Open PDF notes", "Abrir notas PDF")}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid: 1. Metrics, 2. Personal notes area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Course, Meta & Attendance Progress Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-sans font-black text-slate-950 text-sm uppercase tracking-wider flex items-center">
                  <User size={16} className="text-teal-600 mr-2" />
                  <span>{d("Enrollment & Status", "Inscripción y Estado")}</span>
                </h3>
              </div>

              <div className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-50 p-3 rounded-2xl text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-405 text-slate-400 uppercase tracking-widest block font-bold">{d("Active Level", "Nivel Activo")}</span>
                    <span className="font-sans font-extrabold text-base text-slate-800">{student.courseLevel}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-405 text-slate-400 uppercase tracking-widest block font-bold">{d("Weekly Group", "Grupo Semanal")}</span>
                    <span className="font-sans font-extrabold text-base text-slate-800">{d(student.classGroup, student.classGroup === "Morning Group" ? "Cohorte de Mañana" : student.classGroup === "Afternoon Group" ? "Horario de Tarde" : "Fin de Semana")}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-teal-800 font-bold block">{d("STUDENT IDENTIFIER", "IDENTIFICADOR DEL ESTUDIANTE")}</span>
                    <span className="font-mono text-xs uppercase text-slate-800 font-black tracking-wide">{student.studentIdCode}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-teal-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {d(student.learningMode, student.learningMode === "Online" ? "En línea" : "Presencial")}
                  </span>
                </div>

                {/* Attendance tracking */}
                <div className="space-y-3.5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-semibold text-slate-600 text-xs">{d("Verified Attendance Rate", "Tasa de Asistencia Verificada")}</span>
                    <span className="font-mono text-xs font-extrabold text-teal-700">{calculatedPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-300"
                      style={{ width: `${calculatedPercentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">{d("Present", "Presente")}</span>
                      <span className="font-mono font-extrabold text-sm text-emerald-600">{attendanceRecords.present}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">{d("Late", "Tarde")}</span>
                      <span className="font-mono font-extrabold text-sm text-amber-500">{attendanceRecords.late}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">{d("Absent", "Ausente")}</span>
                      <span className="font-mono font-extrabold text-sm text-slate-400">{attendanceRecords.absent}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note taking workspace */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="pb-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2 text-left">
                <h3 className="font-sans font-black text-slate-950 text-xs uppercase tracking-wider">
                  {d("Personal Study Notes & Concept Log", "Notas de Estudio Personal y Registro de Conceptos")}
                </h3>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={d("Search note tags...", "Buscar notas...")}
                    value={personalNotesSearch}
                    onChange={(e) => setPersonalNotesSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-7.5 pr-2.5 py-1.2 text-[11px] focus:outline-hidden focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Composition block */}
              <form onSubmit={handleAddNote} className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <input
                  type="text"
                  placeholder={d("Note Header (e.g. Estar Emotions)", "Título de Nota (ej. Emociones con Estar)")}
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-teal-600 sm:col-span-1"
                />
                <input
                  type="text"
                  placeholder={d("Take notes... (Ser is essence, Estar is state...)", "Tomar notas... (Ser es esencia, Estar es estado...)")}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-teal-600 sm:col-span-2"
                />
                <button
                  type="submit"
                  className="w-full bg-[#002626] hover:bg-slate-900 text-white rounded-xl py-2 font-bold font-sans text-xs tracking-wider cursor-pointer sm:col-span-3 transition flex items-center justify-center space-x-1"
                >
                  <Plus size={14} />
                  <span>{d("Pin new note to local workspace memory", "Fijar nueva nota en la memoria de trabajo")}</span>
                </button>
              </form>

              {/* Note ledger scrollpane */}
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pt-2 text-left w-full">
                {filteredPersonalNotes.length > 0 ? (
                  filteredPersonalNotes.map(n => (
                    <div key={n.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group text-left">
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="absolute right-3.5 top-3.5 p-1 text-slate-300 hover:text-rose-500 rounded-lg transition shrink-0 cursor-pointer"
                        title={d("Delete note", "Eliminar nota")}
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="text-[9px] font-mono font-bold text-teal-600 uppercase block tracking-wider">{n.date}</span>
                      <h4 className="font-extrabold text-xs text-slate-800 pr-6 mt-0.5">{n.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{n.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 font-sans">
                    {d("No matching notes found. Capture key Spanish insights above!", "No se encontraron notas coincidentes. ¡Captura ideas clave de español arriba!")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid bottom: locker + shared materials */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Standard Study Material Locker */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 text-left">
                <h3 className="font-sans font-black text-slate-950 text-xs uppercase tracking-wider">
                  {d("Personal Document & Media Locker", "Casillero Personal de Documentos y Multimedia")}
                </h3>
              </div>

              {/* Simulated upload target container */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                  dragging ? "border-orange-500 bg-orange-50/10" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <input
                  type="file"
                  id="student-locker-upload"
                  className="hidden"
                  onChange={handleManualFileSelect}
                />
                <label htmlFor="student-locker-upload" className="block cursor-pointer space-y-1.5">
                  <Upload size={20} className="text-slate-400 mx-auto" />
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-800 block font-bold">{d("Drag and drop mock files", "Arrastra y suelta archivos de prueba")}</span>
                    <span className="text-[10px] text-slate-400 block">{d("or click to pick from disk to upload notes", "o haz clic para seleccionar del disco y subir notas")}</span>
                  </div>
                </label>
              </div>

              {/* Uploaded folders list */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto text-left w-full">
                {uploadedFiles.map((f, id) => (
                  <div key={id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                    <div className="truncate pr-3 flex items-center min-w-0">
                      <span className="text-[8px] font-mono font-bold uppercase rounded bg-slate-200 text-slate-600 px-1 py-0.5 mr-1.5 inline-block shrink-0">
                        {f.type}
                      </span>
                      <span className="font-bold text-slate-800 truncate block">{f.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{f.size}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher distributed cheat-sheets based on course level */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 text-left">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-sans font-black text-slate-950 text-xs uppercase tracking-wider">
                  {d(`Teacher Shared Materials (Level ${student.courseLevel})`, `Materiales Compartidos por el Profesor (Nivel ${student.courseLevel})`)}
                </h3>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto w-full">
                {sharedNotes
                  .filter((note: any) => {
                    const studentLevel = student.courseLevel?.match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase();
                    const noteLevel = note.course_level || note.courseLevel;
                    return noteLevel === "All" || !studentLevel || noteLevel === studentLevel;
                  })
                  .map((note: any) => {
                    const level = note.course_level || note.courseLevel;
                    const size = note.file_size || note.size;
                    const date = note.created_at ? new Date(note.created_at).toLocaleDateString() : note.date;
                    const fileUrl = note.file_url || note.fileUrl;
                    return (
                    <div key={note.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-500 transition text-left">
                      <div className="space-y-0.5 truncate pr-4 text-left min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[9px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-sm font-mono">
                            {level}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">{date} • {size}</span>
                        </div>
                        <h4 className="font-sans font-bold text-xs text-slate-800 truncate leading-tight mt-0.5">
                          {note.title}
                        </h4>
                      </div>
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-600 rounded-xl transition shadow-xs cursor-pointer flex shrink-0"
                          title={d("Open or download material", "Abrir o descargar material")}
                        >
                          <FileDown size={14} />
                        </a>
                      ) : (
                        <button
                          onClick={() => alert(d("This example material has no uploaded file yet.", "Este material de ejemplo aún no tiene un archivo cargado."))}
                          className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl flex shrink-0"
                          title={d("Example material", "Material de ejemplo")}
                        >
                          <FileDown size={14} />
                        </button>
                      )}
                    </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* RECORDED CLASSES ARCHIVES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4 text-left">
              <h3 className="font-sans font-black text-slate-950 text-sm uppercase tracking-wider flex items-center">
                <Layers size={16} className="text-teal-600 mr-2" />
                <span>{d("Digital Recorded Class Archive", "Archivo Digital de Clases Grabadas")}</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={d("Search tutorials...", "Buscar tutoriales...")}
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-7.5 pr-2 py-1.2 text-xs focus:outline-hidden focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <select
                  value={recLevel}
                  onChange={(e) => setRecLevel(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.2 text-xs font-sans text-slate-600 focus:outline-hidden"
                >
                  <option value="All">{d("All Course Levels", "Todos los Niveles")}</option>
                  <option value="A1">{d("A1 Beginner", "A1 Principiante")}</option>
                  <option value="A2">{d("A2 Elementary", "A2 Elemental")}</option>
                  <option value="B1">{d("B1 Intermediate", "B1 Intermedio")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              {filteredRecordings.length > 0 ? (
                filteredRecordings.map((rec) => (
                  <div key={rec.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-mono">
                          {rec.course_level || rec.level}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{rec.date_recorded || rec.date}</span>
                      </div>
                      <h4 className="font-sans font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                        {rec.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">{d(`Recorded by ${rec.teacher_name || rec.teacher}`, `Grabado por ${rec.teacher_name || rec.teacher}`)}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/80">
                      <span className="text-[10px] font-mono text-slate-500 flex items-center">
                        <Clock size={11} className="mr-1" />
                        {d(rec.duration, rec.duration.replace("mins", "minutos"))}
                      </span>
                      <a
                        href={rec.video_url || rec.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[10px] font-bold text-teal-650 hover:text-teal-500"
                      >
                        <span>{d("Watch Archive", "Ver Grabación")}</span>
                        <ExternalLink size={10} className="ml-1" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-xs text-slate-400 font-sans">
                  {d("No matching archive recordings found.", "No se encontraron grabaciones de archivo coincidentes.")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GRADBOOK & HOMEWORK UPLOADER TAB */}
      {activeTab === "grades-assignments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left font-sans" id="grades-assignments-tab-pane">
          
          {/* Active Academic Transcript */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
              <h3 className="font-sans font-black text-slate-950 text-xs sm:text-sm uppercase tracking-wider flex items-center">
                <Award size={18} className="text-teal-600 mr-2" />
                <span>{d("Certified Gradebook & Transcript", "Libreta de Calificaciones Certificada")}</span>
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 bg-teal-50 border border-teal-100 rounded-full text-teal-800">
                {d(`Level ${student.courseLevel} Transcript`, `Expediente de Nivel ${student.courseLevel}`)}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400" style={{ letterSpacing: '0.05em' }}>{d("Average Score GPA", "Promedio General")}</span>
                <span className="font-extrabold text-2xl text-slate-800 mt-2 block">93.3%</span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">{d("Status: Summa Cum Laude Honors", "Estado: Honores Summa Cum Laude")}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400" style={{ letterSpacing: '0.05em' }}>{d("Assessed Components", "Componentes Evaluados")}</span>
                <span className="font-extrabold text-2xl text-slate-800 mt-2 block">3 / 4</span>
                <span className="text-[10px] text-slate-500 block mt-1">{d("1 review pending grading", "1 revisión pendiente de calificación")}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400" style={{ letterSpacing: '0.05em' }}>{d("Affiliated Registrar", "Registro Afiliado")}</span>
                <span className="font-extrabold text-xs text-teal-800 mt-3 block truncate font-bold">UNIMAK / SE / EMBAJADA</span>
                <span className="text-[9px] text-slate-400 block mt-1">{d("Tight SSO security verified", "Seguridad SSO estricta verificada")}</span>
              </div>
            </div>

            {/* Grade list LEDGER */}
            <div className="space-y-4 pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{d("Cumulative Assessments", "Evaluaciones Acumulativas")}</div>
              
              <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                {gradesList.map((grade) => (
                  <div key={grade.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition hover:bg-slate-100/50">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap text-left">
                        <h4 className="font-extrabold text-xs text-slate-900">{grade.subject}</h4>
                        <span className="text-[9px] font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                          {d(`Weight: ${grade.weight}`, `Peso: ${grade.weight}`)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-550 text-slate-500 italic">" {grade.remarks} "</p>
                      <span className="text-[10px] font-mono text-slate-400 block pt-0.5">{d(`Date Logged: ${grade.date}`, `Fecha de Registro: ${grade.date}`)}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl font-mono block ${
                        grade.score === "Pending Review" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-teal-600 text-white"
                      }`}>
                        {grade.score === "Pending Review" ? d("Pending Review", "Pendiente de Revisión") : grade.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Homework assignment direct uploader */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-sans font-black text-slate-950 text-xs uppercase tracking-wider flex items-center">
                  <Upload size={16} className="text-teal-600 mr-2" />
                  <span>{d("Interactive Homework Desk", "Escritorio Interactivo de Tareas")}</span>
                </h3>
              </div>

              {homeworkSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-[11px] flex items-start space-x-2">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <span className="font-bold">{d("Assignment Published!", "¡Tarea Publicada!")}</span>
                    <p className="text-emerald-700 font-medium">{d("Your homework file has been relayed and logged in the academic ledger.", "Tu archivo de tarea ha sido transmitido y registrado en el expediente académico.")}</p>
                  </div>
                </div>
              )}

              {/* Upload Form */}
              <form onSubmit={handleAddAssignmentSubmission} className="space-y-4 w-full">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{d("Target Assignment", "Tarea Objetivo")}</label>
                  <select
                    value={selectedAsgId}
                    onChange={(e) => setSelectedAsgId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden text-slate-700 font-bold"
                  >
                    {assignments.map(asg => (
                      <option key={asg.id} value={asg.id}>
                        {asg.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-bold">{d("Specify Document File Name", "Especificar Nombre de Archivo")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. abdul_kamara_ser_metaphor.pdf"
                    value={homeworkFileMockName}
                    onChange={(e) => setHomeworkFileMockName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-teal-600"
                  />
                  <span className="text-[9px] text-slate-400 block leading-tight">
                    {d("Type a mock file name above then click send to simulate a drag-and-drop secure upload file.", "Escribe un nombre de archivo ficticio arriba y luego haz clic en enviar para simular una carga segura.")}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!homeworkFileMockName}
                  className={`w-full py-2.5 rounded-xl font-bold font-sans text-xs tracking-wide transition cursor-pointer flex justify-center items-center text-white ${
                    homeworkFileMockName ? "bg-teal-700 hover:bg-teal-600 text-white shadow-md shadow-teal-700/10" : "bg-slate-100 text-slate-405 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle size={14} className="mr-1.5" />
                  <span>{d("Transmit Homework File", "Transmitir Archivo de Tarea")}</span>
                </button>
              </form>
            </div>

            {/* Assignments checklists */}
            <div className="space-y-3 pt-6 border-t border-slate-100 mt-6 text-left w-full">
              <span className="text-[10px] font-bold text-slate-405 text-slate-400 uppercase tracking-wider block">{d("Timeline Checklist", "Lista de Control Cronológica")}</span>
              
              <div className="space-y-2.5 w-full">
                {assignments.map((asg) => (
                  <div key={asg.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] flex justify-between items-center text-left">
                    <div className="truncate pr-4 space-y-0.5 text-left min-w-0">
                      <p className="font-extrabold text-slate-800 truncate leading-tight block">{asg.title}</p>
                      <span className="text-[9px] text-slate-400 font-mono block">{d(`Deadline: ${asg.deadline}`, `Fecha Límite: ${asg.deadline}`)}</span>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`px-2 py-0.5 rounded-full inline-block text-[9px] font-mono font-bold uppercase tracking-wider ${
                        asg.status === "Submitted" 
                          ? "bg-indigo-100 text-indigo-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {asg.status === "Submitted" ? d("Submitted", "Enviado") : d("Pending", "Pendiente")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT INSTRUCTOR EMAILS TAB */}
      {activeTab === "message-instructors" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left font-sans" id="message-instructors-tab-pane">
          
          {/* SMTP simulated email pane composer */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="font-sans font-black text-slate-950 text-xs sm:text-sm uppercase tracking-wider flex items-center">
                <Mail size={18} className="text-teal-600 mr-2" />
                <span>{d("Classroom SMTP Email Bridge (SSL Encrypted)", "Puente de Correo SMTP del Aula (Encriptado SSL)")}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-sans leading-relaxed">
                {d(
                  "Send formal academic email correspondence directly to your instructor's professional mailbox. Relayed live over Iniciativa Ser o Estar's Single Sign-On SMTP tunnel.",
                  "Envía correspondencia académica formal directamente al buzón profesional de tu instructor. Transmitido en vivo a través del túnel SMTP Single Sign-On de Iniciativa Ser o Estar."
                )}
              </p>
            </div>

            {emailSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start space-x-2.5">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-0.5">
                  <span className="font-bold">Transmission Successful! / ¡Envío Correcto!</span>
                  <p className="text-emerald-700">{d("Digital SMTP Relay completed with certificate code. Instructor has been notified on their terminal dashboard.", "Transmisión SMTP completada con código de certificado. El instructor ha sido notificado en su panel.")}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSendInstructorEmail} className="space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-404 text-slate-400 uppercase tracking-wider block">{d("Target Instructor", "Instructor Destinatario")}</label>
                  <select
                    value={instructorEmailTarget}
                    onChange={(e) => setInstructorEmailTarget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-bold focus:outline-hidden"
                  >
                    {portalTutors.map(tutor => (
                      <option key={tutor.id} value={tutor.email}>{tutor.name} ({tutor.email})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{d("Send From (Your SSO verified address)", "Enviado Desde (Tu dirección verificado SSO)")}</label>
                  <input
                    type="text"
                    disabled
                    value={student.email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-404 text-slate-400 uppercase tracking-wider block font-bold">{d("Subject Line", "Asunto")}</label>
                <input
                  type="text"
                  required
                  placeholder={d("e.g. Question on Estar Location rules vs emotional state descriptor", "ej. Pregunta sobre reglas de ubicación de Estar vs descriptor de estado emocional")}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-404 text-slate-400 uppercase tracking-wider block font-bold">{d("Email Message Content", "Contenido del Mensaje de Correo")}</label>
                <textarea
                  required
                  rows={5}
                  placeholder={d("Write your email here... Estimado/a Profesor...", "Escribe tu correo electrónico aquí... Estimado/a Profesor/a...")}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold font-sans text-xs tracking-wider transition-colors shadow-md shadow-teal-700/10 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Send size={13} />
                <span>{d("Transmit Secured Email Message", "Transmitir Mensaje de Correo Seguro")}</span>
              </button>
            </form>
          </div>

          {/* Sent Mail correspondences archives box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-sans font-black text-slate-950 text-xs uppercase tracking-wider flex items-center">
                  <Inbox size={16} className="text-teal-600 mr-2" />
                  <span>{d("Sent Message Log (Awaiting Response)", "Registro de Mensajes Enviados (Esperando Respuesta)")}</span>
                </h3>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto w-full">
                {emails.length > 0 ? (
                  emails.map((mail) => (
                    <div key={mail.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-left">
                      <div className="flex justify-between items-start flex-wrap gap-1 text-left">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-widest block">{d("To Instructor:", "Para el Instructor:")}</span>
                          <span className="text-xs font-bold text-slate-800 leading-none">{mail.instructor}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono italic">{mail.date}</span>
                      </div>
                      
                      <div className="border-t border-slate-205 pt-1">
                        <p className="text-[11px] font-extrabold text-slate-700 truncate block">{mail.subject}</p>
                        <p className="text-[10px] text-slate-555 text-slate-500 line-clamp-3 mt-1 leading-normal font-sans italic bg-white/50 p-2 rounded-lg border border-slate-200/40">{mail.text}</p>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[8px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <span>{mail.status === "DELIVERED" ? d("DELIVERED", "ENTREGADO") : mail.status}</span>
                        <CheckCircle size={9} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400 font-sans flex flex-col items-center justify-center space-y-2">
                    <Inbox size={24} className="text-slate-300" />
                    <span>{d("No sent mail has been logged in this session yet.", "Aún no se ha registrado ningún correo enviado en esta sesión.")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Registrar Signature */}
            <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-2xl text-[10px] text-slate-400 leading-relaxed mt-4 text-left">
              <span className="font-bold text-slate-600 uppercase block tracking-wider mb-0.5">{d("SMTP Relay Authentication", "Autenticación de Relevo SMTP")}</span>
              {d(
                "All SMTP records are mapped directly against active student IDs and validated using security certificates of partners like UNIMAK.",
                "Todos los registros SMTP se mapean directamente con los ID de estudiantes activos y se validan con certificados de seguridad de socios como UNIMAK."
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE OFFICIAL WELCOME LETTER MODAL */}
      {isWelcomeLetterOpen && welcomeLetter && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans" id="welcome-letter-modal-root">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto"
          >
            {/* Modal Header Controls */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-teal-850">
                <Award size={18} className="text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">{d("Official Academic Correspondence", "Correspondencia Académica Oficial")}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Page Selectors */}
                <div className="flex items-center bg-slate-200/60 p-1 rounded-xl text-xs font-bold text-slate-700">
                  <button 
                    onClick={() => setWelcomeLetterPage(1)}
                    className={`px-3 py-1 rounded-lg transition-all ${welcomeLetterPage === 1 ? "bg-white text-teal-800 shadow-xs" : "hover:text-slate-900"}`}
                  >
                    {d("Page 1", "Página 1")}
                  </button>
                  <button 
                    onClick={() => setWelcomeLetterPage(2)}
                    className={`px-3 py-1 rounded-lg transition-all ${welcomeLetterPage === 2 ? "bg-white text-teal-800 shadow-xs" : "hover:text-slate-900"}`}
                  >
                    {d("Page 2", "Página 2")}
                  </button>
                </div>

                <button 
                  onClick={() => setIsWelcomeLetterOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Close letter modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Letter Simulated Paper Container */}
            <div className="p-4 sm:p-8 bg-slate-100 max-h-[70vh] overflow-y-auto flex justify-center">
              <div className="bg-white border border-slate-200 shadow-lg rounded-2xl w-full max-w-xl p-6 sm:p-10 font-sans text-left relative overflow-hidden min-h-[680px] flex flex-col justify-between">
                
                {/* Simulated Embossed Stamp & Seals Header */}
                <div>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-5 mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-rose-800 font-extrabold text-[10px] tracking-widest uppercase">
                        <span>EMBASSY OF SPAIN</span>
                      </div>
                      <div className="text-teal-850 font-black text-xs tracking-wider uppercase">
                        ISoE &bull; INICIATIVA SER O ESTAR
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Logo size={56} showText={false} />
                    </div>
                  </div>

                  {welcomeLetterPage === 1 ? (
                    <div className="space-y-5 text-slate-800 animate-fade-in">
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight">{d("Official Welcome Letter", "Carta de Bienvenida Oficial")}</h3>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wide">
                          {d(
                            `Group ${welcomeLetter.group} – Intensive ${welcomeLetter.level} Spanish Course`,
                            `Grupo ${welcomeLetter.group} – Curso de Español ${welcomeLetter.level} Intensivo`
                          )}
                        </p>
                      </div>

                      <p className="text-xs font-bold text-slate-400 font-mono">Student ID: {student.studentIdCode}</p>

                      <p className="text-xs sm:text-sm leading-relaxed">
                        Dear {student.fullName},
                      </p>

                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 text-justify">
                        On behalf of <strong>Iniciativa Ser o Estar (ISoE)</strong>, it is our pleasure to officially welcome you to the intensive {welcomeLetter.level} Spanish course. This program is tailored for learners who are passionate about advancing their journey toward Spanish fluency.
                      </p>

                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 text-justify">
                        As the world continues to evolve through new market strategies and global trade driven by technological advancements, staying ahead has become crucial. Enhancing your professional skills for the global marketplace helps you remain competitive and strengthens your position in the international business environment.
                      </p>

                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                        Classes are online, and will be held on:
                      </p>

                      <div className="bg-teal-50/50 border-l-4 border-teal-600 p-3.5 rounded-r-xl">
                        <span className="text-xs font-extrabold text-teal-950 block">{d("Course Dates / Fechas del Curso:", "Fechas del Curso:")}</span>
                        <p className="text-xs font-bold text-teal-850 m-0">
                          {welcomeLetter.courseDates} ({welcomeLetter.durationWeeks} weeks of intensive learning)
                        </p>
                      </div>

                      {/* Sessions Table */}
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                              <th className="p-2.5">Time</th>
                              <th className="p-2.5">Day</th>
                              <th className="p-2.5">Hours</th>
                              <th className="p-2.5">Session</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {welcomeLetter.sessions.map((session) => (
                              <tr key={`${session.day}-${session.time}-${session.session}`}>
                                <td className="p-2.5 font-bold">{session.time}</td>
                                <td className="p-2.5">{session.day}</td>
                                <td className="p-2.5">1</td>
                                <td className="p-2.5 font-mono text-teal-700">{session.session}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-1">{d("Working Plan Overview", "Resumen del Plan de Trabajo")}</h4>
                        <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                          <li><strong>Grammar Lab:</strong> Focused sessions on essential Spanish grammar topics.</li>
                          <li><strong>Vocabulary & Conversation:</strong> Practical speaking drills.</li>
                          <li><strong>Listening Practice:</strong> Activities to improve comprehension.</li>
                          <li><strong>Assessments:</strong> Periodic evaluations to track progress.</li>
                          <li><strong>Final Project:</strong> Coaching on project design and rehearsals.</li>
                          <li><strong>Group Size:</strong> Maximum 16 participants per session.</li>
                          <li><strong>Recovery:</strong> One recovery class is available every two weeks.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 text-slate-800 animate-fade-in font-sans">
                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-1">{d("Attendance & Certification Rules", "Reglas de Asistencia y Certificación")}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify font-sans">
                          For this {welcomeLetter.durationWeeks}-week {welcomeLetter.level} Spanish Intensive Course, a certificate of participation will be awarded by the <strong>Embassy of Spain in Guinea and Sierra Leone</strong>, in partnership with the <strong>Honorary Consulate of Spain in Freetown</strong>.
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify font-sans">
                          <strong>Attendance is the main criterion:</strong>
                        </p>
                        <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                          <li>If your attendance is below 85%, you may continue with the course by paying a registration fee of 250 leones. This fee is reimbursable if you attend at least 80% of the course.</li>
                          <li>A minimum of 80% attendance is required for certification.</li>
                          <li>If your attendance is below 80%, the registration fee is not reimbursable and a certificate of participation will not be issued.</li>
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-1">{d("Official Registration Acceptance", "Aceptación de Registro Oficial")}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify font-sans">
                          If you are still interested in improving your Spanish skills through this course, kindly confirm your acceptance of this letter via email or WhatsApp.
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify font-sans font-medium">
                          Once confirmed, you will receive your <strong>Participant Card</strong>, <strong>Detailed Working Plan</strong>, and physical address & access details to the interactive classroom in Freetown.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 font-sans">
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                          We look forward to supporting your learning journey and ensuring your experience is both productive and enjoyable.
                        </p>

                        <div className="mt-5 text-left space-y-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 m-0">¡Nos vemos pronto!</p>
                          <p className="text-xs sm:text-sm font-extrabold text-teal-750 m-0">Saludos del Equipo de Iniciativa Ser o Estar</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Stamp / Footer */}
                <div className="border-t border-slate-100 pt-5 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 gap-2">
                  <div>
                    <span className="font-bold text-slate-500 uppercase block">Contact Support</span>
                    <span>+232 72 057646 | seroestar@icloud.com</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono">{d("May 2026 Edition", "Edición de Mayo 2026")}</span>
                    <span className="block text-[9px] text-slate-300 font-mono">Page {welcomeLetterPage} of 2</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d("Iniciativa Ser o Estar © 2026", "Iniciativa Ser o Estar © 2026")}</span>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setWelcomeLetterPage(welcomeLetterPage === 1 ? 2 : 1)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {welcomeLetterPage === 1 ? d("Next Page →", "Siguiente Página →") : d("← Previous Page", "← Página Anterior")}
                </button>
                <button
                  onClick={() => setIsWelcomeLetterOpen(false)}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {d("Close Letter", "Cerrar Carta")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
