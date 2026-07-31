import Link from 'next/link'
import { ArrowRight, Clapperboard, FolderOpen, Sparkles, Upload } from 'lucide-react'

const workflow = [
  {
    icon: Upload,
    step: '01',
    title: 'Create a project',
    text: 'Begin with your source footage and a clear direction for the edit. Prometheus keeps the brief connected to the project as you work.',
    href: '/projects',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Direct the first cut',
    text: 'Use Prometheus to shape pacing, captions, music, visual language, and delivery choices around the intended audience.',
    href: '/projects',
  },
  {
    icon: Clapperboard,
    step: '03',
    title: 'Refine in the editor',
    text: 'Review the sequence, adjust creative decisions, and use the assistant for focused changes without losing project context.',
    href: '/projects',
  },
  {
    icon: FolderOpen,
    step: '04',
    title: 'Prepare final delivery',
    text: 'Organize source media in the library, validate the export, and carry the finished work into your publishing workflow.',
    href: '/assets',
  },
]

export const metadata = {
  title: 'Docs | Prometheus Studio',
  description: 'A practical guide to projects, editing, media, and delivery in Prometheus Studio.',
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#08080a] px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/42">Prometheus Studio</p>
        <div className="mt-5 max-w-3xl">
          <h1 className="text-4xl font-medium leading-[1.06] tracking-normal text-white sm:text-6xl">Production handbook</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/58 sm:text-lg">
            A focused guide for turning raw footage and an editorial point of view into a finished, delivery-ready cut.
          </p>
        </div>

        <section className="mt-14 border-y border-white/[0.1] py-4" aria-label="Core workflow">
          {workflow.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.step}
                href={item.href}
                className="group grid gap-4 border-b border-white/[0.08] py-7 last:border-b-0 sm:grid-cols-[4rem_2.5rem_minmax(0,1fr)_auto] sm:items-start sm:gap-6"
              >
                <span className="text-sm tabular-nums text-white/34">{item.step}</span>
                <Icon className="size-5 text-white/64" strokeWidth={1.6} />
                <span>
                  <span className="block text-xl font-medium text-white/92">{item.title}</span>
                  <span className="mt-2 block max-w-2xl text-sm leading-6 text-white/52">{item.text}</span>
                </span>
                <ArrowRight className="mt-1 size-5 text-white/34 transition-transform group-hover:translate-x-1 group-hover:text-white/80" />
              </Link>
            )
          })}
        </section>

        <section className="mt-14 max-w-3xl border-l border-white/[0.16] pl-5">
          <h2 className="text-xl font-medium text-white/92">Need help in the moment?</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Open the help control from any screen to ask Prometheus about the workspace you are in, reach support, or send a product request.
          </p>
        </section>
      </div>
    </main>
  )
}
