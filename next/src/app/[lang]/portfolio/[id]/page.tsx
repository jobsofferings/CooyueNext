import { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'

interface PortfolioDetailPageProps {
  params: { lang: string; id: string }
}

export const metadata: Metadata = {
  title: 'Portfolio Details - Sinace',
  description: 'Project details',
}

export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  return (
    <>
      <PageHeader
        title="Portfolio Details"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Portfolio', href: '/portfolio' },
          { label: 'Portfolio Details' },
        ]}
      />

      <section className="portfolio-details">
        <div className="container">
          <div className="portfolio-details__img">
            <img src="/assets/images/project/portfolio-details-img-1.jpg" alt="" />
          </div>
          <div className="portfolio-details__content">
            <div className="row">
              <div className="col-xl-8 col-lg-7">
                <div className="portfolio-details__content-left">
                  <h3 className="portfolio-details__title">Financial Planning</h3>
                  <p className="portfolio-details__text-1">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                    nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p className="portfolio-details__text-2">
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                    fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <h3 className="portfolio-details__sub-title">Project Challenge</h3>
                  <p className="portfolio-details__text-3">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
                  </p>
                  <ul className="portfolio-details__points list-unstyled">
                    <li>
                      <div className="icon">
                        <span className="fa fa-check"></span>
                      </div>
                      <div className="text">
                        <p>Detailed market analysis and research</p>
                      </div>
                    </li>
                    <li>
                      <div className="icon">
                        <span className="fa fa-check"></span>
                      </div>
                      <div className="text">
                        <p>Strategic planning and implementation</p>
                      </div>
                    </li>
                    <li>
                      <div className="icon">
                        <span className="fa fa-check"></span>
                      </div>
                      <div className="text">
                        <p>Risk assessment and management</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-xl-4 col-lg-5">
                <div className="portfolio-details__content-right">
                  <div className="portfolio-details__details-box">
                    <h3 className="portfolio-details__details-title">Project Details</h3>
                    <ul className="portfolio-details__details-list list-unstyled">
                      <li>
                        <span>Client:</span>
                        <p>Acme Corporation</p>
                      </li>
                      <li>
                        <span>Category:</span>
                        <p>Finance</p>
                      </li>
                      <li>
                        <span>Date:</span>
                        <p>March 2023</p>
                      </li>
                      <li>
                        <span>Location:</span>
                        <p>New York, USA</p>
                      </li>
                      <li>
                        <span>Value:</span>
                        <p>$500,000</p>
                      </li>
                    </ul>
                    <div className="portfolio-details__social">
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
