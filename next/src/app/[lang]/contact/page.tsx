import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Contact - Sinace',
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
                        Free <a href="tel:+23000-9850">+23 (000)-9850</a>
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
                        <a href="mailto:needhelp@company.com">needhelp@company.com</a>
                      </h3>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="icon-pin"></span>
                    </div>
                    <div className="text">
                      <p>Visit anytime</p>
                      <h3>66 road, broklyn street new york</h3>
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
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4562.753041141002!2d-118.80123790098536!3d34.152323469614075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80e82469c2162619%3A0xba03efb7998571f6!2s21%20Hart%20Cir%2C%20Thousand%20Oaks%2C%20CA%2091360%2C%20USA!5e0!3m2!1sen!2sbd!4v1621135638282!5m2!1sen!2sbd"
          className="contact-page-google-map__box"
          allowFullScreen
        ></iframe>
      </section>
    </>
  )
}
