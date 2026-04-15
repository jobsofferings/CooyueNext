import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getNewsItemSeo, extractSeoMeta } from '@/lib/seo-api'

interface NewsDetailPageProps {
  params: { lang: Locale; id: string }
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const dict = await getDictionary(params.lang)

  // 尝试从数据库获取 SEO 数据 (使用 news-{id} 作为 key)
  const seoData = await getNewsItemSeo(params.lang, params.id)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('News Details')),
    description: dict('Read the full article'),
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${params.lang}/news/${params.id}`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
    },
    alternates: {
      canonical: seoMeta.canonical || `/${params.lang}/news/${params.id}`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/news/${params.id}`])
      ),
    },
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const dict = await getDictionary(params.lang)
  
  return (
    <>
      <PageHeader
        title={dict('News Details')}
        breadcrumbs={[
          { label: dict('Home'), href: '/' },
          { label: dict('News'), href: '/news' },
          { label: dict('News Details') },
        ]}
      />

      <section className="news-details">
        <div className="container">
          <div className="row">
            <div className="col-xl-8 col-lg-7">
              <div className="news-details__left">
                <div className="news-details__img">
                  <img src="/assets/images/blog/news-details-img-1.jpg" alt="" />
                  <div className="news-details__date">
                    <p>{dict('30 Mar, 2023')}</p>
                  </div>
                </div>
                <div className="news-details__content">
                  <ul className="news-details__meta list-unstyled">
                    <li>
                      <div className="icon">
                        <span className="fas fa-tags"></span>
                      </div>
                      <div className="text">
                        <p>{dict('Business')}</p>
                      </div>
                    </li>
                    <li>
                      <span>/</span>
                      <div className="icon">
                        <span className="fas fa-comments"></span>
                      </div>
                      <div className="text">
                        <p>2 {dict('Comments')}</p>
                      </div>
                    </li>
                  </ul>
                  <h3 className="news-details__title">
                    {dict('Discover 10 ways to solve your business problems')}
                  </h3>
                  <p className="news-details__text-1">
                    {dict('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.')}
                  </p>
                  <p className="news-details__text-2">
                    {dict('Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.')}
                  </p>
                  <div className="news-details__quote">
                    <p>
                      &ldquo;{dict('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.')}&rdquo;
                    </p>
                    <span className="news-details__quote-name">{dict('- John Doe')}</span>
                  </div>
                  <p className="news-details__text-3">
                    {dict('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.')}
                  </p>
                </div>
                <div className="news-details__bottom">
                  <p className="news-details__tags">
                    <span>{dict('Tags')}</span>
                    <a href="#">{dict('Business')}</a>
                    <a href="#">{dict('Finance')}</a>
                    <a href="#">{dict('Consulting')}</a>
                  </p>
                  <div className="news-details__social">
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
            <div className="col-xl-4 col-lg-5">
              <div className="sidebar">
                <div className="sidebar__single sidebar__search">
                  <form className="sidebar__search-form">
                    <input type="search" placeholder={dict('Search here')} />
                    <button type="submit">
                      <i className="icon-magnifying-glass"></i>
                    </button>
                  </form>
                </div>
                <div className="sidebar__single sidebar__category">
                  <h3 className="sidebar__title">{dict('Categories')}</h3>
                  <ul className="sidebar__category-list list-unstyled">
                    <li>
                      <Link href={`/${params.lang}/news`}>
                        {dict('Business')} <span className="icon-right-arrow"></span>
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${params.lang}/news`}>
                        {dict('Finance')} <span className="icon-right-arrow"></span>
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${params.lang}/news`}>
                        {dict('Consulting')} <span className="icon-right-arrow"></span>
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${params.lang}/news`}>
                        {dict('Marketing')} <span className="icon-right-arrow"></span>
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="sidebar__single sidebar__post">
                  <h3 className="sidebar__title">{dict('Latest Posts')}</h3>
                  <ul className="sidebar__post-list list-unstyled">
                    {[1, 2, 3].map((i) => (
                      <li key={i}>
                        <div className="sidebar__post-image">
                          <img src={`/assets/images/blog/lp-1-${i}.jpg`} alt="" />
                        </div>
                        <div className="sidebar__post-content">
                          <p className="sidebar__post-date">{dict('30 Mar, 2023')}</p>
                          <h3>
                            <Link href={`/${params.lang}/news/${i}`}>
                              {dict('Basic rules of running a small web')}
                            </Link>
                          </h3>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
