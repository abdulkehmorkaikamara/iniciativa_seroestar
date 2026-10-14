import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inbox, MessageSquare, Send } from "lucide-react";
import { contentAudienceLabel } from "../../groups";

// Messages between students and tutors, stored on the server (/api/messages).
// Students talk to their tutor; tutors see one conversation per student.

export interface PortalMessage {
  id: number;
  student_id_code: string;
  student_name: string;
  course_level: string;
  class_group?: string | null;
  tutor_email: string;
  tutor_name: string;
  sender_role: "student" | "tutor";
  subject?: string | null;
  body: string;
  created_at?: string | null;
  read_at?: string | null;
}

interface MessageStudent {
  student_id_code: string;
  full_name: string;
  course_level: string;
  class_group?: string | null;
}

interface MessagesPanelProps {
  role: "student" | "tutor";
  d: (en: string, es: string) => string;
  // Students: the tutors they can write to (their group tutor first).
  tutors?: Array<{ email: string; name: string }>;
}

interface Conversation {
  key: string;
  title: string;
  subtitle: string;
  messages: PortalMessage[];
  unread: number;
}

const POLL_MS = 30000;

function formatTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPanel({ role, d, tutors = [] }: MessagesPanelProps) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [students, setStudents] = useState<MessageStudent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeKey, setActiveKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadEnd = useRef<HTMLDivElement>(null);
  const incomingRole = role === "student" ? "tutor" : "student";

  const load = useCallback(() => {
    fetch("/api/messages")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (role !== "tutor") return;
    fetch("/api/messages/students")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setStudents(data))
      .catch(() => {});
  }, [role]);

  const conversations = useMemo<Conversation[]>(() => {
    const byKey = new Map<string, Conversation>();
    const ensure = (key: string, title: string, subtitle: string) => {
      if (!byKey.has(key)) byKey.set(key, { key, title, subtitle, messages: [], unread: 0 });
      return byKey.get(key)!;
    };
    if (role === "student") {
      tutors.forEach((tutor) => ensure(tutor.email.toLowerCase(), tutor.name, d("Your tutor", "Tu tutora")));
    }
    messages.forEach((message) => {
      const conversation = role === "student"
        ? ensure(message.tutor_email.toLowerCase(), message.tutor_name, d("Your tutor", "Tu tutora"))
        : ensure(message.student_id_code, message.student_name, contentAudienceLabel(message.course_level, message.class_group));
      conversation.messages.push(message);
      if (message.sender_role === incomingRole && !message.read_at) conversation.unread += 1;
    });
    const latest = (c: Conversation) => c.messages[c.messages.length - 1]?.id ?? 0;
    return [...byKey.values()].sort((a, b) => b.unread - a.unread || latest(b) - latest(a));
  }, [messages, role, tutors, incomingRole, d]);

  // A tutor can also open a conversation with a student who hasn't written yet.
  const activeStudent = role === "tutor" ? students.find((s) => s.student_id_code === activeKey) : undefined;
  const active = conversations.find((c) => c.key === activeKey)
    || (activeStudent
      ? { key: activeStudent.student_id_code, title: activeStudent.full_name, subtitle: contentAudienceLabel(activeStudent.course_level, activeStudent.class_group), messages: [], unread: 0 }
      : undefined);

  useEffect(() => {
    if (!activeKey && conversations.length > 0 && (role === "student" || conversations[0].messages.length > 0)) {
      setActiveKey(conversations[0].key);
    }
  }, [activeKey, conversations, role]);

  // Opening a conversation marks the other side's messages as read.
  useEffect(() => {
    const unreadIds = (active?.messages || [])
      .filter((m) => m.sender_role === incomingRole && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_ids: unreadIds }),
    })
      .then((res) => {
        if (!res.ok) return;
        const now = new Date().toISOString();
        setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: now } : m)));
      })
      .catch(() => {});
  }, [active?.key, active?.messages.length, incomingRole]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "nearest" });
  }, [active?.key, active?.messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !body.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          subject: subject.trim() || undefined,
          ...(role === "student" ? { tutor_email: active.key } : { student_id_code: active.key }),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "");
      setMessages((prev) => [...prev, data]);
      setSubject("");
      setBody("");
    } catch (err: any) {
      setError(err?.message || d("Your message wasn't sent. Please try again.", "Tu mensaje no se envió. Inténtalo de nuevo."));
    } finally {
      setSending(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const showList = role === "tutor" || conversations.length > 1;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 text-left font-sans" id={`${role}-messages`}>
      <div className="pb-3 border-b border-slate-100 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-sans font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center">
            <MessageSquare size={16} className="text-teal-600 mr-2" />
            <span>{role === "student" ? d("Messages with your tutor", "Mensajes con tu tutora") : d("Student Messages", "Mensajes de Estudiantes")}</span>
            {totalUnread > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {totalUnread} {d("new", "nuevos")}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            {role === "student"
              ? d("Write to your tutor here. Replies appear in this conversation.", "Escribe a tu tutora aquí. Las respuestas aparecen en esta conversación.")
              : d("Messages from your students, and messages you send them. Students see your replies in their portal.", "Mensajes de tus estudiantes y los que les envías. Los estudiantes ven tus respuestas en su portal.")}
          </p>
        </div>
        {role === "tutor" && (
          <select
            value=""
            onChange={(e) => e.target.value && setActiveKey(e.target.value)}
            aria-label={d("Message a student", "Escribir a un estudiante")}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-bold focus:outline-hidden max-w-full"
          >
            <option value="">{d("+ Message a student…", "+ Escribir a un estudiante…")}</option>
            {students.map((s) => (
              <option key={s.student_id_code} value={s.student_id_code}>
                {s.full_name} · {contentAudienceLabel(s.course_level, s.class_group)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showList ? "lg:grid-cols-3" : ""}`}>
        {showList && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto min-w-0">
            {loaded && conversations.length === 0 && (
              <p className="text-[11px] text-slate-400 font-semibold py-6 text-center">
                {d("No messages yet.", "Aún no hay mensajes.")}
              </p>
            )}
            {conversations.map((c) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveKey(c.key)}
                  className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer ${
                    c.key === active?.key ? "bg-teal-50 border-teal-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs truncate ${c.unread ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>{c.title}</span>
                    {c.unread > 0 && <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">{c.unread}</span>}
                  </div>
                  <span className="text-[9px] font-bold text-orange-700">{c.subtitle}</span>
                  {last && <p className="text-[10px] text-slate-500 truncate mt-0.5">{last.sender_role === role ? d("You: ", "Tú: ") : ""}{last.body}</p>}
                </button>
              );
            })}
          </div>
        )}

        <div className={`min-w-0 flex flex-col border border-slate-200 rounded-2xl overflow-hidden ${showList ? "lg:col-span-2" : ""}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-xs text-slate-400 space-y-2">
              <Inbox size={24} className="text-slate-300" />
              <span>{d("Choose a conversation, or message a student.", "Elige una conversación o escribe a un estudiante.")}</span>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-black text-slate-800">{active.title}</p>
                <p className="text-[10px] font-bold text-orange-700">{active.subtitle}</p>
              </div>
              <div className="flex-1 p-4 space-y-3 max-h-[360px] min-h-[160px] overflow-y-auto bg-white">
                {active.messages.length === 0 && (
                  <p className="text-[11px] text-slate-400 font-semibold text-center py-6">
                    {d("No messages yet. Write the first one below.", "Aún no hay mensajes. Escribe el primero abajo.")}
                  </p>
                )}
                {active.messages.map((m) => {
                  const mine = m.sender_role === role;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${mine ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-800"}`}>
                        {m.subject && <p className="text-[11px] font-black mb-0.5">{m.subject}</p>}
                        <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        <p className={`text-[9px] mt-1 font-mono ${mine ? "text-teal-100" : "text-slate-400"}`}>
                          {formatTime(m.created_at)}
                          {mine && (m.read_at ? ` · ${d("Read", "Leído")}` : ` · ${d("Sent", "Enviado")}`)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEnd} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
                {error && <p role="alert" className="text-[11px] font-semibold text-rose-700">{error}</p>}
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={255}
                  placeholder={d("Subject (optional)", "Asunto (opcional)")}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-teal-600"
                />
                <div className="flex gap-2 items-end">
                  <textarea
                    required
                    rows={2}
                    value={body}
                    maxLength={5000}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={d("Write your message…", "Escribe tu mensaje…")}
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    className="px-4 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send size={13} />
                    <span>{sending ? d("Sending…", "Enviando…") : d("Send", "Enviar")}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Unread count for a tab badge, while the panel itself isn't on screen.
export function useUnreadMessages(role: "student" | "tutor") {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const incoming = role === "student" ? "tutor" : "student";
    const load = () =>
      fetch("/api/messages")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data)) setUnread(data.filter((m: PortalMessage) => m.sender_role === incoming && !m.read_at).length);
        })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [role]);
  return unread;
}
