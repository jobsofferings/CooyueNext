import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { ServiceSidebar } from '@/components/ui'

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Mutual Funds'),
  description: 'Mutual funds consulting services',
}

export default function MutualFundsPage() {
  return (
    <>
      <PageHeader
        title="Mutual Funds"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: 'Mutual Funds' },
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
                    <span className="icon-money-bag"></span>
                  </div>
                </div>
                <h3 className="services-details__title-1">Mutual Funds</h3>
                <p className="services-details__text-1">
                  Lorem ipsum is simply free text used by copytyping refreshing. Neque porro est qui
                  dolorem ipsum quia quaed inventore veritatis et quasi architecto beatae vitae
                  dicta sunt explicabo.
                </p>
                <p className="services-details__text-2">
                  When an unknown printer took a galley of type and scrambled it to make a type
                  specimen book. It has survived not only five centuries, but also the leap into
                  electronic typesetting.
                </p>
                <div className="services-details__points-box">
                  <div className="row">
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="services-details__points-single">
                        <div className="services-details__points-icon">
                          <span className="icon-money-bag"></span>
                        </div>
                        <div className="services-details__points-content">
                          <h3>Equity Funds</h3>
                          <p>
                            Lorem ipsum dolor sit amet, consect etur adipisicing elit, sed do.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="services-details__points-single">
                        <div className="services-details__points-icon">
                          <span className="icon-income"></span>
                        </div>
                        <div className="services-details__points-content">
                          <h3>Debt Funds</h3>
                          <p>
                            Lorem ipsum dolor sit amet, consect etur adipisicing elit, sed do.
                          </p>
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
