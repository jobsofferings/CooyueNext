import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { NewsCard } from '@/components/ui'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getNewsSeo, extractSeoMeta } from '@/lib/seo-api'

const getNews = (dict: (key: string) => string) => [
  { title: dict('Discover 10 ways to solve your business problems'), excerpt: dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit.'), image: '/assets/images/blog/news-1-1.jpg', date: dict('30 Mar, 2023'), category: dict('Business'), comments: 2, href: '/news/1' },
  { title: dict('Iterative approaches to corporate strategy data'), excerpt: dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit.'), image: '/assets/images/blog/news-1-2.jpg', date: dict('30 Mar, 2023'), category: dict('Business'), comments: 2, href: '/news/2' },
  { title: dict('Corporate strategy data foster to collabo'), excerpt: dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit.'), image: '/assets/images/blog/news-1-3.jpg', date: dict('30 Mar, 2023'), category: dict('Business'), comments: 2, href: '/news/3' },
  { title: dict('Get a few solutions to hire a best candidate'), excerpt: dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit.'), image: '/assets/images/blog/news-1-4.jpg', date: dict('30 Mar, 2023'), category: dict('Business'), comments: 2, href: '/news/4' },
  { title: dict('Basic rules of running a small web'), excerpt: dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit.'), image: '/assets/images/blog/news-1-5.jpg', date: dict('30 Mar, 2023'), category: dict('Business'), comments: 2, href: '/news/5' },
  { title: dict('Introducing the latest tech features for you'), excerpt: dict('Lorem ipsum dolor sit amet, consect etur adi pisicing elit.'), image: '/assets/images/blog/news-1-6.jpg', date: dict('30 Mar, 2023'), category: dict('Business'), comments: 2, href: '/news/6' },
]

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  // 尝试从数据库获取 SEO 数据
  const seoData = await getNewsSeo(lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('News')),
    description: dict('Latest news and updates'),
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${lang}/news`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
    },
    alternates: {
      canonical: seoMeta.canonical || `/${lang}/news`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/news`])
      ),
    },
  }
}

export default async function NewsPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  const news = getNews(dict)
  
  return (
    <>
      <PageHeader
        title={dict('News')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('News') }]}
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
