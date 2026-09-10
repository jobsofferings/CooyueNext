import { Metadata } from 'next'
import { getCompanyContent } from '@/content/company'
import { siteConfig } from '@/config/site.config'
import { Locale } from '@/i18n-config'

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const copy = getCompanyContent(lang)

  return {
    title: siteConfig.seo.titleTemplate(copy.faqTitle),
    description: copy.faqDescription,
    alternates: {
      canonical: `/${lang}/faq`,
      languages: { zh: '/zh/faq', en: '/en/faq' },
    },
  }
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
