'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { siteConfig } from '@/config/site.config'
import { useDictionary } from '@/hooks/useDictionary'
import { useNavigation } from './NavigationProvider'

export default function Header() {
  const params = useParams()
  const lang = params.lang as string
  const dict = useDictionary()
  const { navItems, mobileOpen, setMobileOpen } = useNavigation()

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  useEffect(() => {
    const handleScroll = () => {
      document.querySelector('.stricky-header')?.classList.toggle('stricky-fixed', window.scrollY > 100)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const menuContent = (
        <div className="main-menu__wrapper">
          <div className="main-menu__wrapper-inner">
            <div className="main-menu__logo">
              <Link href={getLocalizedHref('/')}>
                <img src="/assets/images/resources/logo-1.png" alt="Logo" />
              </Link>
            </div>
            <div className="main-menu__call main-menu__call--text-only">
              <div className="main-menu__call-content">
                <p className="main-menu__call-sub-title">{dict('Call Anytime')}</p>
                <h5 className="main-menu__call-number">
                  <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a>
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
                            <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
                          </p>
                        </div>
                      </li>
                      <li>
                        <div className="icon">
                          <i className="fas fa-map-marker"></i>
                        </div>
                        <div className="text">
                          <p>{siteConfig.contact.address.en}</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="main-menu__top-right">
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
                    <button type="button" className="mobile-nav__toggler" aria-label={lang === 'zh' ? '打开菜单' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(true)}>
                      <i className="fa fa-bars"></i>
                    </button>
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
                    <div className="main-menu__lang-box">
                      <LanguageSwitcher />
                    </div>
                    <div className="main-menu__search-box">
                      <a
                        href={getLocalizedHref('/search')}
                        className="main-menu__search search-toggler icon-magnifying-glass"
                        aria-label={dict('search here')}
                      ></a>
                    </div>
                    <div className="main-menu__btn-box">
                      <Link href={getLocalizedHref('/contact')} className="thm-btn main-menu__btn">
                        {dict('Free Consultation')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  )

  return (
    <>
      <header className="main-header">
        <nav className="main-menu">{menuContent}</nav>
      </header>
      <div className="stricky-header stricked-menu main-menu">
        <div className="sticky-header__react-content">{menuContent}</div>
      </div>
    </>
  )
}
