import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('FAQ'),
  description: 'Frequently asked questions',
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
