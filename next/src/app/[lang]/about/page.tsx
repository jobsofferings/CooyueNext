import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle, TeamCard, TestimonialCard } from '@/components/ui'

const team = [
  { name: 'Kevin Martin', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-1.jpg', href: '/team/1' },
  { name: 'Jessica Brown', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-2.jpg', href: '/team/2' },
  { name: 'Mike Hardson', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-3.jpg', href: '/team/3' },
]

const testimonials = [
  { name: 'Mike Hardson', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-1.jpg' },
  { name: 'Sarah Albert', role: 'CO Founder', content: 'Exercitation ullamco laboris nisi ut aliquip ex ea ex commodo consequat duis aute aboris nisi ut aliquip irure reprehederit in voluptate velit esse.', image: '/assets/images/testimonial/testimonial-2-2.jpg' },
]

export const metadata: Metadata = {
  title: 'About - Sinace',
  description: 'Learn more about our company',
}

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
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
                  tagline="Welcome to agency"
                  title="Get to Know About Consultancy Company"
                  highlight="Company"
                />
                <p className="about-four__text">
                  Lorem ipsum dolor sit am adipi we help you ensure everyone is in the right jobs
                  sicing elit, sed do consulting firms Et leggings across the nation tempor.
                </p>
                <ul className="about-four__points list-unstyled">
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
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Lorem Ipsum gene on the tend to repeat.</p>
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
          tagline="Recent work lists"
          title="Consultancy Work that Meets Your Expectations"
          highlight="Expectations"
          align="center"
        />
        <div className="expectation-one__inner">
          <div className="container">
            <ul className="expectation-one__points list-unstyled">
              <li>
                <div className="icon">
                  <span className="icon-strategy"></span>
                </div>
                <h3 className="expectation-one__title">Saving and Strategy</h3>
                <p className="expectation-one__text">
                  There are many variations of passages of available but the majority have suffered
                  alteration in some form injected randomised words.
                </p>
              </li>
              <li>
                <div className="icon">
                  <span className="icon-conversation"></span>
                </div>
                <h3 className="expectation-one__title">HR Business Consulting</h3>
                <p className="expectation-one__text">
                  There are many variations of passages of available but the majority have suffered
                  alteration in some form injected randomised words.
                </p>
              </li>
              <li>
                <div className="icon">
                  <span className="icon-planning"></span>
                </div>
                <h3 className="expectation-one__title">Business Planning</h3>
                <p className="expectation-one__text">
                  There are many variations of passages of available but the majority have suffered
                  alteration in some form injected randomised words.
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

      <section className="testimonial-two about-page-testimonial">
        <div className="testimonial-two__bg-box">
          <div
            className="testimonial-two__bg"
            style={{ backgroundImage: 'url(/assets/images/backgrounds/testimonial-two-bg.png)' }}
          ></div>
        </div>
        <div className="container">
          <SectionTitle
            tagline="our testimonials"
            title="What They're Talking About Company"
            highlight="Company"
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
