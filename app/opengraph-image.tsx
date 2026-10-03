import { ImageResponse } from 'next/og'

export const alt = 'Prometheus Studio — record once, publish fast'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0A0A0F', color: '#E8E8ED' }}>
      <div style={{ display: 'flex', color: '#38BDF8', fontSize: 30, marginBottom: 44 }}>Prometheus Studio</div>
      <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>Record once. Publish fast.</div>
      <div style={{ display: 'flex', fontSize: 28, marginTop: 36 }}>Your footage, edit, and delivery in one workspace.</div>
    </div>, size,
  )
}
