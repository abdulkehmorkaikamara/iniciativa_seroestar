import React, { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";

interface LiveVideoRoomProps {
  roomUrl: string;
  token: string;
  userName: string;
  owner?: boolean;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
}

export default function LiveVideoRoom({ roomUrl, token, userName, owner = false, onJoined, onLeft, onError }: LiveVideoRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callFrameRef = useRef<any>(null);
  const onJoinedRef = useRef(onJoined);
  const onLeftRef = useRef(onLeft);
  const onErrorRef = useRef(onError);
  const [status, setStatus] = useState("Connecting to live room...");

  useEffect(() => {
    onJoinedRef.current = onJoined;
    onLeftRef.current = onLeft;
    onErrorRef.current = onError;
  }, [onJoined, onLeft, onError]);

  useEffect(() => {
    if (!containerRef.current || !roomUrl) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        minHeight: "320px",
        border: "0",
        borderRadius: "16px",
      },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    callFrameRef.current = callFrame;

    const handleJoined = async () => {
      setStatus("Connected");
      onJoinedRef.current?.();
      if (owner) {
        try {
          await callFrame.startRecording({ layout: { preset: "default" } });
        } catch (err) {
          console.warn("Daily cloud recording did not start automatically.", err);
        }
      }
    };

    const handleLeft = () => {
      setStatus("Left room");
      onLeftRef.current?.();
    };

    const handleError = (event: any) => {
      const message = event?.errorMsg || event?.error?.msg || "Unable to join the live room.";
      setStatus(message);
      onErrorRef.current?.(message);
    };

    callFrame.on("joined-meeting", handleJoined);
    callFrame.on("left-meeting", handleLeft);
    callFrame.on("error", handleError);

    callFrame.join({ url: roomUrl, token, userName }).catch((err: any) => {
      const message = err?.message || "Unable to join the live room.";
      setStatus(message);
      onErrorRef.current?.(message);
    });

    return () => {
      const frame = callFrameRef.current;
      callFrameRef.current = null;
      if (frame) {
        if (owner) {
          frame.stopRecording?.().catch(() => {});
        }
        frame.off("joined-meeting", handleJoined);
        frame.off("left-meeting", handleLeft);
        frame.off("error", handleError);
        frame.destroy();
      }
    };
  }, [roomUrl, token, userName, owner]);

  return (
    <div className="w-full h-full min-h-[320px] relative">
      <div ref={containerRef} className="w-full h-full min-h-[320px]" />
      {status !== "Connected" && (
        <div className="absolute left-4 bottom-4 bg-slate-900/80 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg">
          {status}
        </div>
      )}
    </div>
  );
}
