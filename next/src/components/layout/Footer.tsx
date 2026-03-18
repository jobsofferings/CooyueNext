'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function Footer() {
  const params = useParams()
  const lang = params.lang as string

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
                  Lorem ipsum dolor sit amet, consect etur adi pisicing elit sed do eiusmod tempor
                  incididunt ut labore.
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
                  <h3 className="footer-widget__title">Explore</h3>
                </div>
                <ul className="footer-widget__link-list list-unstyled">
                  <li><Link href={getLocalizedHref('/services')}>Services</Link></li>
                  <li><Link href={getLocalizedHref('/about')}>About</Link></li>
                  <li><Link href={getLocalizedHref('/portfolio')}>Latest Projects</Link></li>
                  <li><Link href={getLocalizedHref('/team')}>Our Team</Link></li>
                  <li><Link href={getLocalizedHref('/contact')}>Contact</Link></li>
                </ul>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="footer-widget__column footer-widget__newsletter">
                <div className="footer-widget__title-box">
                  <h3 className="footer-widget__title">Newsletter</h3>
                </div>
                <form className="footer-widget__newsletter-form">
                  <div className="footer-widget__newsletter-form-input-box">
                    <input type="email" placeholder="Your email" name="EMAIL" />
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
                      <a href="mailto:needhelp@company.com">needhelp@company.com</a>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fas fa-phone-square"></span>
                    </div>
                    <div className="text">
                      <a href="tel:+926668880000">+92 (666) 888 0000</a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="footer-widget__column footer-widget__portfolio">
                <div className="footer-widget__title-box">
                  <h3 className="footer-widget__title">Gallery</h3>
                </div>
                <ul className="footer-widget__portfolio-list list-unstyled clearfix">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <li key={i}>
                      <div className="footer-widget__portfolio-img">
                        <img
                          src={`/assets/images/project/footer-widget-portfolio-img-${i}.jpg`}
                          alt=""
                        />
                        <a href="#">
                          <span className="fab fa-instagram"></span>
                        </a>
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
                  © Copyright {new Date().getFullYear()} Sinace. All Rights Reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
