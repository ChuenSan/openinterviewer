import type { Metadata } from 'next'
import './globals.css'
import PreviewBanner from '@/components/PreviewBanner'

export const metadata: Metadata = {
  title: 'OpenInterviewer 研究访谈工具',
  description: '由 AI 驱动的定性研究访谈平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-stone-900 font-sans antialiased">
        <PreviewBanner />
        {children}
      </body>
    </html>
  )
}
