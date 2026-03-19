import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { ServiceCard } from '@/components/ui'

const services = [
  {
    title: 'Capital Market',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-pie-chart',
    image: '/assets/images/services/services-page-1-1.jpg',
    hoverImage: '/assets/images/services/services-page-hover-img-1.jpg',
    href: '/services/capital-market',
  },
  {
    title: 'Insurance',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-insurance',
    image: '/assets/images/services/services-page-1-2.jpg',
    hoverImage: '/assets/images/services/services-page-hover-img-2.jpg',
    href: '/services/insurance',
  },
  {
    title: 'Mutual Funds',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-money-bag',
    image: '/assets/images/services/services-page-1-3.jpg',
    hoverImage: '/assets/images/services/services-page-hover-img-3.jpg',
    href: '/services/mutual-funds',
  },
  {
    title: 'Portfolio Management',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-profile',
    image: '/assets/images/services/services-page-1-4.jpg',
    hoverImage: '/assets/images/services/services-page-hover-img-4.jpg',
    href: '/services/portfolio-management',
  },
  {
    title: 'Fixed Income',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-income',
    image: '/assets/images/services/services-page-1-5.jpg',
    hoverImage: '/assets/images/services/services-page-hover-img-5.jpg',
    href: '/services/fixed-income',
  },
  {
    title: 'Loans',
    description: 'At vero eos et accusamus et iustoodio digni goikussimos ducimus qui blanp ditiis praesum voluum.',
    icon: 'icon-mortgage-loan',
    image: '/assets/images/services/services-page-1-6.jpg',
    hoverImage: '/assets/images/services/services-page-hover-img-6.jpg',
    href: '/services/loans',
  },
]

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Services'),
  description: 'Our professional services',
}

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Services"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Services' }]}
      />

      <section className="services-page">
        <div className="container">
          <div className="row">
            {services.map((service, index) => (
              <div key={index} className="col-xl-4 col-lg-6 col-md-6">
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
