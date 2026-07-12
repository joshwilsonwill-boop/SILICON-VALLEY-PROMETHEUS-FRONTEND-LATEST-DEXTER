'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Film, 
  Music, 
  Type, 
  Box, 
  Search, 
  Clock, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  GripVertical
} from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'

interface MediaItem {
  id: string
  type: 'clip' | 'audio' | 'text' | 'asset'
  name: string
  duration?: string
  thumbnail?: string
}

const MOCK_MEDIA: MediaItem[] = [
  { id: '1', type: 'clip', name: 'Raw Interview A.mp4', duration: '12:40', thumbnail: 'https://images.unsplash.com/photo-1492691523567-f611755a9ff4?q=80&w=2670&auto=format&fit=crop' },
  { id: '2', type: 'clip', name: 'B-Roll Forest.mp4', duration: '05:12', thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop' },
  { id: '3', type: 'audio', name: 'Background Theme.wav', duration: '03:45' },
  { id: '4', type: 'text', name: 'Headline Bold' },
  { id: '5', type: 'asset', name: 'Logo Vector.svg' },
]

export const MediaBin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clips' | 'audio' | 'text' | 'assets'>('clips')
  const [search, setSearch] = useState('')
  const [width, setWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)

  const tabs = [
    { id: 'clips', label: 'Clips', icon: Film },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'assets', label: 'Assets', icon: Box },
  ] as const

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true)
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResizing)
  }

  const handleResize = (e: MouseEvent) => {
    const newWidth = Math.min(Math.max(e.clientX, 200), 400)
    setWidth(newWidth)
  }

  const stopResizing = () => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResizing)
  }

  return (
    <div 
      className="h-full flex relative"
      style={{ width: `${width}px` }}
    >
      <div className="flex-1 flex flex-col glass-panel bg-void/40 border-y-0 border-l-0 rounded-none overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/20 group-focus-within:text-accent-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent-cyan/30 focus:bg-accent-cyan/[0.02] transition-all"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 py-3 transition-all relative",
                activeTab === tab.id ? "text-white" : "text-white/30 hover:text-white/60"
              )}
            >
              <tab.icon className="size-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan shadow-[0_0_10px_var(--accent-cyan)]" 
                />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence mode="popLayout">
            {MOCK_MEDIA.filter(m => m.type === (activeTab === 'clips' ? 'clip' : activeTab === 'audio' ? 'audio' : activeTab === 'text' ? 'text' : 'asset')).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-grab active:cursor-grabbing"
              >
                {item.thumbnail ? (
                  <div className="size-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    <img src={item.thumbnail} alt={item.name} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="size-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                    {item.type === 'audio' ? <Music className="size-4 text-accent-green" /> : item.type === 'text' ? <Type className="size-4 text-accent-amber" /> : <Box className="size-4 text-chrome-dim" />}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-white/80 truncate">{item.name}</div>
                  {item.duration && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-white/30">
                      <Clock className="size-2.5" />
                      {item.duration}
                    </div>
                  )}
                </div>

                <button className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-white transition-all">
                  <MoreVertical className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Status */}
        <div className="p-3 border-t border-white/5 bg-black/20 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/20">
          <span>Storage: 4.2GB / 100GB</span>
          <span className="inline-flex items-center gap-1.5 text-accent-cyan">
            <InlineLoadingAnimation size={12} label="Syncing media assets" />
            Syncing...
          </span>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={startResizing}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-accent-cyan/40 transition-colors z-20 flex items-center justify-center",
          isResizing && "bg-accent-cyan/60"
        )}
      >
         <div className="h-8 w-[2px] rounded-full bg-white/10" />
      </div>
    </div>
  )
}
