import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { getCompanyContent } from '@/content/company'
import { productGuides } from '@/content/guides'
import { getDictionary } from '@/get-dictionary'
import { siteConfig } from '@/config/site.config'
import { i18n, type Locale } from '@/i18n-config'

interface GuidePageProps { params: { lang: Locale; id: string } }

export function generateStaticParams() {
  return i18n.locales.flatMap((lang) => productGuides[lang].map((guide) => ({ lang, id: guide.id })))
}

export function generateMetadata({ params: { lang, id } }: GuidePageProps): Metadata {
  const guide = productGuides[lang].find((entry) => entry.id === id)
  if (!guide) return {}
  return { title: siteConfig.seo.titleTemplate(guide.title), description: guide.intro, alternates: { canonical: `/${lang}/news/${id}`, languages: { zh: `/zh/news/${id}`, en: `/en/news/${id}` } }, openGraph: { type: 'article', title: guide.title, description: guide.intro, url: `/${lang}/news/${id}` } }
}

export default async function NewsDetailPage({ params: { lang, id } }: GuidePageProps) {
  const guide = productGuides[lang].find((entry) => entry.id === id)
  if (!guide) notFound()
  const dict = await getDictionary(lang)
  const copy = getCompanyContent(lang)
  return (
    <main>
      <PageHeader title={guide.title} breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('News'), href: '/news' }, { label: guide.category }]} />
      <section className="company-content">
        <div className="container">
          <div className="row">
            <article className="col-lg-8 company-content__article">
              <p className="company-content__tag">{guide.category}</p><p>{guide.intro}</p>
              {guide.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
              <h2>{lang === 'zh' ? '邮件中建议包含' : 'Include in your email'}</h2>
              <ul>{guide.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>{copy.contactNote}</p>
              <a href={`mailto:${siteConfig.contact.email}`} className="thm-btn">{copy.inquire}</a>
            </article>
            <aside className="col-lg-4"><div className="company-content__card"><h2>{lang === 'zh' ? '更多采购指南' : 'More purchasing guides'}</h2><ul className="company-content__links">{productGuides[lang].filter((entry) => entry.id !== id).map((entry) => <li key={entry.id}><Link href={`/${lang}/news/${entry.id}`}>{entry.title}</Link></li>)}</ul><Link href={`/${lang}/products`}>{copy.browse}</Link></div></aside>
          </div>
        </div>
      </section>
    </main>
  )
}
