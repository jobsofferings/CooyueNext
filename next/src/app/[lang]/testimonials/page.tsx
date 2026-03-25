import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { SectionTitle, TestimonialCard } from '@/components/ui'
import { getDictionary } from '@/get-dictionary'
import { Locale } from '@/i18n-config'

const testimonials = [
  { name: 'Mike Hardson', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-1.jpg' },
  { name: 'Sarah Albert', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-2.jpg' },
  { name: 'Christine Eve', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-3.jpg' },
  { name: 'Michale Robert', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-4.jpg' },
]

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Testimonials'),
  description: 'What our clients say about us',
}

export default async function TestimonialsPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  
  return (
    <>
      <PageHeader
        title="Testimonials"
        breadcrumbs={[{ label: dict('home'), href: '/' }, { label: 'Testimonials' }]}
      />

      <section className="testimonial-page">
        <div className="container">
          <SectionTitle
            tagline="our testimonials"
            title="What They're Talking About Company"
            highlight="Company"
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
