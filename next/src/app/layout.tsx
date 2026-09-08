import type { ReactNode } from 'react'
import HtmlLangSync from '@/components/layout/HtmlLangSync'
import '@/styles/i18n-enhancements.css'

export default function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="/assets/vendors/fonts/googleapis.css"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/vendors/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/vendors/fontawesome/css/all.min.css" />
        <link rel="stylesheet" href="/assets/vendors/sinace-icons/style.css" />
        <link rel="stylesheet" href="/assets/vendors/reey-font/stylesheet.css" />
        <link rel="stylesheet" href="/assets/css/sinace.css" />
        <link rel="stylesheet" href="/assets/css/sinace-responsive.css" />
      </head>
      <body>
        <HtmlLangSync />

        {children}
      </body>
    </html>
  )
}
