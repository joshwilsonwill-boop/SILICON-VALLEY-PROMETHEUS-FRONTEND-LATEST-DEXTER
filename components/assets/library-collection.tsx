'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, LibraryBig } from 'lucide-react'
import Image from 'next/image'

import { LIBRARY_CREATOR_CARDS } from '@/components/assets/cinematic-library'

const CREATOR_IMAGE_POSITIONS = ['62% 24%', '50% 16%', '50% 18%', '50% 18%', '50% 18%', '50% 18%', '50% 16%']

export function LibraryCollection({ onSelect }: { onSelect: (showcaseId: string) => void }) {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section className="relative min-h-full overflow-hidden bg-black text-white" aria-labelledby="creator-library-title">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'linear-gradient(rgba(52,255,137,0.026) 1px, transparent 1px), linear-gradient(90deg, rgba(52,255,137,0.026) 1px, transparent 1px), radial-gradient(circle, rgba(72,255,151,0.16) 0.7px, transparent 0.8px)',
          backgroundSize: '72px 72px, 72px 72px, 5px 5px',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#3cff8f]/35" />

      <div className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#55ff9b]/15 pb-5">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center border border-[#55ff9b]/25 bg-[#07120b] text-[#63ffa4]">
              <LibraryBig className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#63ffa4]/64">Prometheus archive</p>
              <h1 id="creator-library-title" className="mt-1 text-2xl font-semibold text-white sm:text-[2rem]">
                Creator library
              </h1>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-lg text-[#63ffa4]">{String(LIBRARY_CREATOR_CARDS.length).padStart(2, '0')}</div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/38">Active archives</div>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {LIBRARY_CREATOR_CARDS.map((creator, index) => (
            <motion.button
              key={creator.id}
              type="button"
              onClick={() => onSelect(`uploads_${index}`)}
              className="group relative aspect-[3/4] min-w-0 overflow-hidden rounded-[4px] border border-white/10 bg-[#030503] text-left shadow-[0_20px_45px_-30px_rgba(0,0,0,1)] outline-none transition-colors hover:border-[#55ff9b]/55 focus-visible:border-[#55ff9b] focus-visible:ring-2 focus-visible:ring-[#55ff9b]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.55, delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }
              }
              whileHover={reduceMotion ? undefined : { y: -4 }}
              aria-label={`Open ${creator.name} archive`}
            >
              <Image
                src={index === 0 ? '/library/hormozi-hero.png' : creator.image}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 639px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 20vw, 190px"
                className="absolute inset-0 h-full w-full object-cover grayscale-[0.22] transition duration-500 group-hover:scale-[1.035] group-hover:grayscale-0"
                style={{ objectPosition: CREATOR_IMAGE_POSITIONS[index] ?? '50% 18%' }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_24%,rgba(0,0,0,0.2)_48%,rgba(0,0,0,0.96)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(72,255,151,0.12),transparent_32%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
                <span className="font-mono text-[9px] tracking-[0.18em] text-white/52">{String(index + 1).padStart(2, '0')}</span>
                <span className="grid size-7 place-items-center border border-white/15 bg-black/45 text-white/66 backdrop-blur-sm transition-colors group-hover:border-[#55ff9b]/45 group-hover:text-[#63ffa4]">
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="truncate text-[9px] uppercase tracking-[0.2em] text-[#63ffa4]/72">{creator.designation}</div>
                <div className="mt-1.5 text-sm font-semibold leading-tight text-white sm:text-[15px]">{creator.name}</div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-7 text-[9px] uppercase tracking-[0.22em] text-white/32">
          <span className="h-px w-8 bg-[#55ff9b]/35" />
          Select a creator to enter the archive
        </div>
      </div>
    </section>
  )
}
