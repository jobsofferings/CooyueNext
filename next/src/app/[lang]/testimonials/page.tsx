import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle, TestimonialCard } from '@/components/ui'

const testimonials = [
  { name: 'Mike Hardson', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-1.jpg' },
  { name: 'Sarah Albert', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-2.jpg' },
  { name: 'Christine Eve', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-3.jpg' },
  { name: 'Michale Robert', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-4.jpg' },
]

export const metadata: Metadata = {
  title: 'Testimonials - Sinace',
  description: 'What our clients say about us',
}

export default function TestimonialsPage() {
  return (
    <>
      <PageHeader
        title="Testimonials"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Testimonials' }]}
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
