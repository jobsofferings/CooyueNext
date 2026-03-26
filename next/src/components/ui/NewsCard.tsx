'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useDictionary } from '@/hooks/useDictionary'

interface NewsCardProps {
  title: string
  excerpt: string
  image: string
  date: string
  category: string
  comments: number
  href: string
}

export default function NewsCard({
  title,
  excerpt,
  image,
  date,
  category,
  comments,
  href,
}: NewsCardProps) {
  const params = useParams()
  const lang = params.lang as string
  const dict = useDictionary()
  const localizedHref = `/${lang}${href}`

  return (
    <div className="news-one__single">
      <div className="news-one__img-box">
        <div className="news-one__img">
          <img src={image} alt={title} />
          <Link href={localizedHref}>
            <span className="news-one__plus"></span>
          </Link>
        </div>
        <div className="news-one__date">
          <p>{date}</p>
        </div>
      </div>
      <div className="news-one__content">
        <ul className="news-one__meta list-unstyled">
          <li>
            <div className="icon">
              <span className="fas fa-tags"></span>
            </div>
            <div className="text">
              <p>{category}</p>
            </div>
          </li>
          <li>
            <span>/</span>
            <div className="icon">
              <span className="fas fa-comments"></span>
            </div>
            <div className="text">
              <p>{comments} {dict('Comments')}</p>
            </div>
          </li>
        </ul>
        <h3 className="news-one__title">
          <Link href={localizedHref}>{title}</Link>
        </h3>
        <p className="news-one__text">{excerpt}</p>
      </div>
      <div className="news-one__hover">
        <div className="news-one__hover-content">
          <h3 className="news-one__hover-title">
            <Link href={localizedHref}>{title}</Link>
          </h3>
          <p className="news-one__hover-text">{excerpt}</p>
        </div>
        <div className="news-one__hover-btn-box">
          <Link href={localizedHref}>
            {dict('Read More')}<span className="icon-right-arrow"></span>
          </Link>
        </div>
      </div>
    </div>
  )
}
