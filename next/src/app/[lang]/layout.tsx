import type { Metadata } from 'next'
import { Header, Footer, MobileNav, SearchPopup, ScrollToTop } from '@/components/layout'
import { NavigationProvider } from '@/components/layout/NavigationProvider'
import { getProductCategories } from '@/lib/products-api'
import { notFound } from 'next/navigation'
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

export default async function LocaleLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode
  params: { lang: Locale }
}) {
  if (!i18n.locales.includes(lang)) notFound()
  const categories = await getProductCategories(lang).catch(() => [])
  return (
    <NavigationProvider categories={categories.map(({ slug, name }) => ({ slug, name }))}>
      <div className="page-wrapper">
        <Header />
        {children}
        <Footer />
      </div>
      <MobileNav />
      <SearchPopup />
      <ScrollToTop />
    </NavigationProvider>
  )
}
