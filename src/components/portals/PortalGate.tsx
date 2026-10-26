import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles,
  KeyRound,
  Fingerprint
} from "lucide-react";
import { motion } from "motion/react";

import { TRANSLATIONS } from "../../translations";
import { normalizeRole, portalRoleToCanonical, roleMatchesPortal } from "../../roles";
import PasswordInput from "../PasswordInput";
import { groupOptionsForLevel } from "../../groups";

interface PortalGateProps {
  role: "student" | "teacher" | "admin";
  onBack: () => void;
  onSuccess: (profile: any) => void;
  lang?: "EN" | "ES";
}

export default function PortalGate({ role, onBack, onSuccess, lang = "EN" }: PortalGateProps) {
  const canResetPassword = role === "student" || role === "teacher";
  const resetParams = new URLSearchParams(window.location.search);
  const requestedResetRole = resetParams.get("reset_role");
  const resetToken =
    canResetPassword &&
    (!requestedResetRole || normalizeRole(requestedResetRole) === portalRoleToCanonical(role))
      ? resetParams.get("reset_token") || ""
      : "";
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
  const [providerLoginMessage, setProviderLoginMessage] = useState("");

  const t = TRANSLATIONS[lang];

  const returnToLogin = () => {
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
      if (payload.email_enabled === false) {
        // No email account is connected yet, so no link can be sent.
        setSuccessMessage(
          lang === "ES"
            ? "El restablecimiento por correo aún no está disponible. Pide a tu tutor, o escribe a la academia por WhatsApp (+232 72 057646), que restablezca tu contraseña."
            : "Password reset by email is not available yet. Please ask your tutor, or message the academy on WhatsApp (+232 72 057646), to reset your password."
        );
        return;
      }
      setSuccessMessage(
        lang === "ES"
          ? "Si existe una cuenta elegible con este correo, se ha enviado un enlace para restablecer la contraseña."
          : "If an eligible account exists for this email, a password-reset link has been sent."
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
            if (!roleMatchesPortal(userInfo.role, "student")) {
              setError(t.gateStudentInvalid);
              return;
            }
            onSuccess({
              fullName: userInfo.full_name,
              email: userInfo.email,
              role: normalizeRole(userInfo.role),
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
            if (!roleMatchesPortal(userInfo.role, "teacher")) {
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
          if (!loginResponse.ok || !roleMatchesPortal(userInfo.role, "admin")) {
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
              {canResetPassword && authMode === "forgot"
                  ? (lang === "ES" ? "RECUPERAR CONTRASEÑA" : "RESET YOUR PASSWORD")
                  : canResetPassword && authMode === "reset"
                  ? (lang === "ES" ? "CREAR NUEVA CONTRASEÑA" : "CREATE A NEW PASSWORD")
                  : role === "student"
                  ? (isRegister ? t.gateCreateStudent : t.gateStudentSignIn)
                  : role === "teacher"
                  ? t.gateTeacherAuth
                  : t.gateRootDevShell}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {canResetPassword && authMode === "forgot"
                  ? (lang === "ES" ? "Introduce el correo registrado de tu cuenta y te enviaremos un enlace seguro." : "Enter your account's registered email and we will send a secure reset link.")
                  : canResetPassword && authMode === "reset"
                  ? (lang === "ES" ? "Elige una contraseña segura de al menos 12 caracteres." : "Choose a secure password containing at least 12 characters.")
                  : role === "student"
                  ? t.gateStudentDesc
                  : role === "teacher"
                  ? t.gateTeacherDesc
                  : t.gateDevDesc}
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
                placeholder={role === "student" ? t.gateEmailPlaceholder : role === "teacher" ? "tutor@seroestar.com" : "developer@seroestar.com"}
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
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <PasswordInput
                placeholder={t.gatePassPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {canResetPassword && !isRegister && (
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
                  onChange={(e) => { setCourseLevel(e.target.value); setClassGroup("Group 1"); }}
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
                  {groupOptionsForLevel(courseLevel).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
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
                {role === "teacher"
                  ? (lang === "ES" ? "Correo registrado del profesor" : "Registered teacher email")
                  : (lang === "ES" ? "Correo registrado del estudiante" : "Registered student email")}
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder={role === "teacher" ? "tutor@seroestar.com" : t.gateEmailPlaceholder}
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
              onClick={returnToLogin}
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
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === "ES" ? "Confirmar nueva contraseña" : "Confirm new password"}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
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

      </motion.div>

    </div>
  );
}
