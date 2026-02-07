import './globals.css'
import type { Metadata } from 'next'

function clean(v: any) {
  if (v === null || v === undefined) return ''
  const s = String(v).trim()
  const low = s.toLowerCase()
  if (!s || low === 'null' || low === 'undefined') return ''
  return s
}

function safeMetadataBase(): URL {
  const rawEnv = clean(process.env.APP_BASE_URL)
  const port = clean(process.env.PORT)

  console.error('[BOOT] APP_BASE_URL=', process.env.APP_BASE_URL)
  console.error('[BOOT] PORT=', process.env.PORT)

  const raw = rawEnv || (port ? `http://localhost:${port}` : 'http://localhost:3000')

  console.error('[BOOT] metadataBase.raw=', raw)

  try {
    const u = new URL(raw)
    console.error('[BOOT] metadataBase.OK=', u.toString())
    return u
  } catch (e) {
    console.error('[BOOT] metadataBase.ERROR=', e)
    return new URL('http://localhost:3000')
  }
}

export const metadata: Metadata = {
  metadataBase: safeMetadataBase(),
  title: 'Zenyx Game Server',
  description: 'Casino game server',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.error('[BOOT] RootLayout render')
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
