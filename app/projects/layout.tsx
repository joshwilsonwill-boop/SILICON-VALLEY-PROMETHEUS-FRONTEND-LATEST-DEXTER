import type { ReactNode } from 'react'

import { ReactQueryProvider } from '@/components/ReactQueryProvider'

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>
}
