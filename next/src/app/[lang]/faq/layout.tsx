import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  return {
    title: siteConfig.seo.titleTemplate(dict('FAQ')),
    description: dict('Frequently asked questions'),
    alternates: {
      canonical: `/${lang}/faq`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/faq`])
      ),
    },
  }
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
