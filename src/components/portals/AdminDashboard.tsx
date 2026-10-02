import React, { useEffect, useState } from "react";
import {
  Settings,
  Plus,
  Trash2,
  Image as ImageIcon,
  BookOpen,
  TrendingUp,
  Users,
  Upload,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  Award,
  Check,
  Edit,
  Globe,
  DollarSign,
  LogOut
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { TUTOR_PROFILES } from "../../tutors";
import PasswordInput from "../PasswordInput";

interface AdminDashboardProps {
  onExit: () => void;
  adminProfile?: any;
  blogPosts: any[];
  onAddBlogPost: (post: any) => void;
  onDeleteBlogPost: (id: string) => void;
  onUpdateImage: (imgUpdate: any) => void;
  customUploadedImages: any[];
  lang?: "EN" | "ES";
}

const readLocalList = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalList = (key: string, value: any[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateLocalCode = (prefix: string, existingCodes: string[]) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = `${prefix}-${Math.floor(Math.random() * 900) + 100}`;
    if (!existingCodes.includes(code)) return code;
  }
  return `${prefix}-${Date.now().toString().slice(-5)}`;
};

const localStudentsForAdmin = () =>
  readLocalList("portal_students").map((student: any, index: number) => ({
    id: index + 1,
    student_id_code: student.studentIdCode || student.student_id_code,
    full_name: student.fullName || student.full_name,
    email: student.email,
    phone_number: student.phoneNumber || student.phone_number || "",
    course_level: student.courseLevel || student.course_level || "A1",
    class_group: student.classGroup || student.class_group || "Morning Group",
    learning_mode: student.learningMode || student.learning_mode || "Online",
    status: student.status || "Active",
    registration_date: student.registrationDate || student.registration_date || new Date().toISOString(),
  }));

const localTeachersForAdmin = () => [
  ...readLocalList("portal_teachers").map((teacher: any, index: number) => ({
    id: index + 1,
    teacher_id_code: teacher.teacherId || teacher.teacher_id_code,
    name: teacher.fullName || teacher.full_name || teacher.name,
    display_name: teacher.displayName || teacher.display_name || teacher.fullName || teacher.name,
    email: teacher.email,
    assigned_levels: teacher.assignedLevels || teacher.assigned_levels || ["A1"],
    source: "database",
  })),
  ...TUTOR_PROFILES.map((tutor) => ({
    id: tutor.id,
    teacher_id_code: tutor.id,
    name: tutor.name,
    display_name: tutor.displayName,
    email: tutor.email,
    assigned_levels: tutor.assignedLevels,
    source: "template",
  })),
];

const createLocalStudentAccount = (payload: any) => {
  const existing = readLocalList("portal_students");
  const email = String(payload.email || "").trim().toLowerCase();
  if (existing.some((student: any) => String(student.email || "").toLowerCase() === email)) {
    throw new Error("An account with this email already exists.");
  }

  const studentIdCode = generateLocalCode(
    "SER",
    existing.map((student: any) => student.studentIdCode || student.student_id_code).filter(Boolean),
  );
  const now = new Date().toISOString();
  const student = {
    fullName: payload.full_name,
    studentIdCode,
    email,
    password: payload.password,
    phoneNumber: payload.phone_number || "",
    courseLevel: payload.course_level || "A1",
    classGroup: payload.class_group || "Morning Group",
    learningMode: payload.learning_mode || "Online",
    status: payload.status || "Active",
    registrationDate: now,
    authMethod: "Admin Local",
  };

  writeLocalList("portal_students", [...existing, student]);
  return {
    student_id_code: studentIdCode,
    full_name: student.fullName,
    email: student.email,
    course_level: student.courseLevel,
    class_group: student.classGroup,
    learning_mode: student.learningMode,
  };
};

const mirrorLocalStudentAccount = (payload: any, studentIdCode?: string) => {
  const existing = readLocalList("portal_students");
  const email = String(payload.email || "").trim().toLowerCase();
  const now = new Date().toISOString();
  const existingIndex = existing.findIndex((student: any) => String(student.email || "").toLowerCase() === email);
  const current = existingIndex >= 0 ? existing[existingIndex] : {};
  // No `password` field: this mirror exists only so the roster can still
  // render (name/email/course info) if the real API is briefly unreachable
  // — localStudentsForAdmin() never reads a password back — so there is no
  // reason to keep a plaintext copy of it sitting in browser storage.
  const student = {
    ...current,
    fullName: payload.full_name || current.fullName || current.full_name,
    studentIdCode: studentIdCode || current.studentIdCode || current.student_id_code || generateLocalCode(
      "SER",
      existing.map((record: any) => record.studentIdCode || record.student_id_code).filter(Boolean),
    ),
    email,
    password: undefined,
    phoneNumber: payload.phone_number || current.phoneNumber || current.phone_number || "",
    courseLevel: payload.course_level || current.courseLevel || current.course_level || "A1",
    classGroup: payload.class_group || current.classGroup || current.class_group || "Morning Group",
    learningMode: payload.learning_mode || current.learningMode || current.learning_mode || "Online",
    status: payload.status || current.status || "Active",
    registrationDate: current.registrationDate || current.registration_date || now,
    authMethod: "Admin Mirror",
  };

  if (existingIndex >= 0) {
    existing[existingIndex] = student;
  } else {
    existing.push(student);
  }
  writeLocalList("portal_students", existing);
  return student;
};

const createLocalTeacherAccount = (payload: any) => {
  const existing = readLocalList("portal_teachers");
  const email = String(payload.email || "").trim().toLowerCase();
  const emailExists =
    existing.some((teacher: any) => String(teacher.email || "").toLowerCase() === email) ||
    TUTOR_PROFILES.some((teacher) => teacher.email.toLowerCase() === email);

  if (emailExists) {
    throw new Error("An account with this email already exists.");
  }

  const teacherId = generateLocalCode(
    "TUT",
    existing.map((teacher: any) => teacher.teacherId || teacher.teacher_id_code).filter(Boolean),
  );
  const assignedLevels = Array.isArray(payload.assigned_levels) && payload.assigned_levels.length
    ? payload.assigned_levels
    : ["A1"];
  const teacher = {
    fullName: payload.full_name,
    displayName: payload.full_name,
    teacherId,
    email,
    password: payload.password,
    assignedLevels,
    createdAt: new Date().toISOString(),
  };

  writeLocalList("portal_teachers", [...existing, teacher]);
  return {
    teacher_id_code: teacherId,
    assigned_levels: assignedLevels,
    full_name: teacher.fullName,
    email: teacher.email,
  };
};

const mirrorLocalTeacherAccount = (payload: any, teacherId?: string) => {
  const existing = readLocalList("portal_teachers");
  const email = String(payload.email || "").trim().toLowerCase();
  const existingIndex = existing.findIndex((teacher: any) => String(teacher.email || "").toLowerCase() === email);
  const current = existingIndex >= 0 ? existing[existingIndex] : {};
  const assignedLevels = Array.isArray(payload.assigned_levels) && payload.assigned_levels.length
    ? payload.assigned_levels
    : current.assignedLevels || current.assigned_levels || ["A1"];
  // No `password` field here either — see the matching comment in
  // mirrorLocalStudentAccount above; localTeachersForAdmin() never reads it.
  const teacher = {
    ...current,
    fullName: payload.full_name || current.fullName || current.full_name || current.name,
    displayName: payload.full_name || current.displayName || current.display_name || current.name,
    teacherId: teacherId || current.teacherId || current.teacher_id_code || generateLocalCode(
      "TUT",
      existing.map((record: any) => record.teacherId || record.teacher_id_code).filter(Boolean),
    ),
    email,
    password: undefined,
    assignedLevels,
    createdAt: current.createdAt || current.created_at || new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    existing[existingIndex] = teacher;
  } else {
    existing.push(teacher);
  }
  writeLocalList("portal_teachers", existing);
  return teacher;
};

const localTeacherProgressForAdmin = () =>
  localTeachersForAdmin().map((teacher: any) => ({
    teacher_id: teacher.teacher_id_code,
    teacher_name: teacher.name,
    email: teacher.email,
    assigned_levels: teacher.assigned_levels || ["A1"],
    total_hours: 0,
    classes_given: 0,
    attendance: {
      present: 0,
      late: 0,
      absent: 0,
      rate: 100,
    },
    recent_sessions: [],
  }));

export default function AdminDashboard({
  onExit,
  adminProfile,
  blogPosts,
  onAddBlogPost,
  onDeleteBlogPost,
  onUpdateImage,
  customUploadedImages,
  lang = "EN"
}: AdminDashboardProps) {

  const d = (en: string, es: string) => (lang === "ES" ? es : en);
  const adminHeaders = {};
  const adminJsonHeaders = { "Content-Type": "application/json" };

  const readApiPayload = async (response: Response) => {
    const rawText = await response.text();
    if (!rawText) return {};
    try {
      return JSON.parse(rawText);
    } catch {
      return { detail: rawText.slice(0, 220) };
    }
  };

  const apiErrorMessage = (payload: any, fallback: string, status: number) => {
    const detail = payload?.detail || payload?.error;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || String(item)).join("; ");
    }
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return `${fallback} HTTP ${status}.`;
  };

  const isDuplicateAccountError = (payload: any) => {
    const detail = payload?.detail || payload?.error || "";
    return typeof detail === "string" && detail.toLowerCase().includes("already exists");
  };

  // Blog post addition state
  const [blogTitle, setBlogTitle] = useState("");
  const [blogCategory, setBlogCategory] = useState("Grammar");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogImage, setBlogImage] = useState("");

  // Target image replacement state
  const [replaceTargetSlot, setReplaceTargetSlot] = useState("Hero Banner");
  const [replaceImageFile, setReplaceImageFile] = useState<string | null>(null);
  const [replaceImageTitle, setReplaceImageTitle] = useState("");
  const [replaceAltText, setReplaceAltText] = useState("");
  const [dragging, setDragging] = useState(false);

  // Migration UI state
  const [migrationFile, setMigrationFile] = useState<File | null>(null);
  const [migrationPreviewCount, setMigrationPreviewCount] = useState<number | null>(null);
  const [migrationResult, setMigrationResult] = useState<any | null>(null);
  const [migrating, setMigrating] = useState(false);

  // Students' @iseroestar.com Google accounts
  type GoogleAccountStatus = {
    enabled: boolean;
    missing_settings: string[];
    domain: string;
    students: Array<{ student_id_code: string; full_name: string; course_level: string; workspace_email: string | null }>;
  };
  type CreatedGoogleAccount = { student_id_code: string; full_name: string; email: string; temporary_password: string };
  const [googleStatus, setGoogleStatus] = useState<GoogleAccountStatus | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleCreated, setGoogleCreated] = useState<CreatedGoogleAccount[]>([]);
  const [googleFailed, setGoogleFailed] = useState<Array<{ student_id_code: string; full_name: string; detail: string }>>([]);

  const loadGoogleAccounts = () => {
    setGoogleError(null);
    fetch("/api/admin/google-accounts", { headers: adminHeaders })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `google-accounts ${res.status}`);
        setGoogleStatus(data);
      })
      .catch((err) => setGoogleError(err?.message || String(err)));
  };

  useEffect(() => {
    loadGoogleAccounts();
  }, []);

  const googleMissingCount = googleStatus ? googleStatus.students.filter((s) => !s.workspace_email).length : 0;

  const handleCreateGoogleAccounts = async () => {
    if (!googleStatus || googleMissingCount === 0) return;
    const confirmed = window.confirm(d(
      `Create ${googleMissingCount} Google account(s) on ${googleStatus.domain}? Each account is a Google Workspace licence.`,
      `¿Crear ${googleMissingCount} cuenta(s) de Google en ${googleStatus.domain}? Cada cuenta es una licencia de Google Workspace.`
    ));
    if (!confirmed) return;

    setGoogleBusy(true);
    setGoogleError(null);
    const created: CreatedGoogleAccount[] = [];
    const failed: Array<{ student_id_code: string; full_name: string; detail: string }> = [];
    try {
      // Small batches keep each request inside the serverless time limit.
      for (let round = 0; round < 20; round++) {
        const res = await fetch("/api/admin/google-accounts", {
          method: "POST",
          headers: adminJsonHeaders,
          body: JSON.stringify({ limit: 15, exclude_student_id_codes: failed.map((f) => f.student_id_code) })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `google-accounts ${res.status}`);
        created.push(...(data.created || []));
        failed.push(...(data.failed || []));
        setGoogleCreated([...created]);
        setGoogleFailed([...failed]);
        if (!data.remaining || ((data.created || []).length === 0 && (data.failed || []).length === 0)) break;
      }
    } catch (err: any) {
      setGoogleError(err?.message || String(err));
    } finally {
      setGoogleBusy(false);
      loadGoogleAccounts();
    }
  };

  const downloadGoogleAccountsCsv = () => {
    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = googleCreated.map((a) => [a.full_name, a.student_id_code, a.email, a.temporary_password].map(escape).join(","));
    const csv = ["Name,Student code,Email,Temporary password", ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_google_accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const [teacherProgress, setTeacherProgress] = useState<any[]>([]);
  const [peopleStudents, setPeopleStudents] = useState<any[]>([]);
  const [peopleTeachers, setPeopleTeachers] = useState<any[]>([]);
  const [peopleMessage, setPeopleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  const [studentFullName, setStudentFullName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentLevel, setStudentLevel] = useState("A1");
  const [studentGroup, setStudentGroup] = useState("Group 1");
  const [studentMode, setStudentMode] = useState("Online");

  const [teacherFullName, setTeacherFullName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherLevels, setTeacherLevels] = useState("A1,A2");

  useEffect(() => {
    fetch("/api/admin/teacher-progress", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`teacher-progress ${res.status}`);
        return res.json();
      })
      .then((data) => setTeacherProgress(Array.isArray(data) ? data : []))
      .catch(() => setTeacherProgress(localTeacherProgressForAdmin()));
  }, []);

  const loadPeople = () => {
    fetch("/api/admin/students", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`students ${res.status}`);
        return res.json();
      })
      .then((data) => setPeopleStudents(Array.isArray(data) ? data : []))
      .catch(() => setPeopleStudents(localStudentsForAdmin()));

    fetch("/api/admin/teachers", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`teachers ${res.status}`);
        return res.json();
      })
      .then((data) => setPeopleTeachers(Array.isArray(data) ? data : []))
      .catch(() => setPeopleTeachers(localTeachersForAdmin()));
  };

  const loadTeacherProgress = () => {
    fetch("/api/admin/teacher-progress", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`teacher-progress ${res.status}`);
        return res.json();
      })
      .then((data) => setTeacherProgress(Array.isArray(data) ? data : []))
      .catch(() => setTeacherProgress(localTeacherProgressForAdmin()));
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const handleCreateStudentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFullName || !studentEmail || !studentPassword) return;
    setCreatingStudent(true);
    setPeopleMessage(null);

    try {
      const studentPayload = {
        full_name: studentFullName,
        email: studentEmail,
        password: studentPassword,
        phone_number: studentPhone,
        course_level: studentLevel,
        class_group: studentGroup,
        learning_mode: studentMode,
        status: "Active"
      };
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: adminJsonHeaders,
        body: JSON.stringify(studentPayload)
      });

      let payload = await readApiPayload(response);
      let createdViaFallback = false;
      let createdViaBrowserFallback = false;

      if (response.status === 404) {
        const fallbackResponse = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(studentPayload)
        });
        payload = await readApiPayload(fallbackResponse);
        createdViaFallback = fallbackResponse.ok;
        if (!fallbackResponse.ok) {
          if (fallbackResponse.status === 404) {
            payload = createLocalStudentAccount(studentPayload);
            createdViaBrowserFallback = true;
          } else {
            throw new Error(apiErrorMessage(payload, "Unable to create student account.", fallbackResponse.status));
          }
        }
      } else if (!response.ok) {
        if (response.status === 400 && isDuplicateAccountError(payload)) {
          // An account with this email already exists in the real database.
          // Earlier this silently mirrored the new password into local
          // browser storage and reported success, without ever touching the
          // real account — meaning the "new" password never actually worked
          // for login. Surface it as the error it actually is instead.
          throw new Error(
            d(
              "An account with this email already exists. Use the student's original password, or change it via the database — this form cannot reset an existing account's password.",
              "Ya existe una cuenta con este correo. Usa la contraseña original del estudiante, o cámbiala a través de la base de datos — este formulario no puede restablecer la contraseña de una cuenta existente."
            )
          );
        } else {
          throw new Error(apiErrorMessage(payload, "Unable to create student account.", response.status));
        }
      }

      mirrorLocalStudentAccount(studentPayload, payload.student_id_code);

      setPeopleMessage({
        type: "success",
        text: d(
          `Student created. ID: ${payload.student_id_code}${createdViaBrowserFallback ? " (browser fallback)" : createdViaFallback ? " (registration fallback)" : ""}`,
          `Estudiante creado. ID: ${payload.student_id_code}${createdViaBrowserFallback ? " (respaldo del navegador)" : createdViaFallback ? " (registro alternativo)" : ""}`
        )
      });
      setStudentFullName("");
      setStudentEmail("");
      setStudentPassword("");
      setStudentPhone("");
      setStudentLevel("A1");
      setStudentGroup("Group 1");
      setStudentMode("Online");
      loadPeople();
    } catch (err) {
      setPeopleMessage({ type: "error", text: err instanceof Error ? err.message : "Unable to create student account." });
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleCreateTeacherAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherFullName || !teacherEmail || !teacherPassword) return;
    setCreatingTeacher(true);
    setPeopleMessage(null);

    try {
      const assignedLevels = teacherLevels.split(",").map(level => level.trim()).filter(Boolean);
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: adminJsonHeaders,
        body: JSON.stringify({
          full_name: teacherFullName,
          email: teacherEmail,
          password: teacherPassword,
          assigned_levels: assignedLevels.length ? assignedLevels : ["A1"]
        })
      });
      let payload = await readApiPayload(response);
      let createdViaBrowserFallback = false;
      if (!response.ok) {
        if (response.status === 404) {
          payload = createLocalTeacherAccount({
            full_name: teacherFullName,
            email: teacherEmail,
            password: teacherPassword,
            assigned_levels: assignedLevels.length ? assignedLevels : ["A1"]
          });
          createdViaBrowserFallback = true;
        } else if (response.status === 400 && isDuplicateAccountError(payload)) {
          // See the matching comment in handleCreateStudentAccount: this used
          // to silently mirror the new password to local storage and report
          // success without ever touching the real account.
          throw new Error(
            d(
              "An account with this email already exists. Use the tutor's original password, or change it via the database — this form cannot reset an existing account's password.",
              "Ya existe una cuenta con este correo. Usa la contraseña original del tutor, o cámbiala a través de la base de datos — este formulario no puede restablecer la contraseña de una cuenta existente."
            )
          );
        } else {
          throw new Error(apiErrorMessage(payload, "Unable to create teacher account.", response.status));
        }
      }

      mirrorLocalTeacherAccount({
        full_name: teacherFullName,
        email: teacherEmail,
        password: teacherPassword,
        assigned_levels: assignedLevels.length ? assignedLevels : ["A1"]
      }, payload.teacher_id_code);

      setPeopleMessage({
        type: "success",
        text: d(
          `Teacher created. ID: ${payload.teacher_id_code}${createdViaBrowserFallback ? " (browser fallback)" : ""}`,
          `Profesor creado. ID: ${payload.teacher_id_code}${createdViaBrowserFallback ? " (respaldo del navegador)" : ""}`
        )
      });
      setTeacherFullName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherLevels("A1,A2");
      loadPeople();
      loadTeacherProgress();
    } catch (err) {
      setPeopleMessage({ type: "error", text: err instanceof Error ? err.message : "Unable to create teacher account." });
    } finally {
      setCreatingTeacher(false);
    }
  };

  const totalTeacherHours = teacherProgress.reduce((sum, teacher) => sum + (teacher.total_hours || 0), 0).toFixed(1);
  const totalTeacherAbsences = teacherProgress.reduce((sum, teacher) => sum + (teacher.attendance?.absent || 0), 0);
  const teacherAttendanceAverage = teacherProgress.length
    ? Math.round(teacherProgress.reduce((sum, teacher) => sum + (teacher.attendance?.rate ?? 100), 0) / teacherProgress.length)
    : 100;
  const totalCompletedClasses = teacherProgress.reduce((sum, teacher) => sum + (teacher.completed_classes || 0), 0);
  const totalLiveClassesNow = teacherProgress.reduce((sum, teacher) => sum + (teacher.live_classes || 0), 0);

  // Real per-tutor breakdown for the telemetry chart, derived from the same
  // teacherProgress data the stat cards use — replaces a previous chart
  // that plotted six months of entirely fabricated numbers.
  const tutorTelemetryChartData = teacherProgress.map((teacher) => ({
    name: teacher.display_name || teacher.teacher_name || teacher.email || "Tutor",
    completed: teacher.completed_classes || 0,
    attendanceRate: teacher.attendance?.rate ?? 0,
  }));

  // Stats Counters — every value below is computed from real data returned
  // by the backend (peopleStudents, teacherProgress); none are hardcoded
  // placeholders, so a fresh install correctly shows zeros instead of a
  // fake baseline.
  const telemetryStats = [
    { title: d("Total Enrolled Students", "Estudiantes Inscritos Totales"), value: d(`${peopleStudents.length} active`, `${peopleStudents.length} activos`), icon: Users, change: d("Server-side enrollment", "Inscripción desde servidor"), color: "text-teal-600" },
    { title: d("Avg Class Roster Attendance", "Asistencia Promedio de Clase"), value: `${teacherAttendanceAverage}%`, icon: Award, change: d("Goal: >90%", "Meta: >90%"), color: "text-emerald-600" },
    { title: d("Live Classes Completed", "Clases en Vivo Completadas"), value: d(`${totalCompletedClasses} sessions`, `${totalCompletedClasses} sesiones`), icon: Layers, change: d(`${totalLiveClassesNow} live now`, `${totalLiveClassesNow} en vivo ahora`), color: "text-indigo-600" },
    { title: d("Tutor Hours Logged", "Horas de Tutor Registradas"), value: `${totalTeacherHours}h`, icon: Clock, change: d(`${teacherAttendanceAverage}% tutor attendance`, `${teacherAttendanceAverage}% asistencia tutor`), color: "text-orange-500" }
  ];

  // Map of static images we allow replaced. Only slots that are actually
  // wired to a real image override on the page belong here — see
  // imageOverrides["Hero Banner"] in App.tsx. The other three historical
  // slots (Ser Metaphor Compass, Estar Metaphor Map, Methodology Classroom)
  // were removed: they had no corresponding image element on the page at
  // all, so selecting them and "saving" a replacement silently did nothing.
  const websiteImageSlots = [
    { slot: "Hero Banner", description: d("Main illustration showing study classrooms overlaying the hero section.", "Ilustración principal que muestra aulas de estudio superpuestas en la sección hero."), current: "/images/spanish_classroom_hero_1782078041463.jpg" }
  ];

  // Submit Blog
  const handlePublishBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle || !blogExcerpt || !blogContent) return;

    const newPost = {
      id: `blog-art-${Date.now()}`,
      title: blogTitle,
      category: blogCategory,
      excerpt: blogExcerpt,
      contentMarkdown: blogContent,
      imageUrl: blogImage || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      readTime: "4 min read"
    };

    onAddBlogPost(newPost);
    alert(d("Práctico! Newly compiled blog post successfully integrated in landing page feed!", "¡Práctico! ¡La nueva publicación de blog ha sido integrada exitosamente en el canal de la página de inicio!"));
    setBlogTitle("");
    setBlogExcerpt("");
    setBlogContent("");
    setBlogImage("");
  };

  // Drag images mock
  const handleDropImageFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setReplaceImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
      setReplaceImageTitle(file.name);
      setReplaceAltText(`Iniciativa Ser o Estar Academy - ${replaceTargetSlot}`);
    }
  };

  const handleManualImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setReplaceImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
      setReplaceImageTitle(file.name);
      setReplaceAltText(`Iniciativa Ser o Estar Academy - ${replaceTargetSlot}`);
    }
  };

  // Commit Image swap
  const handleSaveImageSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceImageFile) return;

    onUpdateImage({
      slot: replaceTargetSlot,
      fileData: replaceImageFile,
      title: replaceImageTitle,
      altText: replaceAltText,
      dateUploaded: new Date().toISOString().split("T")[0]
    });

    alert(d(`¡Estupendo! Image slot "${replaceTargetSlot}" successfully updated which immediately overrides public illustration frames!`, `¡Estupendo! El espacio de imagen "${replaceTargetSlot}" se actualizó con éxito, lo que anula inmediatamente los marcos de ilustración públicos.`));
    setReplaceImageFile(null);
    setReplaceImageTitle("");
    setReplaceAltText("");
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-8" id="admin-portal-viewport">
      {/* Upper Status Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-700 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10 scale-150">
          <Settings size={250} />
        </div>
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
            <span>{d("ADMINISTRATIVE ROOT SECURITY", "SEGURIDAD RAÍZ ADMINISTRATIVA")}</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
            {d(`Hello, ${adminProfile?.fullName || "Administrator"}!`, `¡Hola, ${adminProfile?.fullName || "Administrador"}!`)}
          </h1>
          <p className="text-orange-100 text-sm max-w-xl">
            {d("You hold master permissions to rewrite core blog feeds, swap classroom graphic assets, and check active school registration metrics.", "Tienes permisos maestros para reescribir publicaciones de blog principales, cambiar recursos gráficos de las aulas y consultar métricas de registro escolar.")}
          </p>
        </div>
        <button
          onClick={onExit}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer relative z-10"
        >
          <LogOut size={14} className="mr-2" />
          <span>{d("Exit Portal", "Salir del Portal")}</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {telemetryStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
              <div className={`p-3.5 bg-slate-50 rounded-2xl ${stat.color} shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{stat.title}</span>
                <span className="font-sans font-black text-lg text-slate-800 block">{stat.value}</span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
              <Users size={16} className="text-teal-600 mr-1.5" />
              <span>{d("People Management", "Gestión de Personas")}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {d("Create real student and teacher portal accounts. Students are enrolled server-side; teachers receive assigned levels for live classes.", "Crea cuentas reales de estudiantes y profesores. Los estudiantes se inscriben desde el servidor; los profesores reciben niveles asignados para clases en vivo.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              {peopleStudents.length} {d("students", "estudiantes")}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
              {peopleTeachers.length} {d("teachers", "profesores")}
            </span>
          </div>
        </div>

        {peopleMessage && (
          <div className={`p-3 rounded-2xl text-xs font-semibold border ${
            peopleMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-100"
              : "bg-rose-50 text-rose-800 border-rose-100"
          }`}>
            {peopleMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form onSubmit={handleCreateStudentAccount} className="space-y-4">
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                {d("Add Student", "Añadir Estudiante")}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                {d("Creates login credentials, a student code, profile, and course enrollment.", "Crea credenciales, código de estudiante, perfil e inscripción al curso.")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder={d("Full name", "Nombre completo")}
                value={studentFullName}
                onChange={(e) => setStudentFullName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <input
                type="email"
                required
                placeholder={d("Email", "Correo electrónico")}
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <PasswordInput
                required
                placeholder={d("Temporary password", "Contraseña temporal")}
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <input
                type="text"
                placeholder={d("Phone optional", "Teléfono opcional")}
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <select
                value={studentLevel}
                onChange={(e) => setStudentLevel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-hidden"
              >
                <option value="A1">A1 Beginner</option>
                <option value="A2">A2 Elementary</option>
                <option value="B1">B1 Intermediate</option>
              </select>
              <select
                value={studentGroup}
                onChange={(e) => setStudentGroup(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-hidden"
              >
                <option value="Group 1">{d("Group 1", "Grupo 1")}</option>
                <option value="Group 2">{d("Group 2", "Grupo 2")}</option>
              </select>
              <select
                value={studentMode}
                onChange={(e) => setStudentMode(e.target.value)}
                className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-hidden"
              >
                <option value="Online">{d("Online", "En línea")}</option>
                <option value="In-person">{d("Face-to-face", "Presencial")}</option>
                <option value="Hybrid">{d("Hybrid", "Híbrido")}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creatingStudent}
              className="w-full inline-flex justify-center items-center py-2.5 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs transition cursor-pointer"
            >
              <Plus size={14} className="mr-1.5" />
              <span>{creatingStudent ? d("Creating student...", "Creando estudiante...") : d("Create Student Account", "Crear Cuenta de Estudiante")}</span>
            </button>
          </form>

          <form onSubmit={handleCreateTeacherAccount} className="space-y-4">
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                {d("Add Teacher / Professor", "Añadir Profesor")}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                {d("Creates a teacher login and connects the teacher to dashboard progress tracking.", "Crea acceso de profesor y lo conecta al seguimiento de progreso del panel.")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder={d("Full name", "Nombre completo")}
                value={teacherFullName}
                onChange={(e) => setTeacherFullName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <input
                type="email"
                required
                placeholder={d("Email", "Correo electrónico")}
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <PasswordInput
                required
                placeholder={d("Temporary password", "Contraseña temporal")}
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <input
                type="text"
                required
                placeholder="A1,A2"
                value={teacherLevels}
                onChange={(e) => setTeacherLevels(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={creatingTeacher}
              className="w-full inline-flex justify-center items-center py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs transition cursor-pointer"
            >
              <Plus size={14} className="mr-1.5" />
              <span>{creatingTeacher ? d("Creating teacher...", "Creando profesor...") : d("Create Teacher Account", "Crear Cuenta de Profesor")}</span>
            </button>

            <div className="max-h-[138px] overflow-y-auto border border-slate-100 rounded-2xl">
              {peopleTeachers.slice(0, 6).map((teacher) => (
                <div key={`${teacher.source}-${teacher.email}`} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0">
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate">{teacher.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">{teacher.email}</span>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    teacher.source === "database" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {teacher.source === "database" ? d("Portal", "Portal") : d("Template", "Plantilla")}
                  </span>
                </div>
              ))}
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">
              {d("Tutor Progress & Attendance", "Progreso y Asistencia de Tutores")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {d("Missed scheduled classes are automatically marked absent and counted as 0 teaching hours.", "Las clases programadas no impartidas se marcan automáticamente como ausencia y cuentan como 0 horas.")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">{totalTeacherHours}h</span>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
              {totalTeacherAbsences} {d("absent", "ausente")}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-3">{d("Tutor", "Tutor")}</th>
                <th className="p-3">{d("Levels", "Niveles")}</th>
                <th className="p-3 text-center">{d("Hours", "Horas")}</th>
                <th className="p-3 text-center">{d("Classes Given", "Clases Dadas")}</th>
                <th className="p-3 text-center">{d("Late", "Tarde")}</th>
                <th className="p-3 text-center">{d("Absent", "Ausente")}</th>
                <th className="p-3 text-right">{d("Attendance", "Asistencia")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teacherProgress.map((teacher) => (
                <tr key={teacher.teacher_id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <span className="font-bold text-slate-800 block">{teacher.teacher_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{teacher.email}</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-sm font-mono text-[9px] font-bold text-slate-500">
                      {(teacher.assigned_levels || []).join(", ") || "A1"}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-teal-700">{teacher.total_hours || 0}h</td>
                  <td className="p-3 text-center font-mono text-slate-650">{teacher.classes_given || 0}</td>
                  <td className="p-3 text-center font-mono text-amber-600">{teacher.attendance?.late || 0}</td>
                  <td className="p-3 text-center font-mono text-rose-600">{teacher.attendance?.absent || 0}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-700">{teacher.attendance?.rate ?? 100}%</td>
                </tr>
              ))}
              {teacherProgress.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400 text-xs" colSpan={7}>
                    {d("No tutor session data available yet.", "Aún no hay datos de sesiones de tutores.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Chart Telemetry + Image slots editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Stats Charts Recharts */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">
              {d("Tutor Attendance and Completed Classes", "Asistencia de Tutores y Clases Completadas")}
            </h3>
          </div>

          {tutorTelemetryChartData.length === 0 ? (
            <div className="h-[230px] flex items-center justify-center text-xs text-slate-400 font-semibold text-center px-6">
              {d("No tutor activity recorded yet.", "Aún no hay actividad de tutores registrada.")}
            </div>
          ) : (
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tutorTelemetryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="attendanceRate" fill="#2dd4bf" fillOpacity={0.1} stroke="#14b8a6" strokeWidth={2} name={d("Attendance Rate %", "Tasa de Asistencia %")} />
                  <Bar dataKey="completed" fill="#f97316" radius={[4, 4, 0, 0]} name={d("Completed Classes", "Clases Completadas")} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Dynamic Image Slots Swapper Console */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
              <ImageIcon size={16} className="text-orange-500 mr-1.5" />
              <span>{d("Override Website Images", "Anular Imágenes de la Web")}</span>
            </h3>
          </div>

          <form onSubmit={handleSaveImageSwap} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">{d("Target Visual Slot", "Espacio Visual de Destino")}</label>
              <select
                value={replaceTargetSlot}
                onChange={(e) => setReplaceTargetSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden text-slate-700 font-bold"
              >
                {websiteImageSlots.map(s => (
                  <option key={s.slot} value={s.slot}>{s.slot}</option>
                ))}
              </select>
            </div>

            {/* Simulated Drag / Click image frame */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDropImageFile}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer relative overflow-hidden transition ${
                replaceImageFile ? "border-emerald-400 bg-emerald-50/15" : dragging ? "border-orange-500 bg-orange-50/10" : "border-slate-300 bg-slate-50"
              }`}
            >
              <input
                type="file"
                id="admin-image-override"
                accept="image/*"
                className="hidden"
                onChange={handleManualImageFile}
              />
              <label htmlFor="admin-image-override" className="block cursor-pointer space-y-2">
                {replaceImageFile ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      {d("Image Loaded", "Imagen Cargada")}
                    </span>
                    <span className="block text-[11px] text-slate-600 truncate max-w-[200px] mx-auto">
                      {replaceImageTitle}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload size={16} className="text-slate-400 mx-auto" />
                    <span className="text-[11px] text-slate-700 block font-bold">{d("Upload replacement photo", "Subir foto de reemplazo")}</span>
                  </div>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!replaceImageFile}
              className={`w-full py-2.5 rounded-xl font-bold font-sans text-xs tracking-wide transition cursor-pointer flex justify-center items-center ${
                replaceImageFile ? "bg-orange-600 hover:bg-orange-500 text-white shadow-xs" : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Check size={14} className="mr-1.5" />
              <span>{d("Deploy replacement image", "Desplegar imagen de reemplazo")}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Blog & News editor section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Publish Blog post form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
              <BookOpen size={16} className="text-orange-500 mr-1.5" />
              <span>{d("Compose New Blog Article / News", "Redactar Nuevo Artículo de Blog / Noticias")}</span>
            </h3>
          </div>

          <form onSubmit={handlePublishBlog} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{d("Article Title", "Título del Artículo")}</label>
              <input
                type="text"
                placeholder={d("e.g. 5 Common Preposition Hurdles", "ej. 5 Obstáculos Comunes de las Preposiciones")}
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{d("Category Segment", "Segmento de Categoría")}</label>
              <select
                value={blogCategory}
                onChange={(e) => setBlogCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-hidden font-bold"
              >
                <option value="Grammar">{d("Grammar / Conjugation", "Gramática / Conjugación")}</option>
                <option value="Vocabulary">{d("Vocabulary Drilling", "Práctica de Vocabulario")}</option>
                <option value="Culture">{d("Spain Culture & Accent", "Cultura y Acento de España")}</option>
                <option value="School News">{d("Academy Core News", "Noticias de la Academia")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{d("Featured Image Link (Optional)", "Enlace de Imagen Destacada (Opcional)")}</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/photo-..."
                value={blogImage}
                onChange={(e) => setBlogImage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{d("Excerpt summary", "Resumen del extracto")}</label>
              <input
                type="text"
                placeholder={d("Write a brief scannable preview describing the hook of this article...", "Escribe un breve resumen descriptivo que sirva de gancho para este artículo...")}
                value={blogExcerpt}
                onChange={(e) => setBlogExcerpt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{d("Full Article Body text (Markdown Supported)", "Texto Completo del Artículo (Soporta Markdown)")}</label>
              <textarea
                placeholder={d("Write the full post here. You can use markdown styling for subtitles, lists, bold notes, etc.", "Escribe la publicación completa aquí. Puedes usar formato markdown para subtítulos, listas, notas en negrita, etc.")}
                value={blogContent}
                onChange={(e) => setBlogContent(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold font-sans text-xs tracking-wide transition shadow-md shadow-orange-600/10 hover:shadow-lg focus:outline-hidden cursor-pointer"
              >
                <Plus size={14} className="mr-1.5" />
                <span>{d("Publish to Public Landing Page Feed", "Publicar en el Canal de la Página de Inicio Pública")}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Existing public blog list list  */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">
              {d("Manage Existing Articles", "Administrar Artículos Existentes")}
            </h3>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {blogPosts.map(bp => (
              <div key={bp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <div className="truncate pr-4 space-y-0.5">
                  <span className="text-[9px] font-semibold text-slate-400">{bp.date} • {bp.category}</span>
                  <h4 className="font-bold text-slate-800 truncate leading-tight pr-5">{bp.title}</h4>
                </div>

                <button
                  onClick={() => onDeleteBlogPost(bp.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                  title={d("Delete post", "Eliminar publicación")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Students' Google Workspace accounts */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mt-6">
        <div className="pb-3 border-b border-slate-100 mb-4 flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">{d("Student Google Accounts", "Cuentas de Google de Estudiantes")}</h3>
          {googleStatus?.enabled && googleStatus.missing_settings.length === 0 && (
            <span className="text-[10px] font-bold text-slate-500">
              {d(
                `${googleStatus.students.length - googleMissingCount} of ${googleStatus.students.length} active students have an @${googleStatus.domain} account`,
                `${googleStatus.students.length - googleMissingCount} de ${googleStatus.students.length} estudiantes activos tienen cuenta @${googleStatus.domain}`
              )}
            </span>
          )}
        </div>

        <div className="space-y-3 text-xs">
          {googleError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 font-semibold">{googleError}</p>}

          {googleStatus && !googleStatus.enabled && (
            <p className="text-slate-600">
              {d(
                "Creating Google accounts is switched off. Set GOOGLE_PROVISION_STUDENTS=true on Vercel once the Google for Nonprofits plan is active, because every account is a Workspace licence.",
                "La creación de cuentas de Google está desactivada. Activa GOOGLE_PROVISION_STUDENTS=true en Vercel cuando el plan de Google para Organizaciones sin Fines de Lucro esté activo, porque cada cuenta es una licencia de Workspace."
              )}
            </p>
          )}

          {googleStatus?.enabled && googleStatus.missing_settings.length > 0 && (
            <p className="text-slate-600">
              {d("Google Workspace is not fully configured. Missing on Vercel: ", "Google Workspace no está configurado del todo. Falta en Vercel: ")}
              <span className="font-mono font-bold">{googleStatus.missing_settings.join(", ")}</span>
            </p>
          )}

          {googleStatus?.enabled && googleStatus.missing_settings.length === 0 && (
            <>
              <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left">
                  <tbody>
                    {googleStatus.students.map((s) => (
                      <tr key={s.student_id_code} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-1.5 font-semibold text-slate-800">{s.full_name}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-400">{s.student_id_code}</td>
                        <td className="px-3 py-1.5 font-mono">
                          {s.workspace_email ? <span className="text-emerald-700">{s.workspace_email}</span> : <span className="text-amber-700">{d("No account yet", "Sin cuenta aún")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={handleCreateGoogleAccounts}
                disabled={googleBusy || googleMissingCount === 0}
                className="py-2 px-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-100 disabled:text-slate-400 transition cursor-pointer"
              >
                {googleBusy
                  ? d(`Creating... (${googleCreated.length} done)`, `Creando... (${googleCreated.length} listas)`)
                  : d(`Create missing accounts (${googleMissingCount})`, `Crear cuentas faltantes (${googleMissingCount})`)}
              </button>
            </>
          )}

          {googleCreated.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">
                {d(
                  "Temporary passwords are shown only now. Download them and give each student their own; they must choose a new password at first sign-in.",
                  "Las contraseñas temporales solo se muestran ahora. Descárgalas y entrega a cada estudiante la suya; deberán elegir una nueva al iniciar sesión por primera vez."
                )}
              </p>
              <button type="button" onClick={downloadGoogleAccountsCsv} className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition cursor-pointer">
                {d("Download CSV", "Descargar CSV")}
              </button>
              <table className="w-full text-left">
                <tbody>
                  {googleCreated.map((a) => (
                    <tr key={a.student_id_code} className="border-b border-amber-100 last:border-0">
                      <td className="py-1 pr-3 text-slate-800">{a.full_name}</td>
                      <td className="py-1 pr-3 font-mono text-slate-700">{a.email}</td>
                      <td className="py-1 font-mono text-slate-900">{a.temporary_password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {googleFailed.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1">
              <p className="font-semibold text-rose-800">{d("These accounts could not be created:", "No se pudieron crear estas cuentas:")}</p>
              {googleFailed.map((f) => (
                <p key={f.student_id_code} className="text-rose-700">{f.full_name} ({f.student_id_code}): {f.detail}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Migration panel - admin-only: import portal_students JSON and POST to backend */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mt-6">
        <div className="pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">{d("Migrate Local Students (admin)", "Migrar Estudiantes Locales (admin)")}</h3>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-600">{d("Upload an exported `portal_students` JSON file from the frontend localStorage to create User + StudentProfile records in the database.", "Sube un archivo JSON exportado `portal_students` desde localStorage del frontend para crear registros de User + StudentProfile en la base de datos.")}</p>

          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              setMigrationResult(null);
              const f = e.target.files?.[0] || null;
              setMigrationFile(f);
              if (!f) {
                setMigrationPreviewCount(null);
                return;
              }
              try {
                const txt = await f.text();
                const parsed = JSON.parse(txt);
                setMigrationPreviewCount(Array.isArray(parsed) ? parsed.length : 1);
              } catch (err) {
                setMigrationPreviewCount(null);
              }
            }}
          />

          <div className="flex items-center space-x-3">
            <button
              disabled={!migrationFile || migrating}
              onClick={async () => {
                if (!migrationFile) return;
                setMigrating(true);
                setMigrationResult(null);
                try {
                  const txt = await migrationFile.text();
                  const payload = JSON.parse(txt);
                  const res = await fetch('/api/migrate-students', {
                    method: 'POST',
                    headers: adminJsonHeaders,
                    credentials: 'include',
                    body: JSON.stringify(payload)
                  });
                  const data = await res.json().catch(() => ({}));
                  setMigrationResult({ status: res.status, data });
                } catch (err) {
                  setMigrationResult({ error: String(err) });
                } finally {
                  setMigrating(false);
                }
              }}
              className={`py-2 px-3 rounded-xl font-bold text-sm ${migrationFile ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              {migrating ? d('Migrating...', 'Migrando...') : d('Run Migration', 'Ejecutar Migración')}
            </button>

            <div className="text-xs text-slate-500">
              {migrationPreviewCount !== null ? `${migrationPreviewCount} ${d('records selected', 'registros seleccionados')}` : d('No file selected', 'Ningún archivo seleccionado')}
            </div>
          </div>

          {migrationResult && (
            <pre className="mt-3 p-3 bg-slate-50 border rounded text-xs text-slate-700 overflow-auto">{JSON.stringify(migrationResult, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
