'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

const serviceCategories = [
  { title: 'Capital Market', href: '/services/capital-market' },
  { title: 'Insurance', href: '/services/insurance' },
  { title: 'Mutual Funds', href: '/services/mutual-funds' },
  { title: 'Portfolio Management', href: '/services/portfolio-management' },
  { title: 'Fixed Income', href: '/services/fixed-income' },
  { title: 'Loans', href: '/services/loans' },
]

export default function ServiceSidebar() {
  const params = useParams()
  const pathname = usePathname()
  const lang = params.lang as string

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  return (
    <div className="services-details__left">
      <div className="services-details__category">
        <h3 className="services-details__category-title">Categories</h3>
        <ul className="services-details__category-list list-unstyled">
          {serviceCategories.map((item) => {
            const localizedHref = getLocalizedHref(item.href)
            const isActive = pathname === localizedHref
            return (
              <li key={item.href} className={isActive ? 'active' : ''}>
                <Link href={localizedHref}>
                  {item.title}
                  <span className="icon-right-arrow"></span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="services-details__need-help">
        <div
          className="services-details__need-help-bg"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/need-help-bg.jpg)' }}
        ></div>
        <div className="services-details__need-help-shape-1 float-bob-x">
          <img src="/assets/images/shapes/need-help-shape-1.png" alt="" />
        </div>
        <div className="services-details__need-help-shape-2 float-bob-x">
          <img src="/assets/images/shapes/need-help-shape-2.png" alt="" />
        </div>
        <div className="services-details__need-help-shape-3 float-bob-y">
          <img src="/assets/images/shapes/need-help-shape-3.png" alt="" />
        </div>
        <div className="services-details__need-help-icon">
          <span className="icon-consultant"></span>
        </div>
        <h3 className="services-details__need-help-title">
          Looking
          <br /> for a Top
          <br /> Consulting?
        </h3>
        <div className="services-details__need-help-btn-box">
          <Link href={getLocalizedHref('/contact')} className="services-details__need-help-btn thm-btn">
            Contact Now
          </Link>
        </div>
      </div>
    </div>
  )
}
