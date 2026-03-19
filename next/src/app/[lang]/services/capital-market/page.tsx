import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { ServiceSidebar } from '@/components/ui'

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Capital Market'),
  description: 'Capital market consulting services',
}

export default function CapitalMarketPage() {
  return (
    <>
      <PageHeader
        title="Capital Market"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: 'Capital Market' },
        ]}
      />

      <section className="services-details">
        <div className="container">
          <div className="row">
            <div className="col-xl-4 col-lg-5">
              <ServiceSidebar />
            </div>
            <div className="col-xl-8 col-lg-7">
              <div className="services-details__right">
                <div className="services-details__img">
                  <img src="/assets/images/services/services-details-img-2.jpg" alt="" />
                  <div className="services-details__icon">
                    <span className="icon-pie-chart"></span>
                  </div>
                </div>
                <h3 className="services-details__title-1">Capital Market</h3>
                <p className="services-details__text-1">
                  Lorem ipsum is simply free text used by copytyping refreshing. Neque porro est qui
                  dolorem ipsum quia quaed inventore veritatis et quasi architecto beatae vitae
                  dicta sunt explicabo. Aelltes port lacus quis enim var sed efficitur turpis gilla
                  sed sit amet finibus eros. Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry.
                </p>
                <p className="services-details__text-2">
                  When an unknown printer took a galley of type and scrambled it to make a type
                  specimen book. It has survived not only five centuries, but also the leap into
                  electronic typesetting, remaining essentially unchanged.
                </p>
                <div className="services-details__points-box">
                  <div className="row">
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="services-details__points-single">
                        <div className="services-details__points-icon">
                          <span className="icon-business"></span>
                        </div>
                        <div className="services-details__points-content">
                          <h3>Market Analysis</h3>
                          <p>
                            Lorem ipsum dolor sit amet, consect etur adipisicing elit, sed do.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="services-details__points-single">
                        <div className="services-details__points-icon">
                          <span className="icon-research"></span>
                        </div>
                        <div className="services-details__points-content">
                          <h3>Investment Strategy</h3>
                          <p>
                            Lorem ipsum dolor sit amet, consect etur adipisicing elit, sed do.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="services-details__benefit">
                  <div className="row">
                    <div className="col-xl-6 col-lg-6">
                      <div className="services-details__benefit-img">
                        <img src="/assets/images/services/services-details-benefit-img.jpg" alt="" />
                      </div>
                    </div>
                    <div className="col-xl-6 col-lg-6">
                      <div className="services-details__benefit-content">
                        <h3 className="services-details__benefit-title">Our Benefits</h3>
                        <p className="services-details__benefit-text">
                          Duis aute irure dolor in simply free text available in market reprehenderit.
                        </p>
                        <ul className="services-details__benefit-list list-unstyled">
                          <li>
                            <div className="icon">
                              <span className="fa fa-check"></span>
                            </div>
                            <div className="text">
                              <p>Expert market analysis</p>
                            </div>
                          </li>
                          <li>
                            <div className="icon">
                              <span className="fa fa-check"></span>
                            </div>
                            <div className="text">
                              <p>Risk management</p>
                            </div>
                          </li>
                          <li>
                            <div className="icon">
                              <span className="fa fa-check"></span>
                            </div>
                            <div className="text">
                              <p>Portfolio optimization</p>
                            </div>
                          </li>
                        </ul>
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
