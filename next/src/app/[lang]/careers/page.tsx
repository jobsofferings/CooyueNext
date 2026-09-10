import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { getCompanyContent } from '@/content/company'
import { getDictionary } from '@/get-dictionary'
import { siteConfig } from '@/config/site.config'
import type { Locale } from '@/i18n-config'

export function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Metadata {
  const copy = getCompanyContent(lang)
  return { title: copy.careersTitle, description: copy.careersText, robots: { index: false, follow: true }, alternates: { canonical: `/${lang}/careers`, languages: { zh: '/zh/careers', en: '/en/careers' } } }
}

export default async function CareersPage({ params: { lang } }: { params: { lang: Locale } }) {
  const copy = getCompanyContent(lang)
  const dict = await getDictionary(lang)
  return (
    <main>
      <PageHeader title={copy.careersTitle} breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('Careers') }]} />
      <section className="company-content"><div className="container"><p>{copy.careersText}</p><a className="thm-btn" href={`mailto:${siteConfig.contact.email}`}>{copy.email}</a></div></section>
    </main>
  )
}
