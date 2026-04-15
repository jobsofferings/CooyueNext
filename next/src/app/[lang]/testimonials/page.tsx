import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { SectionTitle, TestimonialCard } from '@/components/ui'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

const getTestimonials = (dict: (key: string) => string) => [
  { name: dict('Mike Hardson'), role: dict('CO Founder'), content: dict('Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.'), image: '/assets/images/testimonial/testimonial-2-1.jpg' },
  { name: dict('Sarah Albert'), role: dict('CO Founder'), content: dict('Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.'), image: '/assets/images/testimonial/testimonial-2-2.jpg' },
  { name: dict('Christine Eve'), role: dict('CO Founder'), content: dict('Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.'), image: '/assets/images/testimonial/testimonial-2-3.jpg' },
  { name: dict('Michale Robert'), role: dict('CO Founder'), content: dict('Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.'), image: '/assets/images/testimonial/testimonial-2-4.jpg' },
]

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  // 尝试从数据库获取 SEO 数据
  const seoData = await getSeoByPath('/testimonials', lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('Testimonials')),
    description: dict('What our clients say about us'),
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${lang}/testimonials`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
    },
    alternates: {
      canonical: seoMeta.canonical || `/${lang}/testimonials`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/testimonials`])
      ),
    },
  }
}

export default async function TestimonialsPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  const testimonials = getTestimonials(dict)
  
  return (
    <>
      <PageHeader
        title={dict('Testimonials')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('Testimonials') }]}
      />

      <section className="testimonial-page">
        <div className="container">
          <SectionTitle
            tagline={dict('our testimonials')}
            title={dict('What They\'re Talking About Company')}
            highlight={dict('Company')}
            align="center"
          />
          <div className="row">
            {testimonials.map((item, index) => (
              <div key={index} className="col-xl-6 col-lg-6">
                <TestimonialCard {...item} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
