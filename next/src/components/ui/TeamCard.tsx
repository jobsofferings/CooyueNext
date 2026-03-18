'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

interface TeamCardProps {
  name: string
  role: string
  description: string
  image: string
  href: string
}

export default function TeamCard({ name, role, description, image, href }: TeamCardProps) {
  const params = useParams()
  const lang = params.lang as string
  const localizedHref = `/${lang}${href}`

  return (
    <div className="team-one__single">
      <div className="team-one__img-box">
        <div className="team-one__img">
          <img src={image} alt={name} />
        </div>
        <div className="team-one__hover-content">
          <div className="team-one__hover-arrow-box">
            <Link href={localizedHref} className="team-one__hover-arrow">
              <span className="fas fa-share-alt"></span>
            </Link>
            <ul className="list-unstyled team-one__social">
              <li>
                <a href="#">
                  <i className="fab fa-twitter"></i>
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fab fa-facebook"></i>
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fab fa-pinterest-p"></i>
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fab fa-instagram"></i>
                </a>
              </li>
            </ul>
          </div>
          <h3 className="team-one__hover-title">
            <Link href={localizedHref}>{name}</Link>
          </h3>
          <p className="team-one__hover-sub-title">{role}</p>
          <p className="team-one__hover-text">{description}</p>
        </div>
      </div>
      <div className="team-one__content">
        <div className="team-one__arrow-box">
          <Link href={localizedHref} className="team-one__arrow">
            <span className="fas fa-share-alt"></span>
          </Link>
        </div>
        <h3 className="team-one__title">
          <Link href={localizedHref}>{name}</Link>
        </h3>
        <p className="team-one__sub-title">{role}</p>
      </div>
    </div>
  )
}
