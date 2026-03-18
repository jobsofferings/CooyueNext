'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ServiceCardProps {
  title: string
  description: string
  icon: string
  image: string
  hoverImage: string
  href: string
}

export default function ServiceCard({
  title,
  description,
  icon,
  image,
  hoverImage,
  href,
}: ServiceCardProps) {
  const params = useParams()
  const lang = params.lang as string
  const localizedHref = `/${lang}${href}`

  return (
    <div className="services-page__single">
      <div className="services-page__img-box">
        <div className="services-page__img">
          <img src={image} alt={title} />
        </div>
        <div className="services-page__icon">
          <span className={icon}></span>
        </div>
      </div>
      <div className="services-page__content">
        <h3 className="services-page__title">
          <Link href={localizedHref}>{title}</Link>
        </h3>
        <p className="services-page__text">{description}</p>
        <Link href={localizedHref} className="services-page__read-more">
          Read More
        </Link>
      </div>
      <div className="services-page__hover-single">
        <div
          className="services-page__hover-img"
          style={{ backgroundImage: `url(${hoverImage})` }}
        ></div>
        <div className="services-page__hover-content-box">
          <div className="services-page__hover-icon">
            <span className={icon}></span>
          </div>
          <div className="services-page__hover-content">
            <h3 className="services-page__hover-title">
              <Link href={localizedHref}>{title}</Link>
            </h3>
            <p className="services-page__hover-text">{description}</p>
            <Link href={localizedHref} className="services-page__hover-read-more">
              Read More
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
