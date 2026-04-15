import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getFaqSeo, extractSeoMeta } from '@/lib/seo-api'

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  // 尝试从数据库获取 SEO 数据
  const seoData = await getFaqSeo(lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('FAQs')),
    description: dict('Frequently asked questions'),
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${lang}/faq`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
    },
    alternates: {
      canonical: seoMeta.canonical || `/${lang}/faq`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/faq`])
      ),
    },
  }
}

export default async function FaqPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)

  const faqs = [
    {
      question: dict('How can I get started with your consulting services?'),
      answer: dict('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'),
    },
    {
      question: dict('What industries do you specialize in?'),
      answer: dict('We specialize in various industries including finance, healthcare, technology, manufacturing, and retail. Our team of experts has extensive experience across multiple sectors.'),
    },
    {
      question: dict('How long does a typical consulting engagement last?'),
      answer: dict('The duration of our consulting engagements varies depending on the scope and complexity of the project. Most projects range from 3 months to 1 year.'),
    },
    {
      question: dict('What is your pricing model?'),
      answer: dict('We offer flexible pricing models including hourly rates, project-based fees, and retainer agreements. We work with you to find the best arrangement for your needs and budget.'),
    },
    {
      question: dict('Do you offer remote consulting services?'),
      answer: dict('Yes, we offer both on-site and remote consulting services. Our team is equipped to work effectively with clients regardless of location.'),
    },
    {
      question: dict('How do you ensure confidentiality?'),
      answer: dict('We take confidentiality very seriously. All our consultants sign strict NDAs, and we have robust data security measures in place to protect your sensitive information.'),
    },
  ]

  return (
    <>
      <PageHeader
        title={dict('FAQs')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('FAQs') }]}
      />

      <section className="faq-page">
        <div className="container">
          <SectionTitle
            tagline={dict('frequently asked questions')}
            title={dict('Have Any Questions?')}
            highlight={dict('Questions')}
            align="center"
          />
          <div className="faq-page__inner">
            <div className="accrodion-grp" data-grp-name="faq-one-accrodion">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="accrodion"
                >
                  <div className="accrodion-title">
                    <h4>
                      {faq.question}
                      <span className="accrodion-icon"></span>
                    </h4>
                  </div>
                  <div className="accrodion-content">
                    <div className="inner">
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
