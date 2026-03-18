'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    children: [
      { label: 'Home One', href: '/' },
      { label: 'Home Two', href: '/home-2' },
      { label: 'Home Three', href: '/home-3' },
    ],
  },
  { label: 'About', href: '/about' },
  {
    label: 'Pages',
    href: '#',
    children: [
      { label: 'Our Team', href: '/team' },
      { label: 'Team Details', href: '/team/1' },
      { label: 'Testimonials', href: '/testimonials' },
      { label: 'Careers', href: '/careers' },
      { label: 'FAQs', href: '/faq' },
    ],
  },
  {
    label: 'Services',
    href: '#',
    children: [
      { label: 'Services', href: '/services' },
      { label: 'Capital Market', href: '/services/capital-market' },
      { label: 'Insurance', href: '/services/insurance' },
      { label: 'Mutual Funds', href: '/services/mutual-funds' },
      { label: 'Portfolio Management', href: '/services/portfolio-management' },
      { label: 'Fixed Income', href: '/services/fixed-income' },
      { label: 'Loans', href: '/services/loans' },
    ],
  },
  {
    label: 'Portfolio',
    href: '#',
    children: [
      { label: 'Portfolio', href: '/portfolio' },
      { label: 'Portfolio Details', href: '/portfolio/1' },
    ],
  },
  {
    label: 'News',
    href: '#',
    children: [
      { label: 'News', href: '/news' },
      { label: 'News Details', href: '/news/1' },
    ],
  },
  { label: 'Contact', href: '/contact' },
]

export default function Header() {
  const params = useParams()
  const lang = params.lang as string

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  return (
    <header className="main-header">
      <nav className="main-menu">
        <div className="main-menu__wrapper">
          <div className="main-menu__wrapper-inner">
            <div className="main-menu__logo">
              <Link href={getLocalizedHref('/')}>
                <img src="/assets/images/resources/logo-1.png" alt="Logo" />
              </Link>
            </div>
            <div className="main-menu__call">
              <div className="main-menu__call-icon">
                <span className="icon-telephone"></span>
              </div>
              <div className="main-menu__call-content">
                <p className="main-menu__call-sub-title">Call Anytime</p>
                <h5 className="main-menu__call-number">
                  <a href="tel:+928800-9850">+92 (8800)-9850</a>
                </h5>
              </div>
            </div>
            <div className="main-menu__wrapper-inner-content">
              <div className="main-menu__top">
                <div className="main-menu__top-inner">
                  <div className="main-menu__top-left">
                    <ul className="list-unstyled main-menu__contact-list">
                      <li>
                        <div className="icon">
                          <i className="fas fa-envelope"></i>
                        </div>
                        <div className="text">
                          <p>
                            <a href="mailto:needhelp@company.com">needhelp@company.com</a>
                          </p>
                        </div>
                      </li>
                      <li>
                        <div className="icon">
                          <i className="fas fa-map-marker"></i>
                        </div>
                        <div className="text">
                          <p>30 Broklyn Golden Street. New York</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="main-menu__top-right">
                    <ul className="list-unstyled main-menu__top-menu">
                      <li><Link href={getLocalizedHref('/about')}>About</Link></li>
                      <li><Link href={getLocalizedHref('/about')}>Help</Link></li>
                      <li><Link href={getLocalizedHref('/contact')}>Contact</Link></li>
                    </ul>
                    <div className="main-menu__social">
                      <a href="#"><i className="fab fa-twitter"></i></a>
                      <a href="#"><i className="fab fa-facebook"></i></a>
                      <a href="#"><i className="fab fa-pinterest-p"></i></a>
                      <a href="#"><i className="fab fa-instagram"></i></a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="main-menu__bottom">
                <div className="main-menu__bottom-inner">
                  <div className="main-menu__main-menu-box">
                    <a href="#" className="mobile-nav__toggler">
                      <i className="fa fa-bars"></i>
                    </a>
                    <ul className="main-menu__list">
                      {navItems.map((item) => (
                        <li key={item.label} className={item.children ? 'dropdown' : ''}>
                          <Link href={getLocalizedHref(item.href)}>{item.label}</Link>
                          {item.children && (
                            <ul className="sub-menu">
                              {item.children.map((child) => (
                                <li key={child.label}>
                                  <Link href={getLocalizedHref(child.href)}>{child.label}</Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="main-menu__right">
                    <div className="main-menu__search-box">
                      <a href="#" className="main-menu__search search-toggler icon-magnifying-glass"></a>
                    </div>
                    <div className="main-menu__btn-box">
                      <Link href={getLocalizedHref('/contact')} className="thm-btn main-menu__btn">
                        Free Consultation
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
