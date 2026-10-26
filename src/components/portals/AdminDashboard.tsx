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
  LogOut,
  Star,
  X,
  MessageSquare,
  Download
} from "lucide-react";
import { shrinkPhoto } from "../../shrinkPhoto";
import CertificateButton from "./CertificateButton";
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
import PasswordInput from "../PasswordInput";
import { groupOptionsForLevel, CLASS_GROUPS, classGroupLabel } from "../../groups";

interface AdminDashboardProps {
  onExit: () => void;
  adminProfile?: any;
  blogPosts: any[];
  onAddBlogPost: (post: any) => void;
  onDeleteBlogPost: (post: any) => void;
  hiddenBuiltinPosts: any[];
  onRestoreBlogPost: (id: string) => void;
  blogActionError?: string;
  onUpdateImage: (slot: string, path: string | null) => void;
  imageOverrides: Record<string, string>;
  lang?: "EN" | "ES";
}

export default function AdminDashboard({
  onExit,
  adminProfile,
  blogPosts,
  onAddBlogPost,
  onDeleteBlogPost,
  hiddenBuiltinPosts,
  onRestoreBlogPost,
  blogActionError,
  onUpdateImage,
  imageOverrides,
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
  const [blogImageFile, setBlogImageFile] = useState<File | null>(null);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogStatus, setBlogStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Target image replacement state
  const [replaceTargetSlot, setReplaceTargetSlot] = useState("Hero Banner");
  const [replaceImageFile, setReplaceImageFile] = useState<File | null>(null);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageStatus, setImageStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [replaceImageTitle, setReplaceImageTitle] = useState("");
  const [replaceAltText, setReplaceAltText] = useState("");
  const [dragging, setDragging] = useState(false);


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

  // Each group's welcome letter: course dates and weekly class times.
  type LetterSession = { time: string; day: string; session: string };
  type Letter = { level: string; group_number: number; course_dates: string; duration_weeks: number; sessions: LetterSession[] };
  const [letters, setLetters] = useState<Letter[]>([]);
  const [letterGroupCode, setLetterGroupCode] = useState(CLASS_GROUPS[0]?.code || "");
  const [letterForm, setLetterForm] = useState<{ course_dates: string; duration_weeks: number; sessions: LetterSession[] }>({ course_dates: "", duration_weeks: 6, sessions: [] });
  const [letterSaving, setLetterSaving] = useState(false);
  const [letterStatus, setLetterStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const letterGroup = CLASS_GROUPS.find((g) => g.code === letterGroupCode) || CLASS_GROUPS[0];

  useEffect(() => {
    fetch("/api/admin/welcome-letters")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setLetters(Array.isArray(data) ? data : []))
      .catch(() => setLetterStatus({ type: "error", text: d("The welcome letters could not be loaded.", "No se pudieron cargar las cartas de bienvenida.") }));
  }, []);

  // Fill the form with the chosen group's saved letter (or a blank one).
  useEffect(() => {
    if (!letterGroup) return;
    const saved = letters.find((l) => l.level === letterGroup.level && l.group_number === letterGroup.group);
    setLetterForm(saved
      ? { course_dates: saved.course_dates, duration_weeks: saved.duration_weeks, sessions: saved.sessions.map((x) => ({ ...x })) }
      : { course_dates: "", duration_weeks: 6, sessions: [{ time: "", day: "", session: "" }] });
  }, [letterGroupCode, letters]);

  const updateLetterSession = (index: number, field: keyof LetterSession, value: string) => {
    setLetterForm((form) => ({ ...form, sessions: form.sessions.map((x, i) => (i === index ? { ...x, [field]: value } : x)) }));
  };

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterGroup || letterSaving) return;
    const sessions = letterForm.sessions.filter((x) => x.time.trim() && x.day.trim() && x.session.trim());
    if (!letterForm.course_dates.trim() || sessions.length === 0) {
      setLetterStatus({ type: "error", text: d("Add the course dates and at least one complete class time.", "Añade las fechas del curso y al menos un horario de clase completo.") });
      return;
    }
    setLetterSaving(true);
    setLetterStatus(null);
    const response = await fetch(`/api/admin/welcome-letters/${letterGroup.level}/${letterGroup.group}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_dates: letterForm.course_dates.trim(), duration_weeks: Number(letterForm.duration_weeks) || 1, sessions })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setLetterSaving(false);
    if (!response?.ok) {
      setLetterStatus({ type: "error", text: (typeof payload?.detail === "string" && payload.detail) || d("The letter could not be saved. Check the fields and try again.", "No se pudo guardar la carta. Revisa los campos e inténtalo de nuevo.") });
      return;
    }
    setLetters((list) => [...list.filter((l) => !(l.level === payload.level && l.group_number === payload.group_number)), payload]);
    setLetterStatus({ type: "success", text: d("Saved. Students in this group now see the new dates and times.", "Guardado. Los estudiantes de este grupo ya ven las nuevas fechas y horarios.") });
  };

  // The website chat answers only from this question-and-answer list.
  type Faq = { id: number; question: string; answer: string; language: "en" | "es"; keywords: string };
  const emptyFaq = { question: "", answer: "", keywords: "" };
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqLang, setFaqLang] = useState<"en" | "es">(lang === "ES" ? "es" : "en");
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [faqEditingId, setFaqEditingId] = useState<number | null>(null);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/faqs")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setFaqs(Array.isArray(data) ? data : []))
      .catch(() => setFaqError(d("The chatbot answers could not be loaded.", "No se pudieron cargar las respuestas del chatbot.")));
  }, []);

  const resetFaqForm = () => {
    setFaqForm(emptyFaq);
    setFaqEditingId(null);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim() || faqSaving) return;
    setFaqSaving(true);
    setFaqError(null);
    const response = await fetch(faqEditingId ? `/api/admin/faqs/${faqEditingId}` : "/api/admin/faqs", {
      method: faqEditingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...faqForm, language: faqLang })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setFaqSaving(false);
    if (!response?.ok) {
      setFaqError((typeof payload?.detail === "string" && payload.detail) || d("That answer could not be saved. Check the fields and try again.", "No se pudo guardar esa respuesta. Revisa los campos e inténtalo de nuevo."));
      return;
    }
    setFaqs((list) => (faqEditingId ? list.map((faq) => (faq.id === faqEditingId ? payload : faq)) : [...list, payload]));
    resetFaqForm();
  };

  const handleEditFaq = (faq: Faq) => {
    setFaqEditingId(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer, keywords: faq.keywords || "" });
    setFaqError(null);
  };

  const handleDeleteFaq = async (faq: Faq) => {
    if (!window.confirm(d(`Delete "${faq.question}" from the chatbot?`, `¿Eliminar "${faq.question}" del chatbot?`))) return;
    const response = await fetch(`/api/admin/faqs/${faq.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok && response?.status !== 404) {
      setFaqError(d("That answer could not be deleted.", "No se pudo eliminar esa respuesta."));
      return;
    }
    setFaqs((list) => list.filter((item) => item.id !== faq.id));
    if (faqEditingId === faq.id) resetFaqForm();
  };

  // Reviews visitors leave on the website wait here until approved.
  const [reviews, setReviews] = useState<Array<{ id: number; name: string; location?: string | null; rating: number; text: string; status: "pending" | "approved" | "rejected"; created_at?: string }>>([]);
  const [reviewFilter, setReviewFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadReviews = () => {
    fetch("/api/admin/reviews")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviewError(d("Reviews could not be loaded.", "No se pudieron cargar las reseñas.")));
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleReviewStatus = async (id: number, status: "approved" | "rejected" | "pending") => {
    setReviewError(null);
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    }).catch(() => null);
    if (!response?.ok) {
      setReviewError(d("That review could not be updated.", "No se pudo actualizar esa reseña."));
      return;
    }
    const updated = await response.json();
    setReviews((list) => list.map((review) => (review.id === id ? updated : review)));
  };

  const handleDeleteReview = async (id: number) => {
    if (!window.confirm(d("Delete this review permanently?", "¿Eliminar esta reseña para siempre?"))) return;
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setReviewError(d("That review could not be deleted.", "No se pudo eliminar esa reseña."));
      return;
    }
    setReviews((list) => list.filter((review) => review.id !== id));
  };

  const pendingReviewCount = reviews.filter((review) => review.status === "pending").length;
  const filteredReviews = reviews.filter((review) => review.status === reviewFilter);

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
  // Set when the server can't be reached; the page then says so instead of
  // showing old or made-up lists.
  const [peopleLoadError, setPeopleLoadError] = useState(false);

  // Students table: search, filter by group, edit, move, (de)activate.
  const [studentSearch, setStudentSearch] = useState("");
  const [studentGroupFilter, setStudentGroupFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentTableMessage, setStudentTableMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  // Give a student or tutor who forgot their password a new temporary one.
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ type: "success" | "error"; text: string; password?: string } | null>(null);

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmail.trim();
    if (!email || resetting) return;
    if (!window.confirm(d(`Give ${email} a new temporary password? Their current password will stop working.`, `¿Dar a ${email} una nueva contraseña temporal? Su contraseña actual dejará de funcionar.`))) return;
    setResetting(true);
    setResetResult(null);
    const response = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setResetting(false);
    if (!response?.ok) {
      setResetResult({ type: "error", text: (typeof payload?.detail === "string" && payload.detail) || d("The password could not be reset. Try again.", "No se pudo restablecer la contraseña. Inténtalo de nuevo.") });
      return;
    }
    setResetResult({
      type: "success",
      text: d(`New temporary password for ${payload.full_name || payload.email}. Send it to them privately (for example on WhatsApp):`, `Nueva contraseña temporal para ${payload.full_name || payload.email}. Envíasela en privado (por ejemplo por WhatsApp):`),
      password: payload.temporary_password
    });
    setResetEmail("");
  };

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
      .catch(() => setPeopleLoadError(true));
  }, []);

  // Active students, new sign-ups and attendance per group, from the server.
  const [overview, setOverview] = useState<any | null>(null);
  const loadOverview = () => {
    fetch("/api/admin/overview", { headers: adminHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOverview(data))
      .catch(() => setOverview(null));
  };

  const loadPeople = () => {
    loadOverview();
    fetch("/api/admin/students", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`students ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPeopleStudents(Array.isArray(data) ? data : []);
        setPeopleLoadError(false);
      })
      .catch(() => setPeopleLoadError(true));

    fetch("/api/admin/teachers", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`teachers ${res.status}`);
        return res.json();
      })
      .then((data) => setPeopleTeachers(Array.isArray(data) ? data : []))
      .catch(() => setPeopleLoadError(true));
  };

  const loadTeacherProgress = () => {
    fetch("/api/admin/teacher-progress", { headers: adminHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`teacher-progress ${res.status}`);
        return res.json();
      })
      .then((data) => setTeacherProgress(Array.isArray(data) ? data : []))
      .catch(() => setPeopleLoadError(true));
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const studentGroupKey = (student: any) => {
    const level = String(student.course_level || "").match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase() || "?";
    const group = String(student.class_group || "").match(/(\d+)/)?.[1] || "1";
    return `${level}G${group}`;
  };
  const studentGroupName = (student: any) => {
    const match = CLASS_GROUPS.find((g) => g.code === studentGroupKey(student));
    return match ? `${match.level} ${d("Group", "Grupo")} ${match.group} – ${classGroupLabel(match)}` : `${student.course_level} ${student.class_group}`;
  };
  const visibleStudents = peopleStudents.filter((student) => {
    if (!showInactive && student.active === false) return false;
    if (studentGroupFilter !== "all" && studentGroupKey(student) !== studentGroupFilter) return false;
    const query = studentSearch.trim().toLowerCase();
    if (!query) return true;
    return [student.full_name, student.email, student.student_id_code, student.phone_number]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
  const inactiveCount = peopleStudents.filter((student) => student.active === false).length;

  // Opens in Excel or Google Sheets. Downloads the list as currently filtered.
  const downloadStudentsCsv = () => {
    const cell = (value: unknown) => {
      let text = String(value ?? "");
      // Stop spreadsheet apps from treating a value as a formula.
      if (/^[=@]/.test(text) || /^[+-][^\d\s]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const header = ["Name", "Student code", "Email", "Phone", "Level", "Group", "School", "Status", "Registered"];
    const rows = visibleStudents.map((student) => {
      const group = CLASS_GROUPS.find((g) => g.code === studentGroupKey(student));
      return [
        student.full_name,
        student.student_id_code,
        student.email,
        student.phone_number,
        student.course_level,
        student.class_group,
        group ? classGroupLabel(group) : "",
        student.active === false ? "Inactive" : (student.status || "Active"),
        student.registration_date ? String(student.registration_date).slice(0, 10) : "",
      ].map(cell).join(",");
    });
    const csv = "\ufeff" + [header.map(cell).join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveStudent = async (code: string, changes: Record<string, any>, successText: string) => {
    setStudentSaving(true);
    setStudentTableMessage(null);
    const response = await fetch(`/api/admin/students/${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: adminJsonHeaders,
      body: JSON.stringify(changes)
    }).catch(() => null);
    const payload = response ? await readApiPayload(response) : null;
    setStudentSaving(false);
    if (!response?.ok) {
      setStudentTableMessage({ type: "error", text: apiErrorMessage(payload, d("The change could not be saved. Try again.", "No se pudo guardar el cambio. Inténtalo de nuevo."), response?.status || 0) });
      return false;
    }
    setPeopleStudents((list) => list.map((student) => (student.student_id_code === code ? payload : student)));
    loadOverview();
    setStudentTableMessage({ type: "success", text: successText });
    return true;
  };

  const handleSaveEditedStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || studentSaving) return;
    const saved = await saveStudent(editingStudent.student_id_code, {
      full_name: editingStudent.full_name.trim(),
      phone_number: editingStudent.phone_number || "",
      course_level: editingStudent.course_level,
      class_group: editingStudent.class_group
    }, d(`Saved ${editingStudent.full_name}.`, `Guardado ${editingStudent.full_name}.`));
    if (saved) setEditingStudent(null);
  };

  const handleToggleStudentActive = async (student: any) => {
    const deactivate = student.active !== false;
    const question = deactivate
      ? d(`Deactivate ${student.full_name}? They won't be able to sign in and will leave their group's lists. Their grades and work are kept, and you can reactivate them later.`, `¿Desactivar a ${student.full_name}? No podrá iniciar sesión y saldrá de las listas de su grupo. Sus notas y trabajos se conservan y puedes reactivarlo más tarde.`)
      : d(`Reactivate ${student.full_name}? They can sign in again.`, `¿Reactivar a ${student.full_name}? Podrá iniciar sesión de nuevo.`);
    if (!window.confirm(question)) return;
    await saveStudent(student.student_id_code, { active: !deactivate }, deactivate
      ? d(`${student.full_name} is now inactive.`, `${student.full_name} ahora está inactivo.`)
      : d(`${student.full_name} is active again.`, `${student.full_name} está activo de nuevo.`));
  };

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

      const payload = await readApiPayload(response);
      if (!response.ok) {
        if (response.status === 400 && isDuplicateAccountError(payload)) {
          throw new Error(
            d(
              "An account with this email already exists. To give them a new password, use Reset a Password below.",
              "Ya existe una cuenta con este correo. Para darle una nueva contraseña, usa Restablecer una Contraseña más abajo."
            )
          );
        }
        throw new Error(apiErrorMessage(payload, "Unable to create student account.", response.status));
      }

      const emailNote = payload.welcome_email_sent === true
        ? d(` Welcome email with their login details sent to ${studentPayload.email}.`, ` Correo de bienvenida con sus datos de acceso enviado a ${studentPayload.email}.`)
        : payload.welcome_email_sent === false
          ? d(" The welcome email could not be sent, so give them their login details yourself.", " No se pudo enviar el correo de bienvenida; dale tú sus datos de acceso.")
          : "";
      setPeopleMessage({
        type: "success",
        text: d(
          `Student created. ID: ${payload.student_id_code}.`,
          `Estudiante creado. ID: ${payload.student_id_code}.`
        ) + emailNote
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
      const payload = await readApiPayload(response);
      if (!response.ok) {
        if (response.status === 400 && isDuplicateAccountError(payload)) {
          throw new Error(
            d(
              "An account with this email already exists. To give them a new password, use Reset a Password below.",
              "Ya existe una cuenta con este correo. Para darle una nueva contraseña, usa Restablecer una Contraseña más abajo."
            )
          );
        }
        throw new Error(apiErrorMessage(payload, "Unable to create teacher account.", response.status));
      }

      setPeopleMessage({
        type: "success",
        text: d(
          `Teacher created. ID: ${payload.teacher_id_code}`,
          `Profesor creado. ID: ${payload.teacher_id_code}`
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
    { title: d("Active students", "Estudiantes activos"), value: `${overview?.totals?.active_students ?? peopleStudents.length - inactiveCount}`, icon: Users, change: d(`+${overview?.totals?.new_this_month ?? 0} new this month`, `+${overview?.totals?.new_this_month ?? 0} nuevos este mes`), color: "text-teal-600" },
    { title: d("Student attendance", "Asistencia de estudiantes"), value: overview?.totals?.attendance_rate == null ? "—" : `${overview.totals.attendance_rate}%`, icon: Award, change: d("Present or late, in recorded classes", "Presente o tarde, en clases registradas"), color: "text-emerald-600" },
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
    { slot: "Hero Banner", key: "hero", description: d("Main illustration showing study classrooms overlaying the hero section.", "Ilustración principal que muestra aulas de estudio superpuestas en la sección hero."), current: "/images/spanish_classroom_hero_1782078041463.webp" }
  ];

  // Publish an article: it is saved on the server and every visitor sees it.
  const handlePublishBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim() || !blogExcerpt.trim() || !blogContent.trim() || blogSaving) return;
    setBlogSaving(true);
    setBlogStatus(null);
    const fail = (message: string) => {
      setBlogSaving(false);
      setBlogStatus({ type: "error", message });
    };

    let imageUrl = blogImage.trim();
    if (blogImageFile) {
      const file = await shrinkPhoto(blogImageFile);
      if (file.size > 4 * 1024 * 1024) return fail(d("This photo is bigger than 4 MB. Try a smaller one.", "Esta foto supera los 4 MB. Prueba con una más pequeña."));
      const formData = new FormData();
      formData.append("category", "blog");
      formData.append("title", blogTitle.trim().slice(0, 255));
      formData.append("alt_text", blogTitle.trim().slice(0, 255));
      formData.append("file", file);
      const upload = await fetch("/api/images", { method: "POST", body: formData }).catch(() => null);
      const uploaded = await upload?.json().catch(() => null);
      if (!upload?.ok || !uploaded?.path) return fail((typeof uploaded?.detail === "string" && uploaded.detail) || d("The photo upload failed. Check your connection and try again.", "La subida de la foto falló. Revisa tu conexión e inténtalo de nuevo."));
      imageUrl = uploaded.path;
    }

    const response = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: blogTitle.trim(),
        category: blogCategory,
        excerpt: blogExcerpt.trim(),
        content_markdown: blogContent.trim(),
        featured_image_url: imageUrl || null
      })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (!response?.ok) {
      const detail = typeof payload?.detail === "string" ? payload.detail : null;
      return fail(detail || d("The article could not be published. Check every field and try again.", "No se pudo publicar el artículo. Revisa todos los campos e inténtalo de nuevo."));
    }

    onAddBlogPost(payload);
    setBlogSaving(false);
    setBlogStatus({ type: "success", message: d("Published. The article is now on the website's blog.", "Publicado. El artículo ya está en el blog de la web.") });
    setBlogTitle("");
    setBlogExcerpt("");
    setBlogContent("");
    setBlogImage("");
    setBlogImageFile(null);
  };

  const pickReplacementImage = (file: File | undefined) => {
    if (!file) return;
    setImageStatus(null);
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setImageStatus({ type: "error", message: d("Use a JPG, PNG or WebP photo.", "Usa una foto JPG, PNG o WebP.") });
      return;
    }
    setReplaceImageFile(file);
    setReplaceImageTitle(file.name);
    setReplaceAltText(`Iniciativa Ser o Estar Academy - ${replaceTargetSlot}`);
  };

  const handleDropImageFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickReplacementImage(e.dataTransfer.files?.[0]);
  };

  const handleManualImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickReplacementImage(e.target.files?.[0]);
    e.target.value = "";
  };

  const selectedImageSlot = websiteImageSlots.find((s) => s.slot === replaceTargetSlot) || websiteImageSlots[0];

  // Upload the photo; it replaces the slot's picture for every visitor.
  const handleSaveImageSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceImageFile || imageSaving) return;
    setImageSaving(true);
    setImageStatus(null);
    const file = await shrinkPhoto(replaceImageFile, 2400);
    if (file.size > 4 * 1024 * 1024) {
      setImageSaving(false);
      setImageStatus({ type: "error", message: d("This photo is bigger than 4 MB. Try a smaller one.", "Esta foto supera los 4 MB. Prueba con una más pequeña.") });
      return;
    }
    const formData = new FormData();
    formData.append("category", selectedImageSlot.key);
    formData.append("title", replaceImageTitle || file.name);
    formData.append("alt_text", replaceAltText);
    formData.append("file", file);
    const response = await fetch("/api/images", { method: "POST", body: formData }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setImageSaving(false);
    if (!response?.ok || !payload?.path) {
      setImageStatus({ type: "error", message: (typeof payload?.detail === "string" && payload.detail) || d("The upload failed. Check your connection and try again.", "La subida falló. Revisa tu conexión e inténtalo de nuevo.") });
      return;
    }
    onUpdateImage(selectedImageSlot.slot, payload.path);
    setImageStatus({ type: "success", message: d("Saved. The new photo is now on the website.", "Guardado. La nueva foto ya está en la web.") });
    setReplaceImageFile(null);
    setReplaceImageTitle("");
    setReplaceAltText("");
  };

  const handleResetImage = async () => {
    if (!window.confirm(d("Go back to the original photo?", "¿Volver a la foto original?"))) return;
    setImageStatus(null);
    const response = await fetch(`/api/site-images/${selectedImageSlot.key}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setImageStatus({ type: "error", message: d("Could not reset the photo. Try again.", "No se pudo restablecer la foto. Inténtalo de nuevo.") });
      return;
    }
    onUpdateImage(selectedImageSlot.slot, null);
    setImageStatus({ type: "success", message: d("The original photo is back on the website.", "La foto original ha vuelto a la web.") });
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

      {/* Students by group */}
      {overview?.groups?.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4" id="admin-group-overview">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider">{d("Students by group", "Estudiantes por grupo")}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {d("Active students only. Attendance counts present or late, out of the classes where attendance was recorded.", "Solo estudiantes activos. La asistencia cuenta presente o tarde, sobre las clases con asistencia registrada.")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {overview.groups.map((g: any) => {
              const known = CLASS_GROUPS.find((c) => c.level === g.course_level && `Group ${c.group}` === g.class_group);
              const rate = g.attendance_rate;
              return (
                <div key={`${g.course_level}-${g.class_group}`} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div>
                    <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{g.course_level} · {g.class_group.replace("Group", d("Group", "Grupo"))}</div>
                    <div className="text-xs font-bold text-slate-800 leading-snug">{known ? classGroupLabel(known) : "—"}</div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-2xl font-black text-slate-900 leading-none">{g.active_students}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{d("students", "estudiantes")}{g.new_this_month > 0 && <span className="text-emerald-600"> · +{g.new_this_month} {d("this month", "este mes")}</span>}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${rate == null ? "text-slate-400" : rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-rose-600"}`}>{rate == null ? "—" : `${rate}%`}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{d("attendance", "asistencia")}</div>
                    </div>
                  </div>
                  {rate != null && (
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
                      <div className={`h-full ${rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${rate}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {peopleLoadError && (
          <div role="alert" className="p-3 rounded-2xl text-xs font-semibold border bg-amber-50 text-amber-800 border-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span>{d("Some people data could not be loaded from the server, so these numbers and lists may be incomplete.", "No se pudieron cargar algunos datos del servidor, así que estas cifras y listas pueden estar incompletas.")}</span>
            <button type="button" onClick={() => { loadPeople(); loadTeacherProgress(); }} className="px-3 py-1 rounded-lg bg-white border border-amber-300 font-bold cursor-pointer">
              {d("Try again", "Reintentar")}
            </button>
          </div>
        )}

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
                onChange={(e) => { setStudentLevel(e.target.value); setStudentGroup("Group 1"); }}
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
                {groupOptionsForLevel(studentLevel).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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

        <form onSubmit={handleAdminResetPassword} className="border-t border-slate-100 pt-4 space-y-3">
          <div>
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              {d("Reset a Password", "Restablecer una Contraseña")}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              {d("For a student or tutor who forgot their password. You get a new temporary password to send them.", "Para un estudiante o tutor que olvidó su contraseña. Recibirás una contraseña temporal para enviársela.")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <input
              type="email"
              required
              placeholder={d("Their login email", "Su correo de acceso")}
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={resetting || !resetEmail.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 transition cursor-pointer"
            >
              {resetting ? d("Resetting...", "Restableciendo...") : d("Reset password", "Restablecer contraseña")}
            </button>
          </div>
          {resetResult && (
            <div role={resetResult.type === "error" ? "alert" : "status"} className={`p-3 rounded-2xl text-xs font-semibold border max-w-xl ${resetResult.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-rose-50 text-rose-800 border-rose-100"}`}>
              <p>{resetResult.text}</p>
              {resetResult.password && (
                <p className="mt-2 font-mono text-base tracking-wider text-slate-900 select-all">{resetResult.password}</p>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Students table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4" id="admin-students-table">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center">
              <Users size={16} className="text-teal-600 mr-1.5" />
              <span>{d("Students", "Estudiantes")}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {d("Everyone enrolled. Edit details, move someone to another group, or deactivate a student who has left.", "Todos los inscritos. Edita datos, cambia a alguien de grupo o desactiva a un estudiante que se fue.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="search"
              placeholder={d("Search name, email, code...", "Buscar nombre, correo, código...")}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden w-full sm:w-56"
            />
            <select
              value={studentGroupFilter}
              onChange={(e) => setStudentGroupFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="all">{d("All groups", "Todos los grupos")}</option>
              {CLASS_GROUPS.map((g) => (
                <option key={g.code} value={g.code}>{`${g.level} ${d("Group", "Grupo")} ${g.group} – ${classGroupLabel(g)}`}</option>
              ))}
            </select>
            {inactiveCount > 0 && (
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                {d(`Show inactive (${inactiveCount})`, `Mostrar inactivos (${inactiveCount})`)}
              </label>
            )}
            <button
              type="button"
              onClick={downloadStudentsCsv}
              disabled={visibleStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold cursor-pointer"
            >
              <Download size={13} />
              {d(`Download list (${visibleStudents.length})`, `Descargar lista (${visibleStudents.length})`)}
            </button>
          </div>
        </div>

        {studentTableMessage && (
          <p role={studentTableMessage.type === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${studentTableMessage.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {studentTableMessage.text}
          </p>
        )}

        {editingStudent && (
          <form onSubmit={handleSaveEditedStudent} className="p-4 rounded-2xl border border-orange-200 bg-orange-50/40 space-y-3">
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              {d("Edit", "Editar")} {editingStudent.student_id_code}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                placeholder={d("Full name", "Nombre completo")}
                value={editingStudent.full_name}
                onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <input
                type="tel"
                maxLength={40}
                placeholder={d("Phone (optional)", "Teléfono (opcional)")}
                value={editingStudent.phone_number || ""}
                onChange={(e) => setEditingStudent({ ...editingStudent, phone_number: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              />
              <select
                value={editingStudent.course_level}
                onChange={(e) => setEditingStudent({ ...editingStudent, course_level: e.target.value, class_group: groupOptionsForLevel(e.target.value)[0].value })}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                {["A1", "A2", "B1"].map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
              <select
                value={editingStudent.class_group}
                onChange={(e) => setEditingStudent({ ...editingStudent, class_group: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                {!groupOptionsForLevel(editingStudent.course_level).some((o) => o.value === editingStudent.class_group) && (
                  <option value={editingStudent.class_group}>{editingStudent.class_group}</option>
                )}
                {groupOptionsForLevel(editingStudent.course_level).map((option) => (
                  <option key={option.value} value={option.value}>{`${option.value} – ${option.label}`}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={studentSaving} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-60 cursor-pointer">
                {studentSaving ? d("Saving...", "Guardando...") : d("Save changes", "Guardar cambios")}
              </button>
              <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer">
                {d("Cancel", "Cancelar")}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto max-h-[480px] overflow-y-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="px-3 py-2 font-bold">{d("Student", "Estudiante")}</th>
                <th className="px-3 py-2 font-bold">{d("Code", "Código")}</th>
                <th className="px-3 py-2 font-bold">{d("Group", "Grupo")}</th>
                <th className="px-3 py-2 font-bold">{d("Joined", "Se unió")}</th>
                <th className="px-3 py-2 font-bold text-right">{d("Actions", "Acciones")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    {peopleStudents.length === 0 ? d("No students yet.", "Aún no hay estudiantes.") : d("No students match.", "Ningún estudiante coincide.")}
                  </td>
                </tr>
              )}
              {visibleStudents.map((student) => (
                <tr key={student.student_id_code} className={`border-t border-slate-100 ${student.active === false ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2">
                    <span className="block font-bold text-slate-800">
                      {student.full_name}
                      {student.active === false && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold uppercase">{d("Inactive", "Inactivo")}</span>
                      )}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">{student.email}{student.phone_number ? ` · ${student.phone_number}` : ""}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{student.student_id_code}</td>
                  <td className="px-3 py-2 text-slate-600">{studentGroupName(student)}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {student.registration_date ? new Date(student.registration_date).toLocaleDateString(lang === "ES" ? "es-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => { setStudentTableMessage(null); setEditingStudent({ ...student, phone_number: student.phone_number || "" }); }}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-orange-600 hover:bg-orange-50 cursor-pointer"
                    >
                      {d("Edit", "Editar")}
                    </button>
                    <CertificateButton
                      student={student}
                      school={(() => { const g = CLASS_GROUPS.find((c) => c.code === studentGroupKey(student)); return g ? classGroupLabel(g) : undefined; })()}
                      lang={lang === "ES" ? "ES" : "EN"}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#0B4C9C] hover:bg-blue-50 cursor-pointer"
                    />
                    <button
                      type="button"
                      disabled={studentSaving}
                      onClick={() => handleToggleStudentActive(student)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${student.active === false ? "text-emerald-700 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50"}`}
                    >
                      {student.active === false ? d("Reactivate", "Reactivar") : d("Deactivate", "Desactivar")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400">
          {d(`Showing ${visibleStudents.length} of ${peopleStudents.length} students.`, `Mostrando ${visibleStudents.length} de ${peopleStudents.length} estudiantes.`)}
        </p>
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

            <div className="flex items-center gap-3">
              <img
                src={imageOverrides[selectedImageSlot.slot] || selectedImageSlot.current}
                alt=""
                className="w-20 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
              />
              <div className="text-[11px] text-slate-500 space-y-1 min-w-0">
                <span className="block font-bold text-slate-700">
                  {imageOverrides[selectedImageSlot.slot] ? d("Showing your uploaded photo", "Mostrando tu foto subida") : d("Showing the original photo", "Mostrando la foto original")}
                </span>
                {imageOverrides[selectedImageSlot.slot] && (
                  <button type="button" onClick={handleResetImage} className="text-orange-600 hover:text-orange-500 font-bold cursor-pointer">
                    {d("Go back to the original", "Volver a la original")}
                  </button>
                )}
              </div>
            </div>

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
                accept=".jpg,.jpeg,.png,.webp"
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
              disabled={!replaceImageFile || imageSaving}
              className={`w-full py-2.5 rounded-xl font-bold font-sans text-xs tracking-wide transition cursor-pointer flex justify-center items-center ${
                replaceImageFile && !imageSaving ? "bg-orange-600 hover:bg-orange-500 text-white shadow-xs" : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Check size={14} className="mr-1.5" />
              <span>{imageSaving ? d("Uploading...", "Subiendo...") : d("Put this photo on the website", "Poner esta foto en la web")}</span>
            </button>
            {imageStatus && (
              <p role={imageStatus.type === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${imageStatus.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {imageStatus.message}
              </p>
            )}
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
              <label className="text-[10px] font-bold text-slate-400 uppercase">{d("Cover Photo (Optional)", "Foto de Portada (Opcional)")}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setBlogImageFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold file:text-slate-700"
              />
              {!blogImageFile && (
                <input
                  type="url"
                  placeholder={d("...or paste a link: https://...", "...o pega un enlace: https://...")}
                  value={blogImage}
                  onChange={(e) => setBlogImage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                />
              )}
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
                disabled={blogSaving}
                className={`w-full inline-flex justify-center items-center py-2.5 text-white rounded-xl font-bold font-sans text-xs tracking-wide transition shadow-md shadow-orange-600/10 focus:outline-hidden ${blogSaving ? "bg-orange-400 cursor-wait" : "bg-orange-600 hover:bg-orange-500 hover:shadow-lg cursor-pointer"}`}
              >
                <Plus size={14} className="mr-1.5" />
                <span>{blogSaving ? d("Publishing...", "Publicando...") : d("Publish on the website's blog", "Publicar en el blog de la web")}</span>
              </button>
              {blogStatus && (
                <p role={blogStatus.type === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${blogStatus.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {blogStatus.message}
                </p>
              )}
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
                  <span className="text-[9px] font-semibold text-slate-400">{bp.serverId ? `${bp.date} • ${bp.category}` : `${d("Built-in", "Incluido")} • ${bp.category}`}</span>
                  <h4 className="font-bold text-slate-800 truncate leading-tight pr-5">{bp.title}</h4>
                </div>

                <button
                  onClick={() => onDeleteBlogPost(bp)}
                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                  title={d("Delete post", "Eliminar publicación")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {blogActionError && (
            <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{blogActionError}</p>
          )}

          {hiddenBuiltinPosts.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase">{d("Removed built-in articles", "Artículos incluidos eliminados")}</h4>
              {hiddenBuiltinPosts.map(bp => (
                <div key={bp.id} className="p-3 bg-white border border-dashed border-slate-200 rounded-xl flex justify-between items-center gap-2 text-xs">
                  <span className="truncate text-slate-500">{bp.title}</span>
                  <button
                    onClick={() => onRestoreBlogPost(bp.id)}
                    className="shrink-0 text-[11px] font-bold text-orange-600 hover:text-orange-500 cursor-pointer"
                  >
                    {d("Bring back", "Restaurar")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Website reviews: approve before they appear publicly */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mt-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Star size={14} className="text-orange-500" />
            {d("Website Reviews", "Reseñas de la Web")}
            {pendingReviewCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] normal-case tracking-normal">
                {d(`${pendingReviewCount} waiting`, `${pendingReviewCount} pendientes`)}
              </span>
            )}
          </h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl" role="tablist">
            {(["pending", "approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={reviewFilter === status}
                onClick={() => setReviewFilter(status)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${reviewFilter === status ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
              >
                {status === "pending" ? d("Waiting", "Pendientes") : status === "approved" ? d("Approved", "Aprobadas") : d("Rejected", "Rechazadas")}
              </button>
            ))}
          </div>
        </div>

        {reviewError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{reviewError}</p>
        )}

        {filteredReviews.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold">
            {reviewFilter === "pending"
              ? d("No reviews waiting for approval.", "No hay reseñas pendientes de aprobación.")
              : reviewFilter === "approved"
                ? d("No approved reviews yet.", "Aún no hay reseñas aprobadas.")
                : d("No rejected reviews.", "No hay reseñas rechazadas.")}
          </p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <span className="font-bold text-slate-900">{review.name}</span>
                    {review.location && <span className="text-slate-400"> · {review.location}</span>}
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {review.created_at ? new Date(review.created_at).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <span className="flex text-orange-400" aria-label={d(`${review.rating} out of 5 stars`, `${review.rating} de 5 estrellas`)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={13} className={n <= review.rating ? "fill-current" : "text-slate-200"} />
                    ))}
                  </span>
                </div>
                <p className="text-slate-700 whitespace-pre-line">{review.text}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {review.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => handleReviewStatus(review.id, "approved")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                    >
                      <Check size={12} /> {d("Approve", "Aprobar")}
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => handleReviewStatus(review.id, "rejected")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 font-bold text-[11px] cursor-pointer"
                    >
                      <X size={12} /> {review.status === "approved" ? d("Hide from website", "Ocultar de la web") : d("Reject", "Rechazar")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(review.id)}
                    className="ml-auto p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title={d("Delete review", "Eliminar reseña")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Welcome letters */}
      <form onSubmit={handleSaveLetter} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mt-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-orange-500" />
              {d("Welcome Letters", "Cartas de Bienvenida")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
              {d("Course dates and class times in each group's welcome letter. Each student's letter is dated the day they joined.", "Fechas del curso y horarios de clase en la carta de bienvenida de cada grupo. La carta de cada estudiante lleva la fecha del día en que se unió.")}
            </p>
          </div>
          <select
            value={letterGroupCode}
            onChange={(e) => { setLetterGroupCode(e.target.value); setLetterStatus(null); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            {CLASS_GROUPS.map((g) => (
              <option key={g.code} value={g.code}>{`${g.level} ${d("Group", "Grupo")} ${g.group} – ${classGroupLabel(g)}`}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          <label className="sm:col-span-2 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{d("Course dates", "Fechas del curso")}</span>
            <input
              type="text"
              maxLength={255}
              placeholder={d("e.g. 3 November to 12 December 2026", "ej. 3 de noviembre al 12 de diciembre de 2026")}
              value={letterForm.course_dates}
              onChange={(e) => setLetterForm({ ...letterForm, course_dates: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{d("Length in weeks", "Duración en semanas")}</span>
            <input
              type="number"
              min={1}
              max={52}
              value={letterForm.duration_weeks}
              onChange={(e) => setLetterForm({ ...letterForm, duration_weeks: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
          </label>
        </div>

        <div className="space-y-2 max-w-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{d("Weekly class times", "Horario semanal")}</span>
          {letterForm.sessions.map((session, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2">
              <input type="text" maxLength={40} placeholder="19:00-20:00" value={session.time} onChange={(e) => updateLetterSession(index, "time", e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden min-w-0" />
              <input type="text" maxLength={40} placeholder={d("Tuesday", "Martes")} value={session.day} onChange={(e) => updateLetterSession(index, "day", e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden min-w-0" />
              <input type="text" maxLength={120} placeholder={d("Grammar-Lab", "Laboratorio de gramática")} value={session.session} onChange={(e) => updateLetterSession(index, "session", e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden min-w-0" />
              <button
                type="button"
                onClick={() => setLetterForm((form) => ({ ...form, sessions: form.sessions.filter((_, i) => i !== index) }))}
                className="p-2 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer"
                title={d("Remove this class time", "Quitar este horario")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {letterForm.sessions.length < 12 && (
            <button
              type="button"
              onClick={() => setLetterForm((form) => ({ ...form, sessions: [...form.sessions, { time: "", day: "", session: "" }] }))}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-500 cursor-pointer inline-flex items-center gap-1"
            >
              <Plus size={12} />
              {d("Add a class time", "Añadir un horario")}
            </button>
          )}
        </div>

        {letterStatus && (
          <p role={letterStatus.type === "error" ? "alert" : "status"} className={`max-w-2xl rounded-xl border px-3 py-2 text-xs font-semibold ${letterStatus.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {letterStatus.text}
          </p>
        )}
        <button
          type="submit"
          disabled={letterSaving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-60 transition cursor-pointer"
        >
          {letterSaving ? d("Saving...", "Guardando...") : d("Save welcome letter", "Guardar carta de bienvenida")}
        </button>
      </form>

      {/* Chatbot answers */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mt-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="font-sans font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={14} className="text-orange-500" />
              {d("Chatbot Answers", "Respuestas del Chatbot")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
              {d("The website chat answers only from this list. When nothing fits, it sends people to WhatsApp. The first four questions also appear as quick buttons.", "El chat de la web responde solo con esta lista. Si nada encaja, envía a la gente a WhatsApp. Las cuatro primeras preguntas también aparecen como botones rápidos.")}
            </p>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl" role="tablist">
            {(["en", "es"] as const).map((code) => (
              <button
                key={code}
                role="tab"
                aria-selected={faqLang === code}
                onClick={() => { setFaqLang(code); resetFaqForm(); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${faqLang === code ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {code === "en" ? "English" : "Español"}
              </button>
            ))}
          </div>
        </div>

        {faqError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{faqError}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {faqs.filter((faq) => faq.language === faqLang).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">{d("No answers in this language yet.", "Aún no hay respuestas en este idioma.")}</p>
            )}
            {faqs.filter((faq) => faq.language === faqLang).map((faq) => (
              <div key={faq.id} className={`p-3 rounded-xl border text-xs space-y-1 ${faqEditingId === faq.id ? "border-orange-400 bg-orange-50/40" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-slate-800">{faq.question}</h4>
                  <div className="flex shrink-0">
                    <button onClick={() => handleEditFaq(faq)} className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg cursor-pointer" title={d("Edit", "Editar")}>
                      <Edit size={13} />
                    </button>
                    <button onClick={() => handleDeleteFaq(faq)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer" title={d("Delete", "Eliminar")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                {faq.keywords && <p className="text-[10px] text-slate-400">{d("Keywords:", "Palabras clave:")} {faq.keywords}</p>}
              </div>
            ))}
          </div>

          <form onSubmit={handleSaveFaq} className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase">
              {faqEditingId ? d("Edit answer", "Editar respuesta") : d("Add a question", "Añadir una pregunta")} ({faqLang === "en" ? "English" : "Español"})
            </h4>
            <input
              type="text"
              maxLength={255}
              placeholder={d("Question, e.g. Do you teach children?", "Pregunta, ej. ¿Enseñan a niños?")}
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
            <textarea
              rows={4}
              maxLength={2000}
              placeholder={d("Answer", "Respuesta")}
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
            <input
              type="text"
              maxLength={500}
              placeholder={d("Other words people might use, separated by commas (e.g. kids, children, child)", "Otras palabras que la gente podría usar, separadas por comas (ej. niños, hijos)")}
              value={faqForm.keywords}
              onChange={(e) => setFaqForm({ ...faqForm, keywords: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={faqSaving || !faqForm.question.trim() || !faqForm.answer.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 disabled:text-slate-400 transition cursor-pointer"
              >
                {faqSaving ? d("Saving...", "Guardando...") : faqEditingId ? d("Save changes", "Guardar cambios") : d("Add to chatbot", "Añadir al chatbot")}
              </button>
              {faqEditingId && (
                <button type="button" onClick={resetFaqForm} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer">
                  {d("Cancel", "Cancelar")}
                </button>
              )}
            </div>
          </form>
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

    </div>
  );
}
