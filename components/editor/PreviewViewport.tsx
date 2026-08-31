'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Maximize2 } from 'lucide-react';
import { useEditor } from './EditorContext';
import { cn } from '@/lib/utils';

export const PreviewViewport: React.FC<{ src?: string }> = ({ src: srcProp }) => {
  const { 
    currentTime, 
    duration, 
    isPlaying, 
    setIsPlaying, 
    setCurrentTime,
    currentVideoUrl
  } = useEditor();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isScrubbingRef = useRef(false);

  const src = srcProp || currentVideoUrl;

  useEffect(() => {
    if (!src || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(e => console.error("Playback failed", e));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, src]);

  useEffect(() => {
    if (!src || !videoRef.current || isScrubbingRef.current) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime, src]);

  const formatTimecode = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleScrub = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    const newTime = progress * duration;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [duration, setCurrentTime]);

  const onMouseDown = (e: React.MouseEvent) => {
    isScrubbingRef.current = true;
    setIsPlaying(false);
    handleScrub(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 && isScrubbingRef.current) {
      handleScrub(e.clientX);
    }
  };

  const onMouseUp = () => {
    isScrubbingRef.current = false;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#000] rounded-xl border border-[rgba(255,255,255,0.08)] shadow-[0_16_48px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center group"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          onTimeUpdate={(e) => {
            if (isPlaying && !isScrubbingRef.current) {
              setCurrentTime(e.currentTarget.currentTime);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
      ) : (
        <div className="text-white/10 text-9xl font-bold select-none">
          PROMETHEUS
        </div>
      )}

      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 rounded-lg bg-void/40 border border-white/10 hover:bg-white/5 transition-colors">
          <Maximize2 className="size-4 text-white/60" />
        </button>
      </div>

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-void/60 backdrop-blur-2xl border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        <div className="flex flex-col items-end">
          <span className="font-mono text-[11px] text-white tracking-widest leading-none">
            {formatTimecode(currentTime)}
          </span>
          <span className="font-mono text-[9px] text-white/30 uppercase tracking-tighter mt-1">
            {formatTimecode(duration)}
          </span>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
          className="size-12 rounded-full glass-panel bg-accent-cyan/10 border-accent-cyan/30 flex items-center justify-center text-accent-cyan hover:bg-accent-cyan/20 transition-all hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="size-6 fill-current" />
          ) : (
            <Play className="size-6 fill-current ml-1" />
          )}
        </button>

        <div className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-2">
           <div className="size-1.5 rounded-full bg-accent-green animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Live Preview</span>
        </div>
      </div>

      {/* Progress Bar (Subtle) */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
        <div 
          className="h-full bg-accent-cyan shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all duration-100"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
};
