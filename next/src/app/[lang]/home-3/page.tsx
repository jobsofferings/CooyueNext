import Link from 'next/link'
import { Locale } from '@/i18n-config'
import { Metadata } from 'next'
import { SectionTitle, TestimonialCard } from '@/components/ui'
import { siteConfig } from '@/config/site.config'

const testimonials = [
  { name: 'Mike Hardson', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure.', image: '/assets/images/testimonial/testimonial-2-1.jpg' },
  { name: 'Sarah Albert', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure.', image: '/assets/images/testimonial/testimonial-2-2.jpg' },
]

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Home Three'),
  description: 'Business consulting services - Home Three',
}

export default async function HomeThree({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  return (
    <main>
      <section className="main-slider-three">
        <div
          className="main-slider-three__bg"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/main-slider-3-1.jpg)' }}
        ></div>
        <div className="container">
          <div className="main-slider-three__content">
            <p className="main-slider-three__sub-title">Welcome to {siteConfig.company.name}</p>
            <h2 className="main-slider-three__title">
              Expert <span>Consulting</span>
              <br /> For Your Success
            </h2>
            <p className="main-slider-three__text">
              Transform your business with our professional guidance.
            </p>
            <div className="main-slider-three__btn-box">
              <Link href={`/${lang}/contact`} className="thm-btn main-slider-three__btn">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-one">
        <div className="container">
          <div className="row">
            <div className="col-xl-4 col-lg-4">
              <div className="feature-one__single">
                <div className="feature-one__icon">
                  <span className="icon-strategy"></span>
                </div>
                <h3 className="feature-one__title">Strategy</h3>
                <p className="feature-one__text">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4">
              <div className="feature-one__single">
                <div className="feature-one__icon">
                  <span className="icon-planning"></span>
                </div>
                <h3 className="feature-one__title">Planning</h3>
                <p className="feature-one__text">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4">
              <div className="feature-one__single">
                <div className="feature-one__icon">
                  <span className="icon-conversation"></span>
                </div>
                <h3 className="feature-one__title">Consulting</h3>
                <p className="feature-one__text">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonial-three">
        <div
          className="testimonial-three__bg"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/testimonial-three-bg.jpg)' }}
        ></div>
        <div className="container">
          <SectionTitle
            tagline="our testimonials"
            title="What Our Clients Say"
            highlight="Say"
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

      <section className="cta-three">
        <div className="container">
          <div className="cta-three__inner">
            <h3 className="cta-three__title">
              Need Expert Financial Advice?
            </h3>
            <p className="cta-three__text">
              Contact us today for a free consultation.
            </p>
            <div className="cta-three__btn-box">
              <Link href={`/${lang}/contact`} className="thm-btn cta-three__btn">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
