"use client";

import { useCallback, useRef, useState } from "react";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

export function useVoiceInput(onTranscript: (text: string) => void, onComplete?: () => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldAutoSendRef = useRef(false);
  const transcriptRef = useRef("");
  const onCompleteRef = useRef(onComplete);
  const onTranscriptRef = useRef(onTranscript);

  onCompleteRef.current = onComplete;
  onTranscriptRef.current = onTranscript;

  const stopListening = useCallback(() => {
    shouldAutoSendRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    transcriptRef.current = "";
    shouldAutoSendRef.current = true;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join("").trim();
      transcriptRef.current = transcript;
      if (transcript) onTranscriptRef.current(transcript);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (shouldAutoSendRef.current && transcriptRef.current) onCompleteRef.current?.();
      shouldAutoSendRef.current = false;
    };
    recognition.onerror = () => {
      shouldAutoSendRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    return true;
  }, []);

  return { isListening, startListening, stopListening };
}
