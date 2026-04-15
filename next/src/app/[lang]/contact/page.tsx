import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  // 尝试从数据库获取 SEO 数据
  const seoData = await getSeoByPath('/contact', lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('Contact')),
    description: dict('Get in touch with us'),
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${lang}/contact`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
    },
    alternates: {
      canonical: seoMeta.canonical || `/${lang}/contact`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/contact`])
      ),
    },
  }
}

export default async function ContactPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  
  return (
    <>
      <PageHeader
        title={dict('Contact')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('Contact') }]}
      />

      <section className="contact-page">
        <div className="container">
          <div className="row">
            <div className="col-xl-5 col-lg-6">
              <div className="contact-page__left">
                <div className="contact-page__form-box">
                  <form className="contact-page__form">
                    <div className="row">
                      <div className="col-xl-12">
                        <div className="contact-page__input-box">
                          <input type="text" placeholder={dict('Your name')} name="name" />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <div className="contact-page__input-box">
                          <input type="email" placeholder={dict('Email address')} name="email" />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-xl-12">
                        <div className="contact-page__input-box text-message-box">
                          <textarea name="message" placeholder={dict('Write message')}></textarea>
                        </div>
                        <div className="contact-page__btn-box">
                          <button type="submit" className="thm-btn contact-page__btn">
                            {dict('Send a Message')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-xl-7 col-lg-6">
              <div className="contact-page__right">
                <SectionTitle
                  tagline={dict('contact us')}
                  title={dict('Have Questions? Contact')+' '+dict('with us')+' '+dict('Anytime')}
                  highlight={dict('Anytime')}
                />
                <ul className="contact-page__points list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="icon-telephone-1"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Have any question?')}</p>
                      <h3>
                        {dict('Free')} <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a>
                      </h3>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="icon-email"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Send Email')}</p>
                      <h3>
                        <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
                      </h3>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="icon-pin"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Visit anytime')}</p>
                      <h3>{siteConfig.contact.address.en}</h3>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-page-google-map">
        <iframe
          src={siteConfig.map.embedUrl}
          className="contact-page-google-map__box"
          allowFullScreen
        ></iframe>
      </section>
    </>
  )
}
