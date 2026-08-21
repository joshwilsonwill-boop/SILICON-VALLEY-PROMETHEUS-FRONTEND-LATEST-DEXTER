"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceInputState = "idle" | "recording" | "transcribing" | "error";

export function useVoiceInput({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop failures during cleanup.
      }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setState("idle");
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);
    setState("recording");

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      activeRef.current = true;
      chunksRef.current = [];

      const MimeType = (() => {
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
        return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      })();

      const recorder = new MediaRecorder(stream, MimeType ? { mimeType: MimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void (async () => {
          const blob = new Blob(chunksRef.current, {
            type: MimeType || "audio/webm",
          });
          chunksRef.current = [];
          if (!activeRef.current || blob.size < 1024) {
            cleanup();
            setState("idle");
            return;
          }
          setState("transcribing");
          try {
            const formData = new FormData();
            const extension = MimeType.includes("mp4") ? "m4a" : "webm";
            formData.append("audio", blob, `voice-${Date.now()}.${extension}`);
            const response = await fetch("/api/prometheus-chat/transcribe", {
              method: "POST",
              body: formData,
            });
            const payload = await response.json().catch(() => null) as { text?: string; error?: string } | null;
            if (!response.ok || !payload?.text?.trim()) {
              throw new Error(payload?.error || "Transcription failed.");
            }
            onTranscript(payload.text.trim());
            setState("idle");
          } catch (transcribeError) {
            const message = transcribeError instanceof Error ? transcribeError.message : "Transcription failed.";
            setError(message);
            setState("error");
          } finally {
            cleanup();
          }
        })();
      };
      recorder.start();
    } catch (recordingError) {
      const message = recordingError instanceof Error ? recordingError.message : "Unable to access the microphone.";
      setError(message);
      setState("error");
      cleanup();
    }
  }, [cleanup, onTranscript]);

  return { state, error, start, stop };
}