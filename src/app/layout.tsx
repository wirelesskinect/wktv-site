import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'

export const metadata: Metadata = {
  title: 'WKTV — Your screen. Your way.',
  description: 'Live sports, TV, and movies. Stream anywhere in the USA on any device. Start with a free 24-hour trial.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <SiteHeader />
          <main style={{ flex: 1 }}>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
