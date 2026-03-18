'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

interface PortfolioCardProps {
  title: string
  category: string
  image: string
  href: string
}

export default function PortfolioCard({ title, category, image, href }: PortfolioCardProps) {
  const params = useParams()
  const lang = params.lang as string
  const localizedHref = `/${lang}${href}`

  return (
    <div className="project-two__single">
      <div className="project-two__img">
        <img src={image} alt={title} />
      </div>
      <div className="project-two__content">
        <p className="project-two__sub-title">{category}</p>
        <h3 className="project-two__title">
          <Link href={localizedHref}>{title}</Link>
        </h3>
      </div>
      <div className="project-two__arrow">
        <Link href={localizedHref}>
          <span className="icon-right-arrow"></span>
        </Link>
      </div>
    </div>
  )
}
