'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { siteConfig } from '@/config/site.config'
import { useDictionary } from '@/hooks/useDictionary'

const footerGalleryItems = [
  {
    slug: 'hikmicro-le10-3-0',
    name: 'HIKMICRO LE10 3.0',
    image:
      'https://jobsofferings.oss-cn-hangzhou.aliyuncs.com/cooyue_product/thermal-monoculars/hikmicro-le10-3-0/02-0b929888c7af.png',
  },
  {
    slug: 'hikmicro-sh35-3-0',
    name: 'HIKMICRO SH35 3.0',
    image:
      'https://jobsofferings.oss-cn-hangzhou.aliyuncs.com/cooyue_product/thermal-scopes/hikmicro-sh35-3-0/02-66efdfb603a9.png',
  },
  {
    slug: 'hikmicro-hq50l',
    name: 'HIKMICRO HQ50L',
    image:
      'https://jobsofferings.oss-cn-hangzhou.aliyuncs.com/cooyue_product/thermal-binoculars/hikmicro-hq50l/02-ca8151fa6be7.png',
  },
  {
    slug: 'hikmicro-minie',
    name: 'HIKMICRO MiniE',
    image:
      'https://jobsofferings.oss-cn-hangzhou.aliyuncs.com/cooyue_product/thermal-phone-modules/hikmicro-minie/01-73b39778c512.png',
  },
  {
    slug: 'hikmicro-b20s',
    name: 'HIKMICRO B20S',
    image:
      'https://jobsofferings.oss-cn-hangzhou.aliyuncs.com/cooyue_product/handheld-thermal-cameras/hikmicro-b20s/01-c4db8993a46d.png',
  },
  {
    slug: 'hikmicro-hm-td2a37t-15-q',
    name: 'HIKMICRO HM-TD2A37T-15/Q',
    image:
      'https://jobsofferings.oss-cn-hangzhou.aliyuncs.com/cooyue_product/fixed-thermal-cameras/hikmicro-hm-td2a37t-15-q/01-a95ba1e0b3f6.png',
  },
]

export default function Footer() {
  const params = useParams()
  const lang = params.lang as string
  const dict = useDictionary()

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  return (
    <footer className="site-footer">
      <div className="site-footer__shape-1 float-bob-x">
        <img src="/assets/images/shapes/site-footer-shape-1.png" alt="" />
      </div>
      <div
        className="site-footer__bg"
        style={{ backgroundImage: 'url(/assets/images/backgrounds/site-footer-bg.png)' }}
      ></div>
      <div className="site-footer__top">
        <div className="container">
          <div className="row">
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="footer-widget__column footer-widget__about">
                <div className="footer-widget__logo">
                  <Link href={getLocalizedHref('/')}>
                    <img src="/assets/images/resources/footer-logo.png" alt="" />
                  </Link>
                </div>
                <p className="footer-widget__about-text">
                  {dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit sed do eiusmod tempor incididunt ut labore.')}
                </p>
                <div className="site-footer__social">
                  <a href="#"><i className="fab fa-twitter"></i></a>
                  <a href="#"><i className="fab fa-facebook"></i></a>
                  <a href="#"><i className="fab fa-pinterest-p"></i></a>
                  <a href="#"><i className="fab fa-instagram"></i></a>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="footer-widget__column footer-widget__link">
                <div className="footer-widget__title-box">
                  <h3 className="footer-widget__title">{dict('Explore')}</h3>
                </div>
                <ul className="footer-widget__link-list list-unstyled">
                  <li><Link href={getLocalizedHref('/about')}>{dict('About')}</Link></li>
                  <li><Link href={getLocalizedHref('/team')}>{dict('Our Team')}</Link></li>
                  <li><Link href={getLocalizedHref('/contact')}>{dict('Contact')}</Link></li>
                </ul>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="footer-widget__column footer-widget__newsletter">
                <div className="footer-widget__title-box">
                  <h3 className="footer-widget__title">{dict('Newsletter')}</h3>
                </div>
                <form className="footer-widget__newsletter-form">
                  <div className="footer-widget__newsletter-form-input-box">
                    <input type="email" placeholder={dict('Your email')} name="EMAIL" />
                    <button type="submit" className="footer-widget__newsletter-btn">
                      <span className="fas fa-paper-plane"></span>
                    </button>
                  </div>
                </form>
                <ul className="footer-widget__Contact-list list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="fas fa-envelope"></span>
                    </div>
                    <div className="text">
                      <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fas fa-phone-square"></span>
                    </div>
                    <div className="text">
                      <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="footer-widget__column footer-widget__portfolio">
                <div className="footer-widget__title-box">
                  <h3 className="footer-widget__title">{dict('Gallery')}</h3>
                </div>
                <ul className="footer-widget__portfolio-list list-unstyled clearfix">
                  {footerGalleryItems.map((item) => (
                    <li key={item.slug}>
                      <div className="footer-widget__portfolio-img footer-widget__portfolio-img--product">
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                        />
                        <Link
                          href={getLocalizedHref(`/products/${item.slug}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={item.name}
                        >
                          <span className="fa fa-external-link-alt"></span>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="site-footer__bottom-inner">
                <p className="site-footer__bottom-text">
                  © Copyright {siteConfig.copyright.year} {siteConfig.company.name}. {siteConfig.copyright.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
