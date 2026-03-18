import Link from 'next/link'
import { Locale } from '@/i18n-config'
import { Metadata } from 'next'
import { SectionTitle, ServiceCard, TeamCard, NewsCard } from '@/components/ui'

const services = [
  {
    title: 'Capital Market',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-pie-chart',
    image: '/assets/images/services/services-1-1.jpg',
    hoverImage: '/assets/images/services/services-1-1.jpg',
    href: '/services/capital-market',
  },
  {
    title: 'Insurance',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-insurance',
    image: '/assets/images/services/services-1-2.jpg',
    hoverImage: '/assets/images/services/services-1-2.jpg',
    href: '/services/insurance',
  },
  {
    title: 'Mutual Funds',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-money-bag',
    image: '/assets/images/services/services-1-3.jpg',
    hoverImage: '/assets/images/services/services-1-3.jpg',
    href: '/services/mutual-funds',
  },
]

const team = [
  { name: 'Kevin Martin', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-1.jpg', href: '/team/1' },
  { name: 'Jessica Brown', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-2.jpg', href: '/team/2' },
  { name: 'Mike Hardson', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-3.jpg', href: '/team/3' },
]

const news = [
  { title: 'Discover 10 ways to solve your business problems', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-1.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/1' },
  { title: 'Iterative approaches to corporate strategy data', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-2.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/2' },
  { title: 'Corporate strategy data foster to collabo', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-3.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/3' },
]

export default async function Home({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  return (
    <main>
      <section className="main-slider">
        <div
          className="main-slider__bg"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/main-slider-1-1.jpg)' }}
        ></div>
        <div className="container">
          <div className="main-slider__content">
            <div className="main-slider__sub-title-box">
              <p className="main-slider__sub-title">Welcome to sinace</p>
            </div>
            <h2 className="main-slider__title">
              Business <span>Consulting</span>
              <br /> Made Simple
            </h2>
            <p className="main-slider__text">
              We help your business grow with our professional consulting services.
            </p>
            <div className="main-slider__btn-box">
              <Link href={`/${lang}/about`} className="thm-btn main-slider__btn">
                Discover More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="services-one">
        <div className="container">
          <SectionTitle
            tagline="what we're offering"
            title="Services we're Offering"
            highlight="Offering"
            align="center"
          />
          <div className="row">
            {services.map((service, index) => (
              <div key={index} className="col-xl-4 col-lg-6 col-md-6">
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-one">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              <div className="about-one__left">
                <div className="about-one__img-box">
                  <div className="about-one__img">
                    <img src="/assets/images/resources/about-one-img-1.jpg" alt="" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="about-one__right">
                <SectionTitle
                  tagline="About company"
                  title="We Help Clients to Generate More Revenue"
                  highlight="Revenue"
                />
                <p className="about-one__text">
                  Lorem ipsum dolor sit am adipi we help you ensure everyone is in the right jobs
                  sicing elit, sed do consulting firms Et leggings across the nation tempor.
                </p>
                <ul className="about-one__points list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Suspe ndisse suscipit sagittis leo.</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Entum estibulum dignissim posuere.</p>
                    </div>
                  </li>
                </ul>
                <div className="about-one__btn-box">
                  <Link href={`/${lang}/about`} className="thm-btn about-one__btn">
                    Discover More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="team-one">
        <div className="container">
          <div className="team-one__top">
            <div className="row">
              <div className="col-xl-7 col-lg-6">
                <SectionTitle
                  tagline="meet our team"
                  title="Meet the People Behind the High Success"
                  highlight="Success"
                />
              </div>
              <div className="col-xl-5 col-lg-6">
                <p className="team-one__text">
                  Lorem ipsum dolor sit amet, consectetur notted adipisicing elit sed do eiusmod
                  tempor incididunt ut labore et simply free text dolore magna aliqua lonm andhn.
                </p>
              </div>
            </div>
          </div>
          <div className="team-one__bottom">
            <div className="row">
              {team.map((member, index) => (
                <div key={index} className="col-xl-4 col-lg-4">
                  <TeamCard {...member} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="news-one">
        <div className="container">
          <SectionTitle
            tagline="From the blog"
            title="News & Articles"
            highlight="Articles"
            align="center"
          />
          <div className="row">
            {news.map((item, index) => (
              <div key={index} className="col-xl-4 col-lg-4 col-md-6">
                <NewsCard {...item} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  return {
    title: 'Sinace - Business Consulting',
    description: 'Professional business consulting services',
  }
}
