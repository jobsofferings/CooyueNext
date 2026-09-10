import type { Metadata } from 'next'
import { Header, Footer, MobileNav, SearchPopup, ScrollToTop } from '@/components/layout'
import { NavigationProvider } from '@/components/layout/NavigationProvider'
import { getProductCategories } from '@/lib/products-api'
import { notFound } from 'next/navigation'
import { siteConfig } from '@/config/site.config'
import { i18n, Locale } from '@/i18n-config'
import { getCompanyContent } from '@/content/company'

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title: siteConfig.seo.titleTemplate(getCompanyContent(lang).title),
    description: getCompanyContent(lang).description,
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
