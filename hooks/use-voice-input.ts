"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceInputState = "idle" | "recording" | "transcribing" | "error";

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognizedTextRef = useRef<string>("");

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore recognition stop errors
      }
      recognitionRef.current = null;
    }
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
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
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
    recognizedTextRef.current = "";

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

      // 1. Initialize local browser SpeechRecognition for instant transcription
      if (typeof window !== "undefined") {
        const speechWindow = window as IWindowWithSpeech;
        const SpeechClass = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
        if (SpeechClass) {
          try {
            const recognition = new SpeechClass();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.onresult = (event: any) => {
              let finalTranscript = "";
              for (let i = 0; i < event.results.length; ++i) {
                finalTranscript += event.results[i][0].transcript;
              }
              if (finalTranscript.trim()) {
                recognizedTextRef.current = finalTranscript.trim();
              }
            };
            recognition.onerror = () => {
              // Ignore recognition error and fallback to server-side recording
            };
            recognition.start();
            recognitionRef.current = recognition;
          } catch {
            // SpeechRecognition initiation optional
          }
        }
      }

      const AudioContextConstructor =
        window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextConstructor) {
        const audioContext = new AudioContextConstructor();
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(() => {});
        }
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

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

          // Check if local speech recognition already got the text
          const localSpeechText = recognizedTextRef.current?.trim();

          try {
            const formData = new FormData();
            const extension = MimeType.includes("mp4") ? "m4a" : "webm";
            formData.append("audio", blob, `voice-${Date.now()}.${extension}`);
            
            const response = await fetch("/api/prometheus-chat/transcribe", {
              method: "POST",
              body: formData,
            });

            const payload = (await response.json().catch(() => null)) as {
              text?: string;
              error?: string;
              status?: string;
              transcriptId?: string;
            } | null;

            if (response.ok && payload?.text?.trim()) {
              onTranscript(payload.text.trim());
              setState("idle");
              return;
            }

            // Handle async polling if AssemblyAI returned status "processing"
            if (response.ok && payload?.status === "processing" && payload.transcriptId) {
              const transcriptId = payload.transcriptId;
              let polledText: string | null = null;

              for (let i = 0; i < 10; i += 1) {
                await new Promise((r) => setTimeout(r, 1000));
                const pollRes = await fetch(`/api/prometheus-chat/transcribe?transcriptId=${transcriptId}`);
                if (pollRes.ok) {
                  const pollData = (await pollRes.json().catch(() => null)) as {
                    status?: string;
                    text?: string;
                    error?: string;
                  } | null;

                  if (pollData?.text?.trim()) {
                    polledText = pollData.text.trim();
                    break;
                  }
                  if (pollData?.status === "error") {
                    throw new Error(pollData.error || "Transcription failed.");
                  }
                }
              }

              if (polledText) {
                onTranscript(polledText);
                setState("idle");
                return;
              }
            }

            // If server failed but we have local browser speech recognition result
            if (localSpeechText) {
              onTranscript(localSpeechText);
              setState("idle");
              return;
            }

            throw new Error(payload?.error || "Transcription failed.");
          } catch (transcribeError) {
            if (localSpeechText) {
              onTranscript(localSpeechText);
              setState("idle");
              return;
            }

            const raw = transcribeError instanceof Error ? transcribeError.message : "Transcription failed.";
            const message = /failed to fetch|networkerror|load failed|aborted/i.test(raw)
              ? "Could not reach the transcription service. Check your connection and try again."
              : raw;
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

  const getLevel = useCallback((): number | null => {
    const analyser = analyserRef.current;
    if (!analyser || !activeRef.current) return null;
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const value = (buffer[index] - 128) / 128;
      sum += value * value;
    }
    return Math.min(1, Math.sqrt(sum / buffer.length) * 3.2);
  }, []);

  return { state, error, start, stop, getLevel };
}