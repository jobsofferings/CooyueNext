'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { siteConfig } from '@/config/site.config'
import { useDictionary } from '@/hooks/useDictionary'

interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

interface CategoryItem {
  slug: string
  name: string
}

const getNavItems = (
  dict: (key: string) => string,
  categories: CategoryItem[]
): NavItem[] => [
  {
    label: dict('Home'),
    href: '/'
  },
  {
    label: dict('Products'),
    href: '/products',
    children: categories.map((category) => ({
      label: category.name,
      href: `/products#${category.slug}`,
    })),
  },
  // {
  //   label: dict('Pages'),
  //   href: '#',
  //   children: [
  //     { label: dict('Our Team'), href: '/team' },
  //     { label: dict('Team Details'), href: '/team/1' },
  //     { label: dict('Testimonials'), href: '/testimonials' },
  //     { label: dict('Careers'), href: '/careers' },
  //     { label: dict('FAQs'), href: '/faq' },
  //   ],
  // },
  {
    label: dict('News'),
    href: '#',
    children: [
      { label: dict('News'), href: '/news' },
      { label: dict('News Details'), href: '/news/1' },
    ],
  },
  { label: dict('About'), href: '/about' },
  { label: dict('Contact'), href: '/contact' },
]

export default function Header() {
  const params = useParams()
  const lang = params.lang as string
  const dict = useDictionary()
  const [categories, setCategories] = useState<CategoryItem[]>([])

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  useEffect(() => {
    let cancelled = false

    fetch(`/api/products/categories?locale=${lang}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load categories: ${response.status}`)
        }
        return response.json()
      })
      .then((payload) => {
        if (!cancelled) {
          setCategories(Array.isArray(payload.data) ? payload.data : [])
        }
      })
      .catch((error) => {
        console.error('[Header] Failed to load product categories:', error)
        if (!cancelled) {
          setCategories([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [lang])

  const navItems = useMemo(() => getNavItems(dict, categories), [categories, dict])

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
                    <div className="main-menu__lang-box">
                      <LanguageSwitcher />
                    </div>
                    <div className="main-menu__search-box">
                      <a href="#" className="main-menu__search search-toggler icon-magnifying-glass"></a>
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
      </nav>
    </header>
  )
}
