import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Zenyx Game Server',
  description: 'Enterprise Casino Game Server'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
