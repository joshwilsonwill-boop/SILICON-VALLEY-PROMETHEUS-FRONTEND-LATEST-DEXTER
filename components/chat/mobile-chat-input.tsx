"use client";

import { LoaderCircle, Mic, Send } from "lucide-react";
import type { RefObject } from "react";

import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/use-voice-input";

import { StreamingControls } from "./streaming-controls";
import { VoiceWaveform } from "@/components/editor/voice-waveform";

export function MobileChatInput({
  inputRef,
  isStreaming,
  onChange,
  onSend,
  onStop,
  value,
}: {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  isStreaming: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  value: string;
}) {
  const voice = useVoiceInput({
    onTranscript: (text) => {
      const prefix = value.trim() ? `${value.trim()} ` : "";
      onChange(`${prefix}${text}`);
      inputRef?.current?.focus();
    },
  });

  return (
    <div className="relative z-20 shrink-0 bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-3">
      <div className="mx-auto flex min-h-14 w-full max-w-xl items-end gap-2 rounded-2xl border border-white/10 bg-black px-4 py-2.5 focus-within:border-white/20">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder={voice.state === "recording" ? "Listening…" : "Ask Prometheus..."}
          aria-label="Message Prometheus"
          className="max-h-24 min-h-8 flex-1 resize-none bg-transparent text-sm leading-6 text-white/88 outline-none placeholder:text-white/30"
        />
        {isStreaming ? (
          <StreamingControls isStreaming onStop={onStop} />
        ) : voice.state === "recording" ? (
          <VoiceWaveform
            getLevel={voice.getLevel}
            inputRef={inputRef}
            onStop={() => voice.stop()}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (voice.state === "transcribing") {
                  voice.stop();
                } else {
                  void voice.start();
                }
              }}
              disabled={isStreaming}
              aria-label="Record voice input"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20",
              )}
            >
              {voice.state === "transcribing" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Mic className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim()}
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </>
        )}
      </div>
      {voice.error ? (
        <p className="mx-auto mt-2 w-full max-w-xl text-xs text-red-300/80" role="alert">
          {voice.error}
        </p>
      ) : null}
    </div>
  );
}
