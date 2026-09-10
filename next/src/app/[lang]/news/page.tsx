import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { getCompanyContent } from '@/content/company'
import { productGuides } from '@/content/guides'
import { getDictionary } from '@/get-dictionary'
import { siteConfig } from '@/config/site.config'
import type { Locale } from '@/i18n-config'

export function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Metadata {
  const copy = getCompanyContent(lang)
  return { title: siteConfig.seo.titleTemplate(lang === 'zh' ? '红外设备采购指南' : 'Infrared Equipment Guides'), description: copy.guidesDescription, alternates: { canonical: `/${lang}/news`, languages: { zh: '/zh/news', en: '/en/news' } } }
}

export default async function NewsPage({ params: { lang } }: { params: { lang: Locale } }) {
  const copy = getCompanyContent(lang)
  const dict = await getDictionary(lang)
  return (
    <main>
      <PageHeader title={dict('News')} breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('News') }]} />
      <section className="company-content">
        <div className="container">
          <SectionTitle tagline={dict('News')} title={copy.guidesTitle} />
          <p className="company-content__intro">{copy.guidesIntro}</p>
          <div className="row">
            {productGuides[lang].map((guide) => <div className="col-lg-4 col-md-6" key={guide.id}><article className="company-content__card"><p className="company-content__tag">{guide.category}</p><h2><Link href={`/${lang}/news/${guide.id}`}>{guide.title}</Link></h2><p>{guide.intro}</p><Link href={`/${lang}/news/${guide.id}`}>{dict('Read More')} <span className="fa fa-arrow-right" aria-hidden="true"></span></Link></article></div>)}
          </div>
        </div>
      </section>
    </main>
  )
}
