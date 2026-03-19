import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Contact'),
  description: 'Get in touch with us',
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Contact"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
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
                          <input type="text" placeholder="Your name" name="name" />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <div className="contact-page__input-box">
                          <input type="email" placeholder="Email address" name="email" />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-xl-12">
                        <div className="contact-page__input-box text-message-box">
                          <textarea name="message" placeholder="Write message"></textarea>
                        </div>
                        <div className="contact-page__btn-box">
                          <button type="submit" className="thm-btn contact-page__btn">
                            Send a Message
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
                  tagline="contact us"
                  title="Have Questions? Contact with us Anytime"
                  highlight="Anytime"
                />
                <ul className="contact-page__points list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="icon-telephone-1"></span>
                    </div>
                    <div className="text">
                      <p>Have any question?</p>
                      <h3>
                        Free <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a>
                      </h3>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="icon-email"></span>
                    </div>
                    <div className="text">
                      <p>Send Email</p>
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
                      <p>Visit anytime</p>
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
