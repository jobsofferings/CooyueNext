import Link from 'next/link'
import { Locale } from '@/i18n-config'
import { Metadata } from 'next'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Home Two'),
  description: 'Business consulting services - Home Two',
}

export default async function HomeTwo({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  return (
    <main>
      <section className="main-slider-two">
        <div
          className="main-slider-two__bg"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/main-slider-2-1.jpg)' }}
        ></div>
        <div className="container">
          <div className="main-slider-two__content">
            <p className="main-slider-two__sub-title">Welcome to {siteConfig.company.name}</p>
            <h2 className="main-slider-two__title">
              Best Financial <span>Solutions</span>
              <br /> for Your Business
            </h2>
            <p className="main-slider-two__text">
              Professional consulting services to help your business thrive.
            </p>
            <div className="main-slider-two__btn-box">
              <Link href={`/${lang}/about`} className="thm-btn main-slider-two__btn">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-two">
        <div
          className="cta-two__bg"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/cta-two-bg.jpg)' }}
        ></div>
        <div className="container">
          <div className="cta-two__inner">
            <h3 className="cta-two__title">
              Ready to Get Started? Contact Us Today!
            </h3>
            <div className="cta-two__btn-box">
              <Link href={`/${lang}/contact`} className="thm-btn cta-two__btn">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="about-two">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              <div className="about-two__left">
                <div className="about-two__img">
                  <img src="/assets/images/resources/about-two-img-1.jpg" alt="" />
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="about-two__right">
                <SectionTitle
                  tagline="About company"
                  title="We Help Your Business Grow"
                  highlight="Grow"
                />
                <p className="about-two__text">
                  Lorem ipsum dolor sit am adipi we help you ensure everyone is in the right jobs
                  sicing elit, sed do consulting firms Et leggings across the nation tempor.
                </p>
                <div className="about-two__btn-box">
                  <Link href={`/${lang}/about`} className="thm-btn about-two__btn">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
