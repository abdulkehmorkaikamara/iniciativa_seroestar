import React, { useState } from "react";
import { Award, X } from "lucide-react";
import { CERTIFICATE_LEVELS, CertificateDetails, downloadCertificate } from "../../certificate";

interface CertificateButtonProps {
  student: { full_name: string; student_id_code: string; course_level?: string; registration_date?: string | null };
  school?: string;
  lang?: "EN" | "ES";
  className?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

// "Certificate" for one student: pick the level and dates, then download the PDF.
export default function CertificateButton({ student, school, lang = "EN", className = "" }: CertificateButtonProps) {
  const d = (en: string, es: string) => (lang === "ES" ? es : en);
  const startingLevel = (String(student.course_level || "").match(/\b(A1|A2|B1)\b/i)?.[1]?.toUpperCase() || "A1") as CertificateDetails["level"];
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<CertificateDetails["level"]>(startingLevel);
  const [startDate, setStartDate] = useState(String(student.registration_date || "").slice(0, 10) || today());
  const [endDate, setEndDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!startDate || !endDate || startDate > endDate) {
      setError(d("The start date must be before the completion date.", "La fecha de inicio debe ser anterior a la de finalización."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await downloadCertificate({ fullName: student.full_name, studentCode: student.student_id_code, level, school, startDate, endDate });
      setOpen(false);
    } catch {
      setError(d("The certificate could not be created. Try again.", "No se pudo crear el certificado. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-orange-500";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {d("Certificate", "Certificado")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 whitespace-normal text-left font-sans" role="dialog" aria-modal="true" aria-label={d("Completion certificate", "Certificado de finalización")}>
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <form onSubmit={handleDownload} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600"><Award size={18} /></div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{d("Completion certificate", "Certificado de finalización")}</h4>
                  <p className="text-[11px] text-slate-500">{student.full_name} · {student.student_id_code}</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={d("Close", "Cerrar")} className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <label className="block space-y-1">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">{d("Level completed", "Nivel completado")}</span>
              <select value={level} onChange={(e) => setLevel(e.target.value as CertificateDetails["level"])} className={`${inputClass} w-full`}>
                {(Object.keys(CERTIFICATE_LEVELS) as CertificateDetails["level"][]).map((code) => (
                  <option key={code} value={code}>{lang === "ES" ? CERTIFICATE_LEVELS[code].es : CERTIFICATE_LEVELS[code].en}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">{d("Started", "Inicio")}</span>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputClass} w-full`} />
              </label>
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">{d("Completed", "Finalización")}</span>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputClass} w-full`} />
              </label>
            </div>
            {school && <p className="text-[11px] text-slate-500">{d("School on the certificate:", "Colegio en el certificado:")} <span className="font-semibold text-slate-700">{school}</span></p>}
            {error && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">
              {busy ? d("Creating PDF...", "Creando PDF...") : d("Download certificate (PDF)", "Descargar certificado (PDF)")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
