import React, { useState } from "react";
import { KeyRound, X } from "lucide-react";
import PasswordInput from "../PasswordInput";

interface ChangePasswordButtonProps {
  lang?: "EN" | "ES";
  className?: string;
}

// "Change password" for the signed-in student or tutor, e.g. after the admin
// gave them a temporary password.
export default function ChangePasswordButton({ lang = "EN", className = "" }: ChangePasswordButtonProps) {
  const d = (en: string, es: string) => (lang === "ES" ? es : en);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const close = () => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setRepeat("");
    setStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (next.length < 8) return setStatus({ type: "error", text: d("The new password needs at least 8 characters.", "La nueva contraseña necesita al menos 8 caracteres.") });
    if (next !== repeat) return setStatus({ type: "error", text: d("The two new passwords don't match.", "Las dos contraseñas nuevas no coinciden.") });
    setSaving(true);
    setStatus(null);
    const response = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: current, new_password: next })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const detail = typeof payload?.detail === "string" ? payload.detail : null;
      setStatus({ type: "error", text: detail || d("The password could not be changed. Try again.", "No se pudo cambiar la contraseña. Inténtalo de nuevo.") });
      return;
    }
    setCurrent("");
    setNext("");
    setRepeat("");
    setStatus({ type: "success", text: d("Password changed. Use the new one next time you sign in.", "Contraseña cambiada. Usa la nueva la próxima vez que inicies sesión.") });
  };

  const inputClass = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:border-teal-600";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <KeyRound size={14} className="mr-2" />
        <span>{d("Change password", "Cambiar contraseña")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onClick={close}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="flex justify-between items-center">
              <h2 id="change-password-title" className="text-sm font-black text-slate-900 uppercase tracking-wider">{d("Change password", "Cambiar contraseña")}</h2>
              <button type="button" onClick={close} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label={d("Close", "Cerrar")}>
                <X size={16} />
              </button>
            </div>
            <PasswordInput required autoComplete="current-password" placeholder={d("Current password", "Contraseña actual")} value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
            <PasswordInput required autoComplete="new-password" minLength={8} maxLength={72} placeholder={d("New password (at least 8 characters)", "Nueva contraseña (mínimo 8 caracteres)")} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
            <PasswordInput required autoComplete="new-password" maxLength={72} placeholder={d("Repeat the new password", "Repite la nueva contraseña")} value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass} />
            {status && (
              <p role={status.type === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${status.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {status.text}
              </p>
            )}
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-60 transition cursor-pointer">
              {saving ? d("Saving...", "Guardando...") : d("Save new password", "Guardar nueva contraseña")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
