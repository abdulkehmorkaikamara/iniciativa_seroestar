import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

interface AdaptiveLessonPlayerProps {
  src: string;
  poster?: string;
  onProgress?: (percentWatched: number, lastPositionSeconds: number, completed: boolean) => void;
}

export default function AdaptiveLessonPlayer({ src, poster, onProgress }: AdaptiveLessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;
    if (src.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    return () => {
      hls?.destroy();
    };
  }, [src]);

  const handleProgress = () => {
    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;
    const percent = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
    onProgress?.(percent, Math.round(video.currentTime), percent >= 95);
  };

  return (
    <video
      ref={videoRef}
      controls
      poster={poster}
      onTimeUpdate={handleProgress}
      onEnded={() => {
        const video = videoRef.current;
        onProgress?.(100, Math.round(video?.duration || 0), true);
      }}
      className="w-full rounded-xl bg-slate-950 border border-slate-200"
    />
  );
}
