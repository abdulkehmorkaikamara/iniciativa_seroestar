import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
}

// Vercel's serverless functions cannot hold a WebSocket open, so the class
// chat polls the backend for messages newer than the last one it has seen.
const POLL_INTERVAL_MS = 2500;

const toMessage = (payload: any): LiveChatMessage => ({
  id: String(payload.id),
  sender: payload.sender_name,
  role: payload.sender_role,
  text: payload.message,
  time: new Date(payload.time_sent).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

export function useLiveChat(sessionId: string | number | null | undefined, enabled = true) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastIdRef = useRef(0);

  // Only polling advances the cursor: a sent message can have a higher id than
  // messages others posted since the last poll, which must still be fetched.
  const append = useCallback((incoming: any[], advanceCursor: boolean) => {
    if (!incoming.length) return;
    if (advanceCursor) {
      lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((item) => Number(item.id) || 0));
    }
    setMessages((current) => {
      const seen = new Set(current.map((message) => message.id));
      const fresh = incoming.map(toMessage).filter((message) => !seen.has(message.id));
      if (!fresh.length) return current;
      return [...current, ...fresh].sort((a, b) => Number(a.id) - Number(b.id));
    });
  }, []);

  useEffect(() => {
    setMessages([]);
    setError(null);
    lastIdRef.current = 0;
    if (!enabled || !sessionId) return;

    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/live-sessions/${sessionId}/chat?after_id=${lastIdRef.current}`);
        if (cancelled) return;
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.detail || "The class chat could not be loaded.");
          return;
        }
        setError(null);
        append(await response.json(), true);
      } catch {
        if (!cancelled) setError("The class chat could not be reached.");
      } finally {
        inFlight = false;
      }
    };

    poll();
    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId, enabled, append]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || !sessionId) return false;
    try {
      const response = await fetch(`/api/live-sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.detail || "Your message could not be sent.");
        return false;
      }
      setError(null);
      append([payload], false);
      return true;
    } catch {
      setError("Your message could not be sent.");
      return false;
    }
  }, [sessionId, append]);

  return { messages, error, send };
}
