import { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'

interface TeamDetailPageProps {
  params: { lang: string; id: string }
}

export const metadata: Metadata = {
  title: 'Team Details - Sinace',
  description: 'Team member details',
}

export default function TeamDetailPage({ params }: TeamDetailPageProps) {
  return (
    <>
      <PageHeader
        title="Team Details"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Team', href: '/team' },
          { label: 'Team Details' },
        ]}
      />

      <section className="team-details">
        <div className="container">
          <div className="team-details__top">
            <div className="row">
              <div className="col-xl-6 col-lg-6">
                <div className="team-details__left">
                  <div className="team-details__img">
                    <img src="/assets/images/team/team-details-img-1.jpg" alt="" />
                  </div>
                </div>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className="team-details__right">
                  <div className="team-details__top-content">
                    <h3 className="team-details__top-name">Jessica Brown</h3>
                    <p className="team-details__top-sub-title">Co founder & CEO</p>
                    <div className="team-details__social">
                      <a href="#">
                        <i className="fab fa-twitter"></i>
                      </a>
                      <a href="#">
                        <i className="fab fa-facebook"></i>
                      </a>
                      <a href="#">
                        <i className="fab fa-pinterest-p"></i>
                      </a>
                      <a href="#">
                        <i className="fab fa-instagram"></i>
                      </a>
                    </div>
                    <p className="team-details__top-text-1">
                      I help my clients stand out and they help me grow.
                    </p>
                    <p className="team-details__top-text-2">
                      Lorem ipsum dolor sit amet, con adipiscing elit tiam convallis elit id impedie.
                      Quisq commodo simply free ornare tortor.
                    </p>
                    <p className="team-details__top-text-3">
                      If you are going to use a passage of Lorem Ipsum, you need to be sure there
                      isn&apos;t anything embarrassing hidden in the middle of text.
                    </p>
                    <div className="team-details__btn-box">
                      <Link href={`/${params.lang}/contact`} className="team-details__btn thm-btn">
                        Contact With Me
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="team-details__bottom">
            <div className="row">
              <div className="col-xl-6 col-lg-6">
                <div className="team-details__bottom-left">
                  <h4 className="team-details__bottom-left-title">Personal experience</h4>
                  <p className="team-details__bottom-left-text">
                    If you are going to use a passage of Lorem Ipsum, you need to be sure there
                    isn&apos;t anything embarrassing hidden.
                  </p>
                </div>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className="team-details__bottom-right">
                  <div className="team-details__progress">
                    <div className="team-details__progress-single">
                      <h4 className="team-details__progress-title">Consulting</h4>
                      <div className="bar">
                        <div className="bar-inner count-bar" style={{ width: '86%' }}>
                          <div className="count-text">86%</div>
                        </div>
                      </div>
                    </div>
                    <div className="team-details__progress-single">
                      <h4 className="team-details__progress-title">Finance</h4>
                      <div className="bar">
                        <div className="bar-inner count-bar" style={{ width: '63%' }}>
                          <div className="count-text">63%</div>
                        </div>
                      </div>
                    </div>
                    <div className="team-details__progress-single">
                      <h4 className="team-details__progress-title">Marketing</h4>
                      <div className="bar">
                        <div className="bar-inner count-bar" style={{ width: '79%' }}>
                          <div className="count-text">79%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
