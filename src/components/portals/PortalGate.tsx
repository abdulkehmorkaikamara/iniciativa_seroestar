import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Chrome, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles,
  KeyRound,
  Fingerprint,
  Info
} from "lucide-react";
import { motion } from "motion/react";

import { TRANSLATIONS } from "../../translations";

interface PortalGateProps {
  role: "student" | "teacher" | "admin";
  onBack: () => void;
  onSuccess: (profile: any) => void;
  lang?: "EN" | "ES";
}

export default function PortalGate({ role, onBack, onSuccess, lang = "EN" }: PortalGateProps) {
  const resetToken = role === "student" ? new URLSearchParams(window.location.search).get("reset_token") || "" : "";
  const [authMode, setAuthMode] = useState<"login" | "forgot" | "reset">(resetToken ? "reset" : "login");
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [courseLevel, setCourseLevel] = useState("A1");
  const [classGroup, setClassGroup] = useState("Group 1");
  
  // States for errors and simulation
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGoogleSSOPopup, setShowGoogleSSOPopup] = useState(false);
  const [providerLoginMessage, setProviderLoginMessage] = useState("");

  const t = TRANSLATIONS[lang];
  const enableDemoAuth = false;

  const returnToStudentLogin = () => {
    window.history.replaceState({}, "", window.location.pathname);
    setAuthMode("login");
    setIsRegister(false);
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!email) {
      setError(t.gateEmailRequired);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.detail || (lang === "ES" ? "No se pudo procesar la solicitud." : "Unable to process the request."));
        return;
      }
      setSuccessMessage(
        lang === "ES"
          ? "Si existe una cuenta de estudiante con este correo, se ha enviado un enlace para restablecer la contraseña."
          : "If a student account exists for this email, a password-reset link has been sent."
      );
    } catch {
      setError(lang === "ES" ? "El servicio de recuperación no está disponible temporalmente." : "The recovery service is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (password.length < 12) {
      setError(lang === "ES" ? "La nueva contraseña debe tener al menos 12 caracteres." : "Your new password must contain at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === "ES" ? "Las contraseñas no coinciden." : "The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.detail || (lang === "ES" ? "El enlace no es válido o ha caducado." : "The reset link is invalid or has expired."));
        return;
      }
      window.history.replaceState({}, "", window.location.pathname);
      setAuthMode("login");
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage(
        lang === "ES"
          ? "Tu contraseña se ha restablecido. Ya puedes iniciar sesión."
          : "Your password has been reset. You can now sign in."
      );
    } catch {
      setError(lang === "ES" ? "El servicio de recuperación no está disponible temporalmente." : "The recovery service is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  // Simulated validation \& login
  const handleCredentialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    
    if (!email) {
      setError(t.gateEmailRequired);
      return;
    }
    if (!password) {
      setError(t.gatePasswordRequired);
      return;
    }

    setLoading(true);

    (async () => {
      
      if (role === "student") {
        if (isRegister) {
          if (!fullName) {
            setError(t.gateRequiredName);
            return;
          }

          try {
            const registerResponse = await fetch("/api/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                full_name: fullName,
                email,
                password,
                phone_number: "",
                course_level: courseLevel,
                class_group: classGroup,
                learning_mode: "Online"
              })
            });

            if (!registerResponse.ok) {
              const payload = await registerResponse.json().catch(() => ({}));
              setError(payload.detail || t.gateStudentEmailExists);
              return;
            }

            const student = await registerResponse.json();
            const loginResponse = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: email, password })
            });

            if (!loginResponse.ok) {
              const payload = await loginResponse.json().catch(() => ({}));
              setError(payload.detail || t.gateStudentInvalid);
              return;
            }

            const userInfo = await loginResponse.json();
            onSuccess({
              fullName: student.full_name,
              studentIdCode: student.student_id_code,
              email: student.email,
              courseLevel: student.course_level,
              classGroup: student.class_group,
              learningMode: student.learning_mode,
              authMethod: "Password"
            });
          } catch (err) {
            console.error(err);
            setError(t.gateStudentInvalid);
          }
        } else {
          try {
            const loginResponse = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: email, password })
            });

            if (!loginResponse.ok) {
              const payload = await loginResponse.json().catch(() => ({}));
              setError(payload.detail || t.gateStudentInvalid);
              return;
            }

            const userInfo = await loginResponse.json();
            onSuccess({
              fullName: userInfo.full_name,
              email: userInfo.email,
              role: userInfo.role,
              studentIdCode: userInfo.student_id_code,
              phoneNumber: userInfo.phone_number || "",
              courseLevel: userInfo.course_level || "A1",
              classGroup: userInfo.class_group || "Morning Group",
              learningMode: userInfo.learning_mode || "Online"
            });
          } catch (err) {
            console.error(err);
            setError(t.gateStudentInvalid);
          }
        }
      } else if (role === "teacher") {
        try {
          const loginResponse = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email, password })
          });

          if (loginResponse.ok) {
            const userInfo = await loginResponse.json();
            if (userInfo.role !== "teacher") {
              setError(t.gateTeacherInvalid);
              return;
            }
            onSuccess({
              fullName: userInfo.full_name,
              displayName: userInfo.display_name || userInfo.full_name,
              email: userInfo.email,
              role: "teacher",
              teacherId: userInfo.teacher_id_code,
              assignedLevels: userInfo.assigned_levels || ["A1"]
            });
            return;
          }
          const payload = await loginResponse.json().catch(() => ({}));
          setError(payload.detail || t.gateTeacherInvalid);
        } catch (err) {
          console.warn("Teacher login failed:", err);
          setError(t.gateTeacherInvalid);
        }
      } else if (role === "admin") {
        try {
          const loginResponse = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email, password })
          });
          const userInfo = await loginResponse.json().catch(() => ({}));
          if (!loginResponse.ok || userInfo.role !== "admin") {
            setError(userInfo.detail || t.gateAdminInvalid);
            return;
          }
          onSuccess({
            fullName: userInfo.full_name,
            email: userInfo.email,
            role: "admin"
          });
        } catch {
          setError(t.gateAdminInvalid);
        }
      }
    })().finally(() => setLoading(false));
  };

  // Google SSO Simulation handler
  const handleTriggerGoogleSSO = () => {
    setError("");
    setShowGoogleSSOPopup(true);
  };

  const handleCompleteGoogleSSO = (googleEmail: string, googleName: string) => {
    setShowGoogleSSOPopup(false);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const studentCode = `SSO-${Math.floor(Math.random() * 800) + 120}`;
      const ssoProfile = {
        fullName: googleName,
        email: googleEmail,
        studentIdCode: studentCode,
        courseLevel: "A1",
        classGroup: "Morning Group",
        learningMode: "Online (SSO)",
        authMethod: "Google SSO"
      };

      // Save student SSO profile locally
      const registeredUsers = JSON.parse(localStorage.getItem("portal_students") || "[]");
      const exists = registeredUsers.find((u: any) => u.email.toLowerCase() === googleEmail.toLowerCase());
      if (!exists) {
        registeredUsers.push(ssoProfile);
        localStorage.setItem("portal_students", JSON.stringify(registeredUsers));

        // Since new SSO users default to A1, trigger welcome email and mailbox pre-population
        const welcomeMail = {
          id: "welcome-letter-mail",
          instructor: "Iniciativa Ser o Estar",
          subject: "Official Welcome Letter - Group 1 Intensive A1 Spanish Course",
          text: `Dear Group 1 Participant,

On behalf of Iniciativa Ser o Estar (ISoE), it is our pleasure to officially welcome you to the intensive A1 Spanish course. This program is tailored for beginners who are passionate about starting their journey toward Spanish fluency.

Student ID: ${studentCode}

Classes are online, and will be held on:
Course dates: 19 May to 27 June 2026 (six weeks of intensive learning)

Time | Day | Hours by Session | Session
19:00-20:00 | Tuesday | 1 | Grammar-Lab
19:00-20:00 | Thursday | 1 | Vocabulary & Conversation
10:00-11:00 | Saturday | 1 | Listening Practice. Review
11:00-12:00 | Saturday | 1 | Final Project Coaching. (Week 3-6)

WORKING PLAN OVERVIEW:
• Grammar Lab: Focused sessions on essential Spanish grammar topics.
• Vocabulary & Conversation: Practical vocabulary building and interactive speaking exercises.
• Listening Practice: Activities to improve comprehension and pronunciation.
• Progress Assessments: Periodic evaluations to track progress and address learning gaps.
• Coaching on participant final project design and rehearsals.
• Max 16 participants per session.
• One recovery class available every two weeks.

CERTIFICATION PROCESS:
For this six-week A1 Spanish Intensive Course, a certificate of participation will be awarded by the Embassy of Spain in Guinea and Sierra Leone, in partnership with the Honorary Consulate of Spain in Freetown.

Requirements: Attendance is the main criterion.
If your attendance is below 85%, you may continue with the course by paying a registration fee of 250 leones. This fee is reimbursable if you attend at least 80% of the course.

A minimum of 80% attendance is required for certification.

If your attendance is below 80%, the registration fee is not reimbursable. You may continue attending the remaining classes and you will receive all course materials; however, a certificate of participation will not be issued in this case.

OFFICIAL REGISTRATION:
If you are still interested in improving your Spanish skills through this course, kindly confirm your acceptance of this letter via email or WhatsApp.

Once you have confirmed, you will receive:
- Participant Card
- Detailed Working Plan
- Schedule with specific dates and activities.
- Address and access to interactive classroom in Freetown. Available for those who consider it an ideal option to have access to steady power supply and internet. This option also provides the opportunity to interact one on one with other participants.

We look forward to supporting your learning journey and ensuring your experience is both enjoyable and productive.

¡Nos vemos pronto!
Saludos del Equipo de Iniciativa Ser o Estar

Contact: +232 72 057646 | seroestar@icloud.com
May 2026`,
          date: "2026-05-19",
          status: "DELIVERED"
        };
        localStorage.setItem(`emails_${studentCode}`, JSON.stringify([welcomeMail]));

        // Trigger the backend API to send Gmail
        fetch("/api/send-welcome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: googleEmail, fullName: googleName, studentIdCode: studentCode })
        })
        .then(res => res.json())
        .then(data => console.log("Welcome email status (SSO):", data))
        .catch(err => console.error("Error triggering welcome email (SSO):", err));
      }

      onSuccess(exists || ssoProfile);
    }, 600);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 relative p-4" id="portal-security-gate">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6 overflow-hidden z-10"
      >
        {/* Glow Element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Banner with role decoration */}
        <div className="flex flex-col items-center text-center space-y-3 relative">
          <button 
            type="button" 
            onClick={onBack}
            className="absolute left-0 top-1 text-slate-400 hover:text-slate-800 transition cursor-pointer flex items-center space-x-1"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-semibold hidden sm:inline">{t.gateBack}</span>
          </button>
          
          <div className={`p-3.5 rounded-2xl shadow-md ${
            role === "student" ? "bg-teal-50 text-teal-700 border border-teal-100" : 
            role === "teacher" ? "bg-slate-900 text-slate-100 border border-slate-800" : 
            "bg-orange-50 text-orange-700 border border-orange-200"
          }`}>
            {role === "student" && <Fingerprint size={28} />}
            {role === "teacher" && <KeyRound size={28} />}
            {role === "admin" && <ShieldCheck size={28} />}
          </div>

          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-mono font-black text-orange-600 tracking-wider uppercase">
              {role === "student" ? t.gateSecuredLms : 
               role === "teacher" ? t.gateInstructorWorkspace : 
               t.gateDevOnly}
            </span>
            <h2 className="font-sans font-black text-slate-900 text-lg uppercase tracking-tight">
              {role === "student" ? (
                authMode === "forgot"
                  ? (lang === "ES" ? "RECUPERAR CONTRASEÑA" : "RESET YOUR PASSWORD")
                  : authMode === "reset"
                  ? (lang === "ES" ? "CREAR NUEVA CONTRASEÑA" : "CREATE A NEW PASSWORD")
                  : (isRegister ? t.gateCreateStudent : t.gateStudentSignIn)
              ) :
               role === "teacher" ? t.gateTeacherAuth :
               t.gateRootDevShell}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {role === "student" ? (
                authMode === "forgot"
                  ? (lang === "ES" ? "Introduce el correo registrado del estudiante y te enviaremos un enlace seguro." : "Enter the student's registered email and we will send a secure reset link.")
                  : authMode === "reset"
                  ? (lang === "ES" ? "Elige una contraseña segura de al menos 12 caracteres." : "Choose a secure password containing at least 12 characters.")
                  : t.gateStudentDesc
              ) :
               role === "teacher" ? t.gateTeacherDesc :
               t.gateDevDesc}
            </p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs flex items-start space-x-2 text-left"
          >
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-0.5">
              <span className="font-bold">{t.gateDenied}</span>
              <p className="text-rose-700 leading-normal">{error}</p>
            </div>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs flex items-start space-x-2 text-left"
          >
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
            <p className="leading-normal">{successMessage}</p>
          </motion.div>
        )}

        {/* Auth Forms */}
        {authMode === "login" ? (
        <form onSubmit={handleCredentialAuth} className="space-y-4">
          
          {role === "student" && isRegister && (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.gateLabelName}</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Abdul Kamara"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === "EN" ? "Institutional Email" : "Correo Electrónico Institucional"}
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder={role === "student" ? t.gateEmailPlaceholder : role === "teacher" ? "tutor@seroestar.com" : "admin@seroestar.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === "EN" ? "Security Password" : "Contraseña de Seguridad"}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder={t.gatePassPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {role === "student" && !isRegister && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("forgot");
                  setError("");
                  setSuccessMessage("");
                  setPassword("");
                }}
                className="text-[11px] text-teal-700 hover:text-teal-600 font-bold cursor-pointer underline underline-offset-4"
              >
                {lang === "ES" ? "¿Olvidaste tu contraseña?" : "Forgot your password?"}
              </button>
            </div>
          )}

          {/* Student Specific Level selecting */}
          {role === "student" && isRegister && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.gateLabelLevel}</label>
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.8 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="A1">{lang === "EN" ? "A1 Beginner" : "A1 Principiante"}</option>
                  <option value="A2">{lang === "EN" ? "A2 Elementary" : "A2 Elemental"}</option>
                  <option value="B1">{lang === "EN" ? "B1 Intermediate" : "B1 Intermedio"}</option>
                </select>
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.gateLabelGroup}</label>
                <select
                  value={classGroup}
                  onChange={(e) => setClassGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.8 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="Group 1">{lang === "EN" ? "Group 1" : "Grupo 1"}</option>
                  <option value="Group 2">{lang === "EN" ? "Group 2" : "Grupo 2"}</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              role === "student" ? "bg-teal-700 hover:bg-teal-600 text-white shadow-md shadow-teal-700/10" :
              role === "teacher" ? "bg-slate-900 hover:bg-slate-800 text-white shadow-md" :
              "bg-orange-600 hover:bg-orange-500 text-white shadow-md"
            }`}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {role === "student" ? (isRegister ? t.gateSubmitBtnStudentReg : t.gateSubmitBtnStudentLogin) : 
                   role === "teacher" ? t.gateSubmitBtnTeacher : t.gateSubmitBtnAdmin}
                </span>
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </form>
        ) : authMode === "forgot" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === "ES" ? "Correo registrado del estudiante" : "Registered student email"}
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder={t.gateEmailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Mail size={14} /><span>{lang === "ES" ? "Enviar enlace seguro" : "Send secure reset link"}</span></>}
            </button>
            <button
              type="button"
              onClick={returnToStudentLogin}
              className="w-full text-xs text-slate-500 hover:text-teal-700 font-semibold cursor-pointer"
            >
              {lang === "ES" ? "Volver al inicio de sesión" : "Return to sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === "ES" ? "Nueva contraseña" : "New password"}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === "ES" ? "Confirmar nueva contraseña" : "Confirm new password"}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed text-left">
              {lang === "ES" ? "Usa al menos 12 caracteres y evita reutilizar una contraseña anterior." : "Use at least 12 characters and do not reuse a previous password."}
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><KeyRound size={14} /><span>{lang === "ES" ? "Guardar nueva contraseña" : "Save new password"}</span></>}
            </button>
          </form>
        )}

        {/* Separator / Google SSO */}
        {role === "student" && authMode === "login" && enableDemoAuth && (
          <div className="space-y-4">
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                {lang === "EN" ? "or integrate security" : "o integre seguridad"}
              </span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            <button
              type="button"
              onClick={handleTriggerGoogleSSO}
              className="w-full py-2.5 px-4 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2.5 cursor-pointer"
            >
              <Chrome size={15} className="text-[#4285F4] shrink-0" />
              <span>{t.gateLabelGoogleBtn}</span>
            </button>

            {/* Single Sign-on details */}
            <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl flex items-start space-x-2.5 text-left">
              <Info size={14} className="text-teal-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-650 uppercase tracking-widest block">
                  {lang === "EN" ? "Active SSO Tunneling" : "Túnel SSO Activo"}
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {lang === "EN" 
                    ? "Single Sign-On is fully synchronized. Enrolled students of affiliated partnerships (UNIMAK, Government, Embassy) can authenticate instantly."
                    : "El inicio de sesión único (SSO) está completamente sincronizado. Estudiantes de instituciones asociadas (UNIMAK, Gobierno, Embajada de España) ingresan instantáneamente."}
                </p>
              </div>
            </div>

            {/* Switch sign in / register */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setError(""); setIsRegister(!isRegister); }}
                className="text-xs text-teal-700 hover:text-teal-600 font-semibold cursor-pointer underline underline-offset-4"
              >
                {isRegister ? t.gateHaveAccountQ : t.gateNewStudentQ}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* DYNAMIC INTERACTIVE GOOGLE AUTH / SSO WINDOW POPUP OVERLAY */}
      {enableDemoAuth && showGoogleSSOPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-sm bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden text-slate-800"
          >
            {/* Window header */}
            <div className="bg-slate-50 border-b border-slate-150 px-5 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-white border border-slate-250 rounded flex items-center justify-center text-[#4285F4]">
                  <Chrome size={12} />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">accounts.google.com</span>
              </div>
              <button 
                onClick={() => setShowGoogleSSOPopup(false)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                {lang === "EN" ? "Cancel" : "Cancelar"}
              </button>
            </div>

            {/* Window Body logo */}
            <div className="p-6 space-y-5 text-center">
              <div className="space-y-1">
                {/* Visual G Logo */}
                <div className="w-12 h-12 rounded-full border border-slate-100 shadow-sm bg-white flex items-center justify-center mx-auto text-xl font-bold">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </div>
                <h3 className="font-sans font-bold text-slate-900 text-sm mt-3">
                  {lang === "EN" ? "Sign in with Google" : "Iniciar sesión con Google"}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {lang === "EN" ? "to continue to" : "para continuar en"}{" "}
                  <span className="font-bold text-teal-700">Iniciativa Ser o Estar Student Hub</span>
                </p>
              </div>

              {/* Accounts Selection */}
              <div className="space-y-2 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-1">
                  {lang === "EN" ? "choose an account" : "seleccione una cuenta"}
                </span>
                
                {/* User email option */}
                <button
                  type="button"
                  onClick={() => handleCompleteGoogleSSO("abdulkehmorkaikamara@gmail.com", "Abdul K. Kamara")}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition text-slate-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow">
                      AK
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 leading-none">Abdul K. Kamara</p>
                      <p className="text-[10px] text-slate-500 font-mono">abdulkehmorkaikamara@gmail.com</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>

                {/* Demo student account option */}
                <button
                  type="button"
                  onClick={() => handleCompleteGoogleSSO("guest.student@gmail.com", "Patricia Turay")}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition text-slate-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow">
                      PT
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 leading-none">Patricia Turay</p>
                      <p className="text-[10px] text-slate-500 font-mono">guest.student@gmail.com</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              </div>

              {/* Security warning */}
              <p className="text-[9px] text-slate-400 leading-snug">
                {lang === "EN" 
                  ? "Google will share your name, email address, language preference, and profile picture with Iniciativa Ser o Estar. Before using this app, you can review its privacy policy and terms of service."
                  : "Google compartirá su nombre, dirección de correo electrónico, preferencia de idioma y foto de perfil con Iniciativa Ser o Estar. Antes de utilizar esta aplicación, puede revisar su política de privacidad y condiciones de servicio."}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
