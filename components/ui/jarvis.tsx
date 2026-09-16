'use client';

import * as React from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
  type HTMLMotionProps,
  type SpringOptions,
} from 'motion/react';

import { cn } from '@/lib/utils';

type JarvisFocusOptions = {
  /** Thought rendered next to the cursor for this step. */
  thought?: string | null;
  /** Fire a click pulse the instant the cursor arrives at the target. */
  click?: boolean;
  /** Override glide duration (ms). Defaults to a distance-derived timing. */
  duration?: number;
  /** Keep the cursor in a contemplative drift around the target after arrival. */
  linger?: boolean;
  /** Invoked on the exact frame the glide completes — downstream motion chains off this. */
  onArrive?: () => void;
};

type JarvisMotionContextType = {
  cursorPos: { x: number; y: number };
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
};

type JarvisAgentContextType = {
  /** True while the agent (not the physical mouse) drives the cursor. */
  agentActive: boolean;
  /** Current agent thought, or null. */
  thought: string | null;
  /** True for the click-pulse window after an agent arrival. */
  isClicking: boolean;
  focusElement: (el: HTMLElement | null, options?: JarvisFocusOptions) => void;
  say: (thought: string | null) => void;
  release: () => void;
};

const JarvisMotionContext = React.createContext<
  JarvisMotionContextType | undefined
>(undefined);

const JarvisAgentContext = React.createContext<
  JarvisAgentContextType | undefined
>(undefined);

/** High-frequency channel (per-frame cursor position). Consumers must be small. */
const useJarvis = (): JarvisMotionContextType => {
  const context = React.useContext(JarvisMotionContext);
  if (!context) {
    throw new Error('useJarvis must be used within a JarvisProvider');
  }
  return context;
};

/** Low-frequency channel (agent steps/thoughts). Safe for page-level consumers. */
const useJarvisAgent = (): JarvisAgentContextType => {
  const context = React.useContext(JarvisAgentContext);
  if (!context) {
    throw new Error('useJarvisAgent must be used within a JarvisProvider');
  }
  return context;
};

/** Imperatively toggles the host's native cursor; kept out of component bodies
 *  so React's ref-immutability lint can't mistake DOM chrome for state. */
function applyNativeCursor(node: HTMLElement | null, hidden: boolean) {
  if (!node) return;
  const style = node.style;
  style.cursor = hidden ? 'none' : 'default';
}

type JarvisProviderProps = React.ComponentProps<'div'>;

function JarvisProvider({ ref, children, ...props }: JarvisProviderProps) {
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = React.useState(false);
  const [agentActive, setAgentActive] = React.useState(false);
  const [thought, setThought] = React.useState<string | null>(null);
  const [isClicking, setIsClicking] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cursorRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const cursorPosRef = React.useRef({ x: 0, y: 0 });
  const agentActiveRef = React.useRef(false);
  const frameRef = React.useRef(0);
  const beatRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    cursorPosRef.current = cursorPos;
  }, [cursorPos]);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current.parentElement;
    if (!parent) return;

    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (agentActiveRef.current) return;
      const rect = parent.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsActive(true);
    };
    const handleMouseLeave = () => {
      if (!agentActiveRef.current) setIsActive(false);
    };

    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(frameRef.current);
      window.clearTimeout(beatRef.current);
    };
  }, []);

  React.useEffect(() => {
    applyNativeCursor(containerRef.current?.parentElement ?? null, isActive);
  }, [isActive]);

  const release = React.useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    window.clearTimeout(beatRef.current);
    agentActiveRef.current = false;
    setAgentActive(false);
    setThought(null);
    setIsClicking(false);
  }, []);

  const focusElement = React.useCallback(
    (el: HTMLElement | null, options: JarvisFocusOptions = {}) => {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      cancelAnimationFrame(frameRef.current);
      window.clearTimeout(beatRef.current);

      // Measured at the exact millisecond of dispatch — the causal anchor.
      const parentRect = parent.getBoundingClientRect();
      const elRect = el?.getBoundingClientRect();
      const target = elRect
        ? {
            x: elRect.left + elRect.width / 2 - parentRect.left,
            y: elRect.top + elRect.height / 2 - parentRect.top,
          }
        : cursorPosRef.current;

      const start = { ...cursorPosRef.current };
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      const duration =
        options.duration ??
        Math.min(1200, Math.max(380, distance * 2.1));

      agentActiveRef.current = true;
      setAgentActive(true);
      setIsActive(true);
      if (options.thought !== undefined) setThought(options.thought);

      const { click, linger, onArrive } = options;
      const t0 = performance.now();
      let arrived = false;

      const glideFrame = (now: number) => {
        const progress = Math.min(1, (now - t0) / duration);
        // cubic-bezier-ish settle: 1 - (1 - p)^4
        const eased = 1 - (1 - progress) ** 4;
        setCursorPos({
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
        });

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(glideFrame);
          return;
        }

        if (!arrived) {
          arrived = true;
          if (click) {
            setIsClicking(true);
            window.setTimeout(() => setIsClicking(false), 280);
          }
          onArrive?.();
        }

        if (linger) {
          // Contemplative drift around the anchor while the agent thinks.
          const anchor = { ...target };
          const driftFrame = (inner: number) => {
            const t = (inner - t0) / 1000;
            setCursorPos({
              x: anchor.x + Math.sin(t * 1.9) * 7 + Math.sin(t * 4.7) * 2.4,
              y: anchor.y + Math.cos(t * 1.4) * 5 + Math.sin(t * 3.3) * 1.8,
            });
            frameRef.current = requestAnimationFrame(driftFrame);
          };
          frameRef.current = requestAnimationFrame(driftFrame);
        } else {
          // Single-action step: hold the beat, then hand control back to the mouse.
          beatRef.current = window.setTimeout(release, 1400);
        }
      };

      frameRef.current = requestAnimationFrame(glideFrame);
    },
    [release],
  );

  const say = React.useCallback((nextThought: string | null) => {
    setThought(nextThought);
  }, []);

  const motionValue = React.useMemo(
    () => ({ cursorPos, isActive, containerRef, cursorRef }),
    [cursorPos, isActive],
  );

  const agentValue = React.useMemo(
    () => ({
      agentActive,
      thought,
      isClicking,
      focusElement,
      say,
      release,
    }),
    [agentActive, thought, isClicking, focusElement, say, release],
  );

  return (
    <JarvisAgentContext.Provider value={agentValue}>
      <JarvisMotionContext.Provider value={motionValue}>
        <div ref={containerRef} data-slot="jarvis-provider" {...props}>
          {children}
        </div>
      </JarvisMotionContext.Provider>
    </JarvisAgentContext.Provider>
  );
}

type JarvisProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
};

function Jarvis({ ref, children, className, style, ...props }: JarvisProps) {
  const { cursorPos, isActive, cursorRef } = useJarvis();
  React.useImperativeHandle(ref, () => cursorRef.current as HTMLDivElement);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  React.useEffect(() => {
    x.set(cursorPos.x);
    y.set(cursorPos.y);
  }, [cursorPos, x, y]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={cursorRef}
          data-slot="jarvis"
          className={cn(
            'transform-[translate(-50%,-50%)] pointer-events-none z-[9999] absolute',
            className,
          )}
          style={{ top: y, left: x, ...style }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Align =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'right'
  | 'center';

type JarvisFollowProps = HTMLMotionProps<'div'> & {
  sideOffset?: number;
  align?: Align;
  transition?: SpringOptions;
  children: React.ReactNode;
};

function JarvisFollow({
  ref,
  sideOffset = 15,
  align = 'bottom-right',
  children,
  className,
  style,
  transition = { stiffness: 500, damping: 50, bounce: 0 },
  ...props
}: JarvisFollowProps) {
  const { cursorPos, isActive, cursorRef } = useJarvis();
  const cursorFollowRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(
    ref,
    () => cursorFollowRef.current as HTMLDivElement,
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, transition);
  const springY = useSpring(y, transition);

  const calculateOffset = React.useCallback(() => {
    const rect = cursorFollowRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;

    let newOffset;

    switch (align) {
      case 'center':
        newOffset = { x: width / 2, y: height / 2 };
        break;
      case 'top':
        newOffset = { x: width / 2, y: height + sideOffset };
        break;
      case 'top-left':
        newOffset = { x: width + sideOffset, y: height + sideOffset };
        break;
      case 'top-right':
        newOffset = { x: -sideOffset, y: height + sideOffset };
        break;
      case 'bottom':
        newOffset = { x: width / 2, y: -sideOffset };
        break;
      case 'bottom-left':
        newOffset = { x: width + sideOffset, y: -sideOffset };
        break;
      case 'bottom-right':
        newOffset = { x: -sideOffset, y: -sideOffset };
        break;
      case 'left':
        newOffset = { x: width + sideOffset, y: height / 2 };
        break;
      case 'right':
        newOffset = { x: -sideOffset, y: height / 2 };
        break;
      default:
        newOffset = { x: 0, y: 0 };
    }

    return newOffset;
  }, [align, sideOffset]);

  React.useEffect(() => {
    const offset = calculateOffset();
    const cursorRect = cursorRef.current?.getBoundingClientRect();
    const cursorWidth = cursorRect?.width ?? 20;
    const cursorHeight = cursorRect?.height ?? 20;

    x.set(cursorPos.x - offset.x + cursorWidth / 2);
    y.set(cursorPos.y - offset.y + cursorHeight / 2);
  }, [calculateOffset, cursorPos, cursorRef, x, y]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={cursorFollowRef}
          data-slot="jarvis-follow"
          className={cn(
            'transform-[translate(-50%,-50%)] pointer-events-none z-[9998] absolute',
            className,
          )}
          style={{ top: springY, left: springX, ...style }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export {
  JarvisProvider,
  Jarvis,
  JarvisFollow,
  useJarvis,
  useJarvisAgent,
  type JarvisMotionContextType,
  type JarvisAgentContextType,
  type JarvisProviderProps,
  type JarvisProps,
  type JarvisFollowProps,
  type JarvisFocusOptions,
  type Align,
};
