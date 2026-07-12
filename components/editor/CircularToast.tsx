'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { useEditor } from './EditorContext'
import { Check, AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

export const CircularToast: React.FC = () => {
  const { uploadTasks, updateTask, removeTask } = useEditor()

  return (
    <div className="fixed top-16 right-4 z-[80] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {uploadTasks.map((task) => (
          <ToastItem key={task.id} task={task} onRetry={() => updateTask(task.id, { status: 'uploading', progress: 0 })} onDismiss={() => removeTask(task.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

const ToastItem: React.FC<{
  task: ReturnType<typeof useEditor>['uploadTasks'][0]
  onRetry: () => void
  onDismiss: () => void
}> = ({ task, onDismiss, onRetry }) => {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (task.status === 'complete') {
      const t = setTimeout(() => {
        setExiting(true)
        setTimeout(onDismiss, 400)
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [task.status, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: exiting ? 0 : 1, x: exiting ? 40 : 0, scale: exiting ? 0.9 : 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      className="pointer-events-auto w-[280px] rounded-xl bg-[#0c0c10]/90 backdrop-blur-[24px] border border-white/[0.08] shadow-2xl p-3 flex items-center gap-3"
    >
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
        {task.status === 'uploading' ? (
          <InlineLoadingAnimation
            size={44}
            label={`Uploading to ${task.destination}: ${Math.floor(task.progress)}% complete`}
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          {task.status === 'complete' && <Check size={16} className="text-emerald-400" />}
          {task.status === 'error' && <AlertCircle size={16} className="text-rose-400" />}
          {task.status === 'paused' && <WifiOff size={14} className="text-white/60" />}
          {task.status === 'uploading' && <span className="text-[10px] font-mono font-bold text-cyan-400">{Math.floor(task.progress)}</span>}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white/80 truncate">
          {task.status === 'complete' ? 'Upload Successful' : task.status === 'error' ? 'Upload Failed' : task.status === 'paused' ? 'Network Issue' : `Uploading to ${task.destination}`}
        </div>
        <div className="text-[10px] text-white/40 mt-0.5 leading-tight">
          {task.status === 'paused' && 'Will resume when connection returns...'}
          {task.status === 'uploading' && task.networkState === 'poor' && 'Slow network detected...'}
          {task.status === 'complete' && 'Your video is ready'}
          {task.status === 'error' && 'Tap retry to continue'}
        </div>
      </div>
      {task.status === 'error' && (
        <button onClick={onRetry} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors active:scale-95 pointer-events-auto">
          <RefreshCw size={14} className="text-white/60" />
        </button>
      )}
    </motion.div>
  )
}
