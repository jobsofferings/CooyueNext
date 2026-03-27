import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'

interface TeamDetailPageProps {
  params: { lang: Locale; id: string }
}

export async function generateMetadata({ params }: TeamDetailPageProps): Promise<Metadata> {
  const dict = await getDictionary(params.lang)

  return {
    title: siteConfig.seo.titleTemplate(dict('Team Details')),
    description: dict('Team member details'),
    alternates: {
      canonical: `/${params.lang}/team/${params.id}`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/team/${params.id}`])
      ),
    },
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const dict = await getDictionary(params.lang)
  
  return (
    <>
      <PageHeader
        title={dict('Team Details')}
        breadcrumbs={[
          { label: dict('Home'), href: '/' },
          { label: dict('Team'), href: '/team' },
          { label: dict('Team Details') },
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
                    <h3 className="team-details__top-name">{dict('Jessica Brown')}</h3>
                    <p className="team-details__top-sub-title">{dict('Co founder & CEO')}</p>
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
                      {dict('I help my clients stand out and they help me grow.')}
                    </p>
                    <p className="team-details__top-text-2">
                      {dict('Lorem ipsum dolor sit amet, con adipiscing elit tiam convallis elit id impedie. Quisq commodo simply free ornare tortor.')}
                    </p>
                    <p className="team-details__top-text-3">
                      {dict('If you are going to use a passage of Lorem Ipsum, you need to be sure there isn\'t anything embarrassing hidden in the middle of text.')}
                    </p>
                    <div className="team-details__btn-box">
                      <Link href={`/${params.lang}/contact`} className="team-details__btn thm-btn">
                        {dict('Contact With Me')}
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
                  <h4 className="team-details__bottom-left-title">{dict('Personal experience')}</h4>
                  <p className="team-details__bottom-left-text">
                    {dict('If you are going to use a passage of Lorem Ipsum, you need to be sure there isn\'t anything embarrassing hidden.')}
                  </p>
                </div>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className="team-details__bottom-right">
                  <div className="team-details__progress">
                    <div className="team-details__progress-single">
                      <h4 className="team-details__progress-title">{dict('Consulting')}</h4>
                      <div className="bar">
                        <div className="bar-inner count-bar" style={{ width: '86%' }}>
                          <div className="count-text">86%</div>
                        </div>
                      </div>
                    </div>
                    <div className="team-details__progress-single">
                      <h4 className="team-details__progress-title">{dict('Finance')}</h4>
                      <div className="bar">
                        <div className="bar-inner count-bar" style={{ width: '63%' }}>
                          <div className="count-text">63%</div>
                        </div>
                      </div>
                    </div>
                    <div className="team-details__progress-single">
                      <h4 className="team-details__progress-title">{dict('Marketing')}</h4>
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
