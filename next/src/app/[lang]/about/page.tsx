import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { getCompanyContent } from '@/content/company'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import type { Locale } from '@/i18n-config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

export async function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Promise<Metadata> {
  const copy = getCompanyContent(lang)
  const seo = extractSeoMeta(await getSeoByPath('/about', lang), {
    title: siteConfig.seo.titleTemplate(copy.aboutTag),
    description: copy.description,
  })
  return {
    title: seo.title,
    description: seo.description,
    robots: seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: seo.canonical || `/${lang}/about`, languages: { zh: '/zh/about', en: '/en/about' } },
    openGraph: { title: seo.title, description: seo.description, url: seo.canonical || `/${lang}/about`, images: seo.ogImage ? [seo.ogImage] : undefined },
  }
}

export default async function AboutPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang)
  const copy = getCompanyContent(lang)
  return (
    <main>
      <PageHeader title={dict('About')} breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('About') }]} />
      <section className="about-four company-content">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="company-content__image">
                <img src="/assets/models/imaging-kit/imaging-kit.webp" alt={lang === 'zh' ? 'GLA07512K-T2 + ITZ1212IP 成像套件 CAD 渲染图' : 'CAD render of the GLA07512K-T2 + ITZ1212IP imaging kit'} />
              </div>
            </div>
            <div className="col-lg-6">
              <SectionTitle tagline={copy.aboutTag} title={copy.aboutTitle} />
              <p>{copy.aboutText}</p>
              <p className="company-content__legal">{copy.legalName}</p>
              <Link href={`/${lang}/contact`} className="thm-btn">{copy.form}</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="company-content company-content--muted">
        <div className="container">
          <SectionTitle tagline={copy.servicesTag} title={copy.servicesTitle} />
          <div className="row">
            {copy.services.map((service) => <div className="col-lg-4" key={service.title}><article className="company-content__card"><span className={`fa ${service.icon}`} aria-hidden="true"></span><h3>{service.title}</h3><p>{service.text}</p></article></div>)}
          </div>
        </div>
      </section>
      <section className="company-content">
        <div className="container">
          <SectionTitle tagline={copy.processTag} title={copy.processTitle} />
          <p>{copy.processText}</p>
          <div className="row">
            {copy.steps.map((step) => <div className="col-lg-4" key={step.title}><article className="company-content__card"><h3>{step.title}</h3><p>{step.text}</p></article></div>)}
          </div>
          <aside className="catalog-reference-note"><h3>{copy.referenceTitle}</h3><p>{copy.referenceText}</p></aside>
          <a className="thm-btn" href={`mailto:${siteConfig.contact.email}`}>{copy.inquire}</a>
        </div>
      </section>
    </main>
  )
}
