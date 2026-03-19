import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { NewsCard } from '@/components/ui'

const news = [
  { title: 'Discover 10 ways to solve your business problems', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-1.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/1' },
  { title: 'Iterative approaches to corporate strategy data', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-2.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/2' },
  { title: 'Corporate strategy data foster to collabo', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-3.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/3' },
  { title: 'Get a few solutions to hire a best candidate', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-4.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/4' },
  { title: 'Basic rules of running a small web', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-5.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/5' },
  { title: 'Introducing the latest tech features for you', excerpt: 'Lorem ipsum dolor sit amet, consect etur adi pisicing elit.', image: '/assets/images/blog/news-1-6.jpg', date: '30 Mar, 2023', category: 'Business', comments: 2, href: '/news/6' },
]

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('News'),
  description: 'Latest news and updates',
}

export default function NewsPage() {
  return (
    <>
      <PageHeader
        title="News"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
      />

      <section className="news-page">
        <div className="container">
          <div className="row">
            {news.map((item, index) => (
              <div key={index} className="col-xl-4 col-lg-4 col-md-6">
                <NewsCard {...item} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
