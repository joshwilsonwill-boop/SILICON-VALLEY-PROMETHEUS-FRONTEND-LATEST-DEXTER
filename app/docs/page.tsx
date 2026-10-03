import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Docs | Prometheus Studio',
  description: 'Practical instructions for starting a project, editing footage, using the assistant, and reviewing exports.',
  alternates: { canonical: '/docs' },
}

const chapters = [
  { id: 'getting-started', title: 'Start your first project', steps: [
    'Create an account or log in. Your projects and media belong to the signed-in account.',
    'From the Studio, select Upload source and choose a video file. Wait for the upload to finish before continuing. If an upload fails, follow the error message and retry.',
    'Describe the result you want in the composer, select a direction, and submit. Open the created project from Projects to continue working.',
    'If the editor has no source footage, add source media before requesting edits. Review the preview and timeline before applying changes.',
  ] },
  { id: 'editing', title: 'Review and refine an edit', steps: [
    'Open a project from Projects. Use preview playback to review the sequence and the timeline to locate the section you want to change.',
    'Select the relevant clip or track before making a focused adjustment. Check the preview after each change.',
    'Use Undo after an unwanted edit. Confirm the timeline and preview return to the earlier state before continuing.',
    'Keep the project open until changes have saved. Reopen it from Projects to continue later.',
  ] },
  { id: 'assistant', title: 'Work with the assistant', steps: [
    'Open the editorial chat inside a project so the assistant has that project?s context. Describe a specific result, such as adding captions or shortening pauses.',
    'Review any proposal and its scope before confirming it. A reply alone is not evidence of an edit: check the timeline, preview, and action history.',
    'For actions that require compute, review the credit cost and balance. Confirm only when you want the action to run; cancel a running job when a Cancel control is offered.',
    'If an action cannot run, follow its error or credit guidance. Contact support with the project name and steps if the problem persists.',
  ] },
  { id: 'media', title: 'Manage source media', steps: [
    'Use Assets to find media available to your account. Choose footage or audio that you have permission to use.',
    'Add the source to the intended project and verify it appears in the editor. Library availability and timeline placement are separate steps.',
    'Before removing source media, check whether you still need it for an active edit or delivery.',
  ] },
  { id: 'exports', title: 'Review an export', steps: [
    'Review the cut, captions, audio, aspect ratio, and project duration in the preview before opening Export.',
    'Choose a supported destination. For connected destinations, connect the account in Settings and verify the export dialog shows that connection.',
    'Review the destination, format, credit cost, and balance in the export confirmation. Confirm when all details are correct.',
    'Watch the export status, then check the delivered file or destination. An export request is not a completed delivery.',
  ] },
  { id: 'privacy', title: 'Control your privacy choices', steps: [
    'On your first visit, choose Accept All, Reject Non-Essential, or Customize in the cookie banner. Optional categories begin off.',
    'Open Cookie Settings in the footer to inspect or change your selection. Reject Non-Essential keeps authentication and security available.',
    'If browser storage is blocked, your choice applies to this visit and the banner may return on your next visit.',
  ] },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[var(--theme-background)] px-6 py-20 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl leading-tight sm:text-6xl">Production handbook</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Read the workflow before opening the Studio. These instructions are available without an account.</p>
        <nav aria-label="Handbook chapters" className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
          {chapters.map((chapter) => <Link key={chapter.id} href={`#${chapter.id}`} className="text-[var(--theme-accent)] underline underline-offset-4">{chapter.title}</Link>)}
        </nav>
        <div className="mt-14 space-y-14">
          {chapters.map((chapter) => (
            <section key={chapter.id} id={chapter.id} className="scroll-mt-32 border-t border-white/10 pt-8">
              <h2 className="text-3xl">{chapter.title}</h2>
              <ol className="mt-6 list-decimal space-y-4 pl-6 text-base leading-8 text-white/75">
                {chapter.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>
          ))}
        </div>
        <p className="mt-14 text-white/75">Need help with a specific issue? <Link href="/contact" className="text-[var(--theme-accent)] underline underline-offset-4">Contact support</Link>.</p>
      </div>
    </main>
  )
}
