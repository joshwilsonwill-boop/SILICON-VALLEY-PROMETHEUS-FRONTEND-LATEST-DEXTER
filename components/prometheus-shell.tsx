'use client'

export interface PrometheusShellProps {
  children: React.ReactNode
  contentClassName?: string
  header?: React.ReactNode
  mainClassName?: string
  overlay?: React.ReactNode
  rootClassName?: string
}

export function PrometheusShell({
  children,
  contentClassName = 'relative min-h-0 flex-1 overflow-hidden',
  header,
  mainClassName = 'relative z-auto h-full overflow-y-auto overflow-x-hidden overscroll-contain',
  overlay,
  rootClassName = 'prometheus-page-reveal relative flex h-full min-h-0 w-full flex-col overflow-hidden font-sans',
}: PrometheusShellProps) {
  return (
    <div className={rootClassName}>
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className={contentClassName}>
        <main className={mainClassName}>{children}</main>
        {overlay ? <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div> : null}
      </div>
    </div>
  )
}
