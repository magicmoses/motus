'use client'

import dynamic from 'next/dynamic'

const Body3DViewerClient = dynamic(
  () => import('./Body3DViewer').then(mod => ({ default: mod.Body3DViewer })),
  { ssr: false }
)

export function Body3DViewerWrapper() {
  return <Body3DViewerClient />
}
