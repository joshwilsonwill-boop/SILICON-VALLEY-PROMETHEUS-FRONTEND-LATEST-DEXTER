'use client'

import React, { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { 
  Zap, 
  BrainCircuit, 
  Settings2, 
  Sparkles, 
  Play, 
  Activity,
  Cpu,
  Layers,
  Wand2,
  ChevronRight
} from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import { useDeviceTier } from '@/hooks/useDeviceTier'

interface NodeProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  active?: boolean
  className?: string
}

const Node: React.FC<NodeProps> = ({ title, icon: Icon, children, active, className }) => (
  <div className={cn("motion-node", active && "active", className)}>
    <div className="flex items-center gap-2 mb-3">
      <div className={cn(
        "p-1.5 rounded-lg bg-white/5 border border-white/10",
        active && "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5"
      )}>
        <Icon className="size-3.5" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{title}</span>
    </div>
    {children}
  </div>
)

export const MotionBrainCanvas: React.FC = () => {
  const isProcessing = true // Mock state
  const tier = useDeviceTier()
  const isLowTier = tier === 'low'

  useEffect(() => {
    if (isLowTier) return

    gsap.fromTo(".connection-line", 
      { strokeDashoffset: 200 },
      { strokeDashoffset: 0, duration: 7.2, ease: "sine.inOut", stagger: 0.38, repeat: -1 }
    )
    
    gsap.to(".node-brain", {
      boxShadow: "0 0 24px rgba(0,240,255,0.28)",
      duration: 4.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })

    return () => {
      gsap.killTweensOf(".connection-line")
      gsap.killTweensOf(".node-brain")
    }
  }, [isLowTier])

  return (
    <div className="node-canvas h-full flex flex-col items-center">
      {/* Background SVG Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <path 
          className="connection-line" 
          d="M 100 150 C 150 150, 150 300, 200 300" 
          fill="none" 
          stroke="rgba(0,240,255,0.10)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path 
          className="connection-line" 
          d="M 100 450 C 150 450, 150 300, 200 300" 
          fill="none" 
          stroke="rgba(0,240,255,0.10)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path 
          className="connection-line" 
          d="M 280 300 L 340 300" 
          fill="none" 
          stroke="rgba(0,240,255,0.10)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      </svg>

      <div className="relative z-10 w-full h-full p-6 flex flex-col gap-6 overflow-y-auto [scrollbar-width:none]">
        {/* Input Nodes */}
        <div className="flex flex-col gap-4 items-start">
          <Node title="Source Vector" icon={Activity} active>
            <div className="text-[10px] text-white/40 leading-relaxed">
              4K ProRes • 24fps • Rec.709<br/>
              Detected 12 semantic anchors
            </div>
          </Node>
          
          <Node title="Audio Print" icon={Cpu}>
            <div className="text-[10px] text-white/40 leading-relaxed">
              Stereo 48kHz • Dialogue Heavy<br/>
              Noise Floor: -42dB
            </div>
          </Node>
        </div>

        {/* Central Intelligence Node */}
        <div className="flex justify-center my-4">
          <div className="node-brain w-20 h-20 rounded-2xl bg-void border-2 border-accent-cyan flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            {isProcessing ? (
              <InlineLoadingAnimation size={40} label="Processing motion analysis" />
            ) : (
              <BrainCircuit className="size-10 text-accent-cyan" />
            )}
          </div>
        </div>

        {/* Processing Steps */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-accent-cyan/30 transition-colors">
             <div className="size-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                <Settings2 className="size-4" />
             </div>
             <div className="flex-1">
                <div className="text-[11px] font-bold text-white/80">Neural Grade</div>
                <div className="text-[9px] text-white/40">Balancing midtones & shadows</div>
             </div>
             <ChevronRight className="size-3 text-white/20 group-hover:text-accent-cyan transition-colors" />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-accent-cyan/30 transition-colors">
             <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Sparkles className="size-4" />
             </div>
             <div className="flex-1">
                <div className="text-[11px] font-bold text-white/80">Cinematic Motion</div>
                <div className="text-[9px] text-white/40">Applying 2.4:1 letterbox & drift</div>
             </div>
             <ChevronRight className="size-3 text-white/20 group-hover:text-accent-cyan transition-colors" />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-accent-cyan/30 transition-colors">
             <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Zap className="size-4" />
             </div>
             <div className="flex-1">
                <div className="text-[11px] font-bold text-white/80">Rhythmic Cut</div>
                <div className="text-[9px] text-white/40">Matching transitions to beat</div>
             </div>
             <ChevronRight className="size-3 text-white/20 group-hover:text-accent-cyan transition-colors" />
          </div>
        </div>

        {/* Final Output Node */}
        <div className="mt-auto pt-6 flex justify-end">
          <Node title="Relay Package" icon={Layers} className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40">Ready for review</span>
              <button className="px-3 py-1 rounded-full bg-accent-cyan text-void text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform">
                Stage
              </button>
            </div>
          </Node>
        </div>
      </div>
    </div>
  )
}
