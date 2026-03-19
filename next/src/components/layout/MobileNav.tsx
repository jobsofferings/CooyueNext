'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { siteConfig } from '@/config/site.config'

export default function MobileNav() {
  const params = useParams()
  const lang = params.lang as string

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  return (
    <div className="mobile-nav__wrapper">
      <div className="mobile-nav__overlay mobile-nav__toggler"></div>
      <div className="mobile-nav__content">
        <span className="mobile-nav__close mobile-nav__toggler">
          <i className="fa fa-times"></i>
        </span>
        <div className="logo-box">
          <Link href={getLocalizedHref('/')} aria-label="logo image">
            <img src="/assets/images/resources/logo-2.png" width="135" alt="" />
          </Link>
        </div>
        <div className="mobile-nav__container"></div>
        <ul className="mobile-nav__contact list-unstyled">
          <li>
            <i className="fa fa-envelope"></i>
            <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
          </li>
          <li>
            <i className="fa fa-phone-alt"></i>
            <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a>
          </li>
        </ul>
        <div className="mobile-nav__top">
          <div className="mobile-nav__social">
            <a href="#" className="fab fa-twitter"></a>
            <a href="#" className="fab fa-facebook-square"></a>
            <a href="#" className="fab fa-pinterest-p"></a>
            <a href="#" className="fab fa-instagram"></a>
          </div>
        </div>
      </div>
    </div>
  )
}
