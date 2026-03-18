'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  breadcrumbs: BreadcrumbItem[]
}

export default function PageHeader({ title, breadcrumbs }: PageHeaderProps) {
  const params = useParams()
  const lang = params.lang as string

  const getLocalizedHref = (href: string) => `/${lang}${href}`

  return (
    <section className="page-header">
      <div
        className="page-header__bg"
        style={{ backgroundImage: 'url(/assets/images/backgrounds/page-header-bg.jpg)' }}
      ></div>
      <div className="page-header__shape-2 float-bob-x">
        <img src="/assets/images/shapes/page-header-shape-2.png" alt="" />
      </div>
      <div className="page-header__shape-1 float-bob-y">
        <img src="/assets/images/shapes/page-header-shape-1.png" alt="" />
      </div>
      <div className="page-header__shape-3 float-bob-x">
        <img src="/assets/images/shapes/page-header-shape-3.png" alt="" />
      </div>
      <div className="container">
        <div className="page-header__inner">
          <h2>{title}</h2>
          <div className="thm-breadcrumb__inner">
            <ul className="thm-breadcrumb list-unstyled">
              {breadcrumbs.map((item, index) => (
                <li key={index}>
                  {index > 0 && <span>/</span>}
                  {item.href ? (
                    <Link href={getLocalizedHref(item.href)}>{item.label}</Link>
                  ) : (
                    item.label
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
