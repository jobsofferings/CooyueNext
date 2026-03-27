import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle, TeamCard, TestimonialCard } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'

const getTeam = (dict: (key: string) => string) => [
  { name: dict('Kevin Martin'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-1.jpg', href: '/team/1' },
  { name: dict('Jessica Brown'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-2.jpg', href: '/team/2' },
  { name: dict('Mike Hardson'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-3.jpg', href: '/team/3' },
]

const getTestimonials = (dict: (key: string) => string) => [
  { name: dict('Mike Hardson'), role: dict('CO Founder'), content: dict('Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.'), image: '/assets/images/testimonial/testimonial-2-1.jpg' },
  { name: dict('Sarah Albert'), role: dict('CO Founder'), content: dict('Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.'), image: '/assets/images/testimonial/testimonial-2-2.jpg' },
]

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  return {
    title: siteConfig.seo.titleTemplate(dict('About')),
    description: dict('Learn more about our company'),
    alternates: {
      canonical: `/${lang}/about`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/about`])
      ),
    },
  }
}

export default async function AboutPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  const team = getTeam(dict)
  const testimonials = getTestimonials(dict)
  
  return (
    <>
      <PageHeader
        title={dict('About')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('About') }]}
      />

      <section className="about-four">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              <div className="about-four__left">
                <div className="about-four__img-box">
                  <div className="about-four__img">
                    <img src="/assets/images/resources/about-four-img-1.jpg" alt="" />
                  </div>
                  <div className="about-four__img-two">
                    <img src="/assets/images/resources/about-four-img-2.jpg" alt="" />
                  </div>
                  <div className="about-four__shape-1 img-bounce"></div>
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="about-four__right">
                <SectionTitle
                  tagline={dict('Welcome to agency')}
                  title={dict('Get to Know About Consultancy Company')}
                  highlight={dict('Company')}
                />
                <p className="about-four__text">
                  {dict('Lorem ipsum dolor sit am adipi we help you ensure everyone is in the right jobs sicing elit, sed do consulting firms Et leggings across the nation tempor.')}
                </p>
                <ul className="about-four__points list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Suspe ndisse suscipit sagittis leo.')}</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Entum estibulum dignissim posuere.')}</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Lorem Ipsum gene on the tend to repeat.')}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="expectation-one">
        <div
          className="expectation-one__bg jarallax"
          style={{ backgroundImage: 'url(/assets/images/backgrounds/expectation-one-bg.jpg)' }}
        ></div>
        <SectionTitle
          tagline={dict('Recent work lists')}
          title={dict('Consultancy Work that Meets Your Expectations')}
          highlight={dict('Expectations')}
          align="center"
        />
        <div className="expectation-one__inner">
          <div className="container">
            <ul className="expectation-one__points list-unstyled">
              <li>
                <div className="icon">
                  <span className="icon-strategy"></span>
                </div>
                <h3 className="expectation-one__title">{dict('Saving and Strategy')}</h3>
                <p className="expectation-one__text">
                  {dict('There are many variations of passages of available but the majority have suffered alteration in some form injected randomised words.')}
                </p>
              </li>
              <li>
                <div className="icon">
                  <span className="icon-conversation"></span>
                </div>
                <h3 className="expectation-one__title">{dict('HR Business Consulting')}</h3>
                <p className="expectation-one__text">
                  {dict('There are many variations of passages of available but the majority have suffered alteration in some form injected randomised words.')}
                </p>
              </li>
              <li>
                <div className="icon">
                  <span className="icon-planning"></span>
                </div>
                <h3 className="expectation-one__title">{dict('Business Planning')}</h3>
                <p className="expectation-one__text">
                  {dict('There are many variations of passages of available but the majority have suffered alteration in some form injected randomised words.')}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="team-one about-page-team">
        <div className="container">
          <div className="team-one__top">
            <div className="row">
              <div className="col-xl-7 col-lg-6">
                <SectionTitle
                  tagline={dict('meet our team')}
                  title={dict('Meet the People Behind')+' '+dict('the High')+' '+dict('Success')}
                  highlight={dict('Success')}
                />
              </div>
              <div className="col-xl-5 col-lg-6">
                <p className="team-one__text">
                  {dict('Lorem ipsum dolor sit amet, consectetur notted adipisicing elit sed do eiusmod tempor incididunt ut labore et simply free text dolore magna aliqua lonm andhn.')}
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

      <section className="testimonial-two about-page-testimonial">
        <div className="testimonial-two__bg-box">
          <div
            className="testimonial-two__bg"
            style={{ backgroundImage: 'url(/assets/images/backgrounds/testimonial-two-bg.png)' }}
          ></div>
        </div>
        <div className="container">
          <SectionTitle
            tagline={dict('our testimonials')}
            title={`${dict("What They're Talking About")} ${siteConfig.company.name}`}
            highlight={siteConfig.company.name}
            align="center"
          />
          <div className="testimonial-two__bottom">
            <div className="row">
              {testimonials.map((item, index) => (
                <div key={index} className="col-xl-6 col-lg-6">
                  <TestimonialCard {...item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
