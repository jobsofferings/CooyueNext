import type { Metadata } from 'next'
import { Header, Footer, MobileNav, SearchPopup, ScriptInitializer, ScrollToTop } from '@/components/layout'
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
    metadataBase: new URL(siteConfig.siteUrl),
    title: `${siteConfig.company.name} - ${dict('Business Consulting')}`,
    description: dict('Professional business consulting services'),
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}`])
      ),
    },
  }
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="page-wrapper">
        <Header />
        <div className="stricky-header stricked-menu main-menu">
          <div className="sticky-header__content"></div>
        </div>
        {children}
        <Footer />
      </div>
      <MobileNav />
      <SearchPopup />
      <ScrollToTop />
      <ScriptInitializer />
    </>
  )
}
