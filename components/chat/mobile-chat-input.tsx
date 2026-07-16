"use client";

import { Code2, Image, ImagePlus, LayoutPanelTop, Mic, Palette, Plus, Rocket, Send, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { describeAttachment, type ChatAttachmentKind } from '@/lib/editor/chat-attachment';

import { StreamingControls } from "./streaming-controls";

const actionItems = [
  { icon: Image, label: "Image" },
  { icon: Video, label: "Video" },
  { icon: Code2, label: "Generate Code", prompt: "Generate code for: " },
  { icon: Rocket, label: "Launch App", prompt: "Launch app: " },
  { icon: LayoutPanelTop, label: "UI Components", prompt: "UI component: " },
  { icon: Palette, label: "Theme Ideas", prompt: "Theme idea: " },
  { icon: ImagePlus, label: "Image Assets", prompt: "Image asset: " },
];

export function MobileChatInput({
  isListening,
  isStreaming,
  onChange,
  onSend,
  onStop,
  onVoice,
  value,
}: {
  isListening: boolean;
  isStreaming: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onVoice: () => void;
  value: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; kind: ChatAttachmentKind; previewUrl: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (attachment) URL.revokeObjectURL(attachment.previewUrl) }, [attachment])

  const selectAttachment = (file: File | undefined) => {
    if (!file) return
    const validation = describeAttachment(file)
    if (!validation.valid) { window.alert(validation.message); return }
    if (attachment) URL.revokeObjectURL(attachment.previewUrl)
    setAttachment({ file, kind: validation.kind, previewUrl: URL.createObjectURL(file) })
    setExpanded(false)
  }

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-black/20 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <input ref={imageInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => selectAttachment(event.currentTarget.files?.[0])} />
      <input ref={videoInputRef} type="file" accept="video/*" className="sr-only" onChange={(event) => selectAttachment(event.currentTarget.files?.[0])} />
      {attachment ? <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2"><div className="size-12 overflow-hidden rounded bg-black">{attachment.kind === 'image' ? <img src={attachment.previewUrl} alt="Selected image" className="size-full object-cover" /> : <video src={attachment.previewUrl} className="size-full object-cover" muted />}</div><span className="min-w-0 flex-1 truncate text-xs text-white/65">{(attachment.file.size / (1024 * 1024)).toFixed(1)} MB</span><button type="button" aria-label="Remove attachment" onClick={() => { URL.revokeObjectURL(attachment.previewUrl); setAttachment(null) }}>×</button></div> : null}
      {expanded ? <div className="mb-3 grid grid-cols-4 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">{actionItems.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" onClick={() => { if (item.label === "Image") imageInputRef.current?.click(); else if (item.label === "Video") videoInputRef.current?.click(); else { onChange(`${item.prompt}${value}`); setExpanded(false); } }} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg text-[10px] text-white/60 hover:bg-white/[0.08] hover:text-white"><Icon className="size-4" />{item.label}</button>; })}</div> : null}
      <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
        <button type="button" onClick={() => setExpanded((open) => !open)} className={cn("grid size-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white", expanded && "bg-white text-black")} aria-label="More actions"><Plus className={cn("size-4 transition-transform", expanded && "rotate-45")} /></button>
        <button type="button" onClick={onVoice} className={cn("relative grid size-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white", isListening && "bg-red-500 text-white")} aria-label="Voice input"><Mic className="size-4" />{isListening ? <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-red-300" /> : null}</button>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} rows={1} placeholder={isListening ? "Listening..." : "Ask Prometheus..."} className="max-h-24 min-h-8 flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-white/35" />
        {isStreaming ? <StreamingControls isStreaming onStop={onStop} /> : <button type="button" onClick={onSend} disabled={!value.trim()} className="grid size-8 place-items-center rounded-full bg-white text-black disabled:opacity-30" aria-label="Send message"><Send className="size-3.5" /></button>}
      </div>
    </div>
  );
}
