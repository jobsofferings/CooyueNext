'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { siteConfig } from '@/config/site.config'
import { useNavigation } from './NavigationProvider'

export default function MobileNav() {
  const params = useParams()
  const lang = params.lang as string
  const { navItems, mobileOpen, setMobileOpen } = useNavigation()
  const [expanded, setExpanded] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileOpen) { setExpanded(null); return }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel.current?.querySelector<HTMLButtonElement>('.mobile-nav__close')?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
      if (event.key !== 'Tab') return
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href], button') || []).filter((element) => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const handleResize = () => { if (window.innerWidth >= 1200) setMobileOpen(false) }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleResize)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [mobileOpen, setMobileOpen])

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  return (
    <div id="mobile-navigation" className={`mobile-nav__wrapper${mobileOpen ? ' expanded' : ''}`} aria-hidden={!mobileOpen}>
      <div className="mobile-nav__overlay" onClick={() => setMobileOpen(false)}></div>
      <div ref={panel} className="mobile-nav__content" role="dialog" aria-modal={mobileOpen || undefined} aria-label={lang === 'zh' ? '网站导航' : 'Site navigation'}>
        <button type="button" className="mobile-nav__close" aria-label={lang === 'zh' ? '关闭菜单' : 'Close menu'} onClick={() => setMobileOpen(false)}>
          <i className="fa fa-times"></i>
        </button>
        <div className="logo-box">
          <Link href={getLocalizedHref('/')} aria-label="logo image" onClick={() => setMobileOpen(false)}>
            <img src="/assets/images/resources/logo-2.png" width="135" alt="" />
          </Link>
        </div>
        <nav className="mobile-nav__container">
          <ul className="main-menu__list">
            {navItems.map((item, index) => (
              <li key={item.href} className={item.children?.length ? 'dropdown' : ''}>
                <div className="mobile-nav__item">
                  <Link href={getLocalizedHref(item.href)} onClick={() => setMobileOpen(false)}>{item.label}</Link>
                  {Boolean(item.children?.length) && <button type="button" aria-label={item.label} aria-expanded={expanded === item.href} aria-controls={`mobile-submenu-${index}`} onClick={() => setExpanded(expanded === item.href ? null : item.href)}><i className="fa fa-angle-down" /></button>}
                </div>
                {Boolean(item.children?.length) && <ul id={`mobile-submenu-${index}`} hidden={expanded !== item.href} style={{ display: expanded === item.href ? 'block' : 'none' }}>
                  {item.children?.map((child) => <li key={child.href}><Link href={getLocalizedHref(child.href)} onClick={() => setMobileOpen(false)}>{child.label}</Link></li>)}
                </ul>}
              </li>
            ))}
          </ul>
        </nav>
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
