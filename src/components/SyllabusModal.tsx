/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { X, FileText, CheckCircle2, Download, Send, PhoneCall } from "lucide-react";
import { Course } from "../types";

interface SyllabusModalProps {
  course: Course | null;
  onClose: () => void;
  lang?: "EN" | "ES";
}

export default function SyllabusModal({ course, onClose, lang = "EN" }: SyllabusModalProps) {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!course) return null;

  const isEs = lang === "ES";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(isEs ? "Por favor ingresa un correo electrónico válido." : "Please enter a valid email address.");
      return;
    }
    setErrorMsg("");
    setSubmitted(true);
  };

  // Structured outline for week-by-week curriculum depending on course level
  const syllabusWeeks = {
    a1: [
      { week: "Week 01-02", topic: "The Sound System, Alphabets & Silent Letters", detail: "Phonetic vowels, sound mappings, primary greetings, asking 'what is...' and 'who is...'" },
      { week: "Week 03-04", topic: "Ser vs Estar: Universal Foundations part I", detail: "Decoding permanent properties (Ser) vs temporary conditions/location (Estar) with triggers." },
      { week: "Week 05-06", topic: "Everyday Verbs & Present Indicative", detail: "First conjugation clusters (-ar, -er, -ir), and talking about food, leisure, and daily timelines." },
      { week: "Week 07-08", topic: "Survival Dialogues & Practical Exit Test", detail: "Cafeteria transactions, calling hotel front desks, and basic direction maps navigation." }
    ],
    a2: [
      { week: "Week 01-02", topic: "Narrating Secrets & Pretérito Indefinido", detail: "Step-by-step introduction to irregular past markers. Remembering yesterday and life history." },
      { week: "Week 03-04", topic: "The Art of Imperfecto & Describing Backgrounds", detail: "Setting the scene in the past. Comparing how things were vs how they concluded." },
      { week: "Week 05-06", topic: "Double Object Pronouns & Command Forms", detail: "Simplifying speech by putting 'lo/la/los/las' in correct positions. Giving recommendations." },
      { week: "Week 07-08", topic: "Unveiling Travel Challenges & Speaking Confidence", detail: "Simulated airport mishaps, clinical health consultations, and direct client communications." }
    ],
    b1: [
      { week: "Week 01-02", topic: "Expressing Intentions & The Subjunctive Portal", detail: "Entering the Subjunctive Mood. Conjugations, triggers of desire, wishes, and emotion states." },
      { week: "Week 3-4", topic: "Subjunctive with Doubts, Denials & Hypotheses", detail: "Analyzing different triggers (cuando, aunque, para que) to structure subtle opinions." },
      { week: "Week 05-06", topic: "Conditional Imaginaries & Hypothetical Futures", detail: "Formulating 'If I were... I would...' templates to address professional opportunities." },
      { week: "Week 07-08", topic: "Advanced Debates & Immersive Social Thesis", detail: "Structuring long speeches, commenting on direct film loops, and final presentation mastery." }
    ]
  };

  const syllabusWeeksES = {
    a1: [
      { week: "Semana 01-02", topic: "El sistema de sonidos, alfabetos y letras mudas", detail: "Vocales fonéticas, mapas de sonidos, saludos principales, preguntar 'qué es...' y 'quién es...'" },
      { week: "Semana 03-04", topic: "Ser vs Estar: Fundamentos Universales parte I", detail: "Descifrar propiedades permanentes (Ser) vs condiciones temporales/ubicación (Estar) con desencadenantes." },
      { week: "Semana 05-06", topic: "Verbos cotidianos e indicativo presente", detail: "Primeros grupos de conjugación (-ar, -er, -ir), y hablar sobre comida, ocio y líneas de tiempo diarias." },
      { week: "Semana 07-08", topic: "Diálogos de supervivencia y prueba práctica de salida", detail: "Transacciones en cafeterías, llamadas a la recepción de hoteles y navegación con mapas de direcciones básicas." }
    ],
    a2: [
      { week: "Semana 01-02", topic: "Narrando secretos y Pretérito Indefinido", detail: "Introducción paso a paso a los marcadores de pasado irregulares. Recordando el ayer y la historia de vida." },
      { week: "Semana 03-04", topic: "El arte del Imperfecto y descripción de entornos", detail: "Establecer la escena en el pasado. Comparar cómo eran las cosas versus cómo concluyeron." },
      { week: "Semana 05-06", topic: "Pronombres de objeto doble y formas de comando", detail: "Simplificar el habla colocando 'lo/la/los/las' en las posiciones correctas. Dar recomendaciones." },
      { week: "Semana 07-08", topic: "Desvelando desafíos de viaje y confianza para hablar", detail: "Contratiempos simulados en aeropuertos, consultas de salud clínicas y comunicaciones directas con clientes." }
    ],
    b1: [
      { week: "Semana 01-02", topic: "Expresando intenciones y el portal del subjuntivo", detail: "Entrar en el modo subjuntivo. Conjugaciones, desencadenantes de deseos, emociones y estados emocionales." },
      { week: "Semana 03-04", topic: "Subjuntivo con dudas, negaciones e hipótesis", detail: "Analizar diferentes desencadenantes (cuando, aunque, para que) para estructurar opiniones sutiles." },
      { week: "Semana 05-06", topic: "Imaginarios condicionales y futuros hipotéticos", detail: "Formular plantillas de 'Si yo fuera... yo haría...' para abordar oportunidades profesionales." },
      { week: "Semana 07-08", topic: "Debates avanzados y tesis social inmersiva", detail: "Estructurar discursos largos, comentar bucles de películas directas y dominio de la presentación final." }
    ]
  };

  const activeSyllabus = isEs
    ? (syllabusWeeksES[course.id as keyof typeof syllabusWeeksES] || syllabusWeeksES.a1)
    : (syllabusWeeks[course.id as keyof typeof syllabusWeeks] || syllabusWeeks.a1);

  // Local course objectives translation on-the-fly
  const translateObjective = (obj: string) => {
    if (!isEs) return obj;
    // Map existing known objectives
    if (obj.includes("No prior knowledge")) return "No se requieren conocimientos previos";
    if (obj.includes("basic sentence")) return "Construir estructuras de oraciones básicas";
    if (obj.includes("essential sounds")) return "Dominar sonidos y ritmos esenciales";
    if (obj.includes("daily conversations")) return "Navegar por conversaciones diarias";
    if (obj.includes("standard speech")) return "Comprender el habla estándar";
    if (obj.includes("routines & events")) return "Describir rutinas y eventos";
    if (obj.includes("fluently with ease")) return "Hablar con fluidez y facilidad";
    if (obj.includes("unexpected situations")) return "Manejar situaciones inesperadas";
    if (obj.includes("nuanced opinions")) return "Expresar opiniones matizadas";
    return obj;
  };

  const courseLevelName = isEs
    ? (course.id === "a1" ? "Principiante A1" : course.id === "a2" ? "Elemental A2" : "Intermedio B1")
    : course.level;

  const courseTitleName = isEs
    ? (course.id === "a1" ? "Plan de Estudios de Nivel Inicial" : course.id === "a2" ? "Plan de Estudios de Nivel Elemental" : "Plan de Estudios de Nivel Intermedio")
    : `${course.title} Curriculum`;

  return (
    <div
      id={`syllabus-modal-${course.id}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-slate-900 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col leading-normal z-10"
      >
        {/* Modal Top Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4.5 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-slate-800">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-600 leading-none">
                {isEs ? "Plan de Estudios Oficial PDF" : "Official Syllabus PDF"}
              </p>
              <h3 className="text-lg font-bold font-sans text-slate-900 mt-1">
                {courseLevelName} – {courseTitleName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 px-3 rounded-full bg-gray-100 text-gray-500 hover:text-orange-600 hover:bg-gray-200 transition cursor-pointer"
            aria-label="Close syllabus"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Quick introductory description of level */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-gray-200/80">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
              {isEs ? "Lista de Competencias Clave" : "Core Competency Checklist"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {course.objectives.map((obj, i) => (
                <div key={i} className="flex items-start">
                  <CheckCircle2 size={13} className="text-orange-500 mr-2 mt-0.5 shrink-0" />
                  <span>{translateObjective(obj)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Week list */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {isEs ? "Hoja de Ruta Intensiva de Ocho Semanas" : "Eight-Week Intensive Roadmap"}
            </h4>
            <div className="space-y-3">
              {activeSyllabus.map((sw, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-2 p-4 border border-gray-100 rounded-xl hover:bg-slate-50/50 transition"
                >
                  <div className="sm:w-28 text-xs font-mono font-bold text-orange-600 uppercase tracking-wider">
                    {sw.week}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h5 className="text-sm font-bold text-slate-800 font-sans">{sw.topic}</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">{sw.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive download action panel */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
            {submitted ? (
              <div className="space-y-3.5 py-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isEs ? "¡Plan de estudios generado exitosamente!" : "Syllabus PDF generated successfully!"}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isEs ? "Enviamos el enlace y los materiales de ingreso a" : "We sent the link and detailed entry materials to"}{" "}
                    <strong className="text-slate-800">{email}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Trigger instant local download as a mock action
                    const content = `INICIATIVA SER o ESTAR - SYLLABUS ${course.level}\n========================================\nLevel: ${course.title}\n\nOur Methodology: Cognitive Spanish templates designed specifically for native English speakers.\n\nSyllabus Outline:\n` + activeSyllabus.map(s => `- ${s.week}: ${s.topic}\n  ${s.detail}`).join("\n");
                    const blob = new Blob([content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `Iniciativa_Ser_o_Estar_Syllabus_${course.level.replace(" ", "_")}.txt`;
                    link.click();
                  }}
                  className="inline-flex items-center space-x-2 py-2 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold font-sans text-xs tracking-wider uppercase transition shadow-md cursor-pointer"
                >
                  <Download size={13} />
                  <span>{isEs ? "Descargar copia de texto" : "Download Text Copy"}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center justify-center">
                    <Download size={14} className="mr-1.5 text-orange-600" />
                    {isEs ? "Descargar PDF Completo y Materiales" : "Download Complete PDF & Materials"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-normal">
                    {isEs
                      ? "Ingresa tu correo electrónico para recibir matrices de estudio estándar, mapas de conjugación y el PDF imprimible del plan de estudios."
                      : "Enter your email to receive standard study matrices, conjugation maps, and the printable syllabus PDF."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto justify-center">
                  <input
                    type="email"
                    placeholder={isEs ? "Ingresa tu correo electrónico" : "Enter your email address"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-orange-500 text-slate-800"
                    required
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold font-sans tracking-wide uppercase rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                  >
                    <span>{isEs ? "Solicitar PDF" : "Request PDF"}</span>
                    <Send size={11} />
                  </button>
                </div>

                {errorMsg && <p className="text-[11px] text-red-500 font-medium">{errorMsg}</p>}
                <p className="text-[10px] text-slate-400">
                  {isEs
                    ? "Respetando la privacidad: Nunca te enviaremos spam. Solo tarjetas de trucos lingüísticos de alto valor."
                    : "Respecting privacy: We will never spam you. Only high-value language cheat cards."}
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Modal Bottom CTA Footer */}
        <div className="p-6 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 font-sans text-center sm:text-left">
            {isEs ? "¿Tienes preguntas sobre si" : "Have questions about whether"}{" "}
            <strong className="text-slate-700">{courseLevelName}</strong>{" "}
            {isEs ? "es óptimo para tu nivel actual?" : "is optimal for your current level?"}
          </p>
          <a
            href={`https://wa.me/23272057646?text=Hola!%20I%20have%20questions%20about%20your%20${course.level}%20syllabus.`}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide transition flex items-center justify-center space-x-1.5"
          >
            <PhoneCall size={12} />
            <span>{isEs ? "Consultar Tutor" : "Consult Tutor"}</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
