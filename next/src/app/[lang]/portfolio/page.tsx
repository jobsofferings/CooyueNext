import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { PortfolioCard } from '@/components/ui'

const portfolios = [
  { title: 'Financial Planning', category: 'Finance', image: '/assets/images/project/project-2-1.jpg', href: '/portfolio/1' },
  { title: 'Business Growth', category: 'Business', image: '/assets/images/project/project-2-2.jpg', href: '/portfolio/2' },
  { title: 'Market Analysis', category: 'Marketing', image: '/assets/images/project/project-2-3.jpg', href: '/portfolio/3' },
  { title: 'Investment Strategy', category: 'Finance', image: '/assets/images/project/project-2-4.jpg', href: '/portfolio/4' },
  { title: 'Risk Management', category: 'Business', image: '/assets/images/project/project-2-5.jpg', href: '/portfolio/5' },
  { title: 'Corporate Consulting', category: 'Consulting', image: '/assets/images/project/project-2-6.jpg', href: '/portfolio/6' },
]

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Portfolio'),
  description: 'Our project portfolio',
}

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        title="Portfolio"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Portfolio' }]}
      />

      <section className="portfolio-page">
        <div className="container">
          <div className="row">
            {portfolios.map((item, index) => (
              <div key={index} className="col-xl-4 col-lg-4 col-md-6">
                <PortfolioCard {...item} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
