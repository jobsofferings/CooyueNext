import Link from 'next/link'
import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact/ContactForm'
import PagePlugins from '@/components/layout/PagePlugins'
import { SectionTitle } from '@/components/ui'
import { getCompanyContent, featuredProductSlugs } from '@/content/company'
import { Locale } from '@/i18n-config'
import { siteConfig } from '@/config/site.config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

export default function Home({ params: { lang } }: { params: { lang: Locale } }) {
  const copy = getCompanyContent(lang)

  return (
    <main>
      <PagePlugins page="home" />
      <section className="main-slider">
        <div className="main-slider__carousel owl-carousel owl-theme thm-owl__carousel" data-owl-options='{"loop": true, "items": 1, "navText": ["<span class=\"icon-left-arrow\"></span>","<span class=\"icon-right-arrow\"></span>"], "margin": 0, "dots": false, "nav": true, "animateOut": "slideOutDown", "animateIn": "fadeIn", "active": true, "smartSpeed": 1000, "autoplay": true, "autoplayTimeout": 7000, "autoplayHoverPause": false}'>
          <div className="item main-slider__slide-1">
            <div className="main-slider__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/slider-1-1.jpg)' }}></div>
            <div className="main-slider__shadow"></div>
            <div className="container">
              <div className="main-slider__content">
                <p className="main-slider__sub-title">{copy.heroTag}</p>
                <h1 className="main-slider__title">{copy.heroTitle}</h1>
                <p className="main-slider__text">{copy.heroText}</p>
                <div className="main-slider__btn-box">
                  <Link href={`/${lang}/products`} className="main-slider__btn thm-btn">{copy.browse}</Link>
                  <Link href={`/${lang}/contact`} className="main-slider__btn thm-btn main-slider__btn--secondary">{copy.inquire}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-one">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-5 col-lg-5">
              <div className="about-one__left">
                <div className="about-one__img-box">
                  <div className="about-one__img">
                    <img src="/assets/images/resources/about-four-img-1.jpg" alt={copy.aboutTitle} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-7 col-lg-7">
              <div className="about-one__right">
                <SectionTitle tagline={copy.aboutTag} title={copy.aboutTitle} />
                <p className="about-one__text">{copy.aboutText}</p>
                <ul className="about-one__points-list list-unstyled">
                  <li><div className="icon"><span className="fa fa-check"></span></div><div className="text"><p>{copy.services[0].title}</p></div></li>
                  <li><div className="icon"><span className="fa fa-check"></span></div><div className="text"><p>{copy.services[1].title}</p></div></li>
                  <li><div className="icon"><span className="fa fa-check"></span></div><div className="text"><p>{copy.services[2].title}</p></div></li>
                </ul>
                <div className="about-one__btn-box">
                  <Link href={`/${lang}/about`} className="thm-btn">{copy.aboutMore}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="services-one">
        <div className="services-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/services-one-bg.png)' }}></div>
        <div className="container">
          <div className="services-one__top">
            <SectionTitle tagline={copy.servicesTag} title={copy.servicesTitle} align="center" />
          </div>
          <div className="row">
            {copy.services.map((service) => (
              <div className="col-xl-4 col-lg-4" key={service.title}>
                <article className="services-one__single">
                  <div className="services-one__title-box">
                    <div className="services-one__icon"><span className={`fa ${service.icon}`}></span></div>
                    <h3 className="services-one__title">{service.title}</h3>
                    <p>{service.text}</p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="project-two">
        <div className="container">
          <SectionTitle tagline={copy.featuredTag} title={copy.featuredTitle} />
          <p className="project-two__text">{copy.featuredText}</p>
          <div className="row">
            {copy.featured.map((product, index) => (
              <div className="col-xl-4 col-lg-4" key={product.title}>
                <article className="project-two__single">
                  <div className="project-two__img-box">
                    <img src={`/assets/images/project/project-1-${index + 1}.jpg`} alt={product.title} />
                  </div>
                  <div className="project-two__content">
                    <p className="project-two__sub-title">{product.category}</p>
                    <h3 className="project-two__title"><Link href={`/${lang}/products/${featuredProductSlugs[index]}`}>{product.title}</Link></h3>
                    <p>{product.text}</p>
                    <Link href={`/${lang}/products/${featuredProductSlugs[index]}`} className="project-two__link">{copy.detail}<span className="icon-right-arrow"></span></Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="expectation-one">
        <div className="expectation-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/expectation-one-bg.jpg)' }}></div>
        <SectionTitle tagline={copy.processTag} title={copy.processTitle} align="center" />
        <div className="expectation-one__inner">
          <div className="container">
            <p className="text-center expectation-one__intro">{copy.processText}</p>
            <ul className="expectation-one__points list-unstyled">
              {copy.steps.map((step, index) => (
                <li key={step.title}>
                  <div className="icon"><span className={`fa fa-${index === 0 ? 'bullseye' : index === 1 ? 'sliders' : 'check'}`}></span></div>
                  <h3 className="expectation-one__title">{step.title}</h3>
                  <p className="expectation-one__text">{step.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="contact-one">
        <div className="contact-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/contact-one-bg.jpg)' }}></div>
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-6">
              <ContactForm
                lang={lang}
                pagePath={`/${lang}`}
                labels={{ name: copy.formName, email: copy.formEmail, message: copy.formMessage, submit: copy.form }}
                initialValues={{ name: '', email: '', message: '' }}
              />
            </div>
            <div className="col-xl-6 col-lg-6">
              <div className="contact-one__right">
                <SectionTitle tagline={copy.email} title={copy.contactTitle} />
                <p className="contact-one__text">{copy.contactText}</p>
                <ul className="contact-one__points list-unstyled">
                  <li><div className="icon"><span className="icon-email"></span></div><div className="text"><p>{copy.email}</p><h3><a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></h3></div></li>
                  <li><div className="icon"><span className="icon-telephone-1"></span></div><div className="text"><p>{copy.phone}</p><h3><a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a></h3></div></li>
                  <li><div className="icon"><span className="icon-pin"></span></div><div className="text"><p>{copy.locationLabel}</p><h3>{copy.location}</h3></div></li>
                </ul>
                <p className="contact-one__note">{copy.contactNote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export async function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Promise<Metadata> {
  const copy = getCompanyContent(lang)
  const seoData = await getSeoByPath('/', lang)
  const seoMeta = extractSeoMeta(seoData, { title: copy.title, description: copy.description })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: { title: seoMeta.title, description: seoMeta.description, url: seoMeta.canonical || `/${lang}` },
    alternates: {
      canonical: seoMeta.canonical || `/${lang}`,
      languages: { zh: '/zh', en: '/en' },
    },
  }
}
