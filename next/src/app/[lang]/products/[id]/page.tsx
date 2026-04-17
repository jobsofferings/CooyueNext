import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import {
  getProductBySlug,
  getProducts,
  getRelatedProducts,
  toProductDetail,
} from '@/lib/products-api'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

export const revalidate = 300

const detailCopy: Record<
  Locale,
  {
    backLabel: string
    overviewTagline: string
    featuresTitle: string
    applicationsTitle: string
    specsTitle: string
    relatedTitle: string
    inquiryTitle: string
    inquiryText: string
    inquiryButton: string
    relatedButton: string
  }
> = {
  zh: {
    backLabel: '返回产品中心',
    overviewTagline: '产品详情',
    featuresTitle: '核心亮点',
    applicationsTitle: '典型应用',
    specsTitle: '关键规格',
    relatedTitle: '相关产品',
    inquiryTitle: '需要项目级方案支持？',
    inquiryText: '如果你已经确定了使用场景、探测距离或结构限制，我们可以基于当前产品进一步匹配方案。',
    inquiryButton: '联系销售团队',
    relatedButton: '查看详情',
  },
  en: {
    backLabel: 'Back to Products',
    overviewTagline: 'Product Detail',
    featuresTitle: 'Key Highlights',
    applicationsTitle: 'Typical Applications',
    specsTitle: 'Key Specs',
    relatedTitle: 'Related Products',
    inquiryTitle: 'Need project-fit solution support?',
    inquiryText:
      'If you already know the deployment scenario, target range, or integration limits, we can match this product to a more complete solution path.',
    inquiryButton: 'Talk to Sales',
    relatedButton: 'View Detail',
  },
}

interface ProductDetailPageProps {
  params: { lang: Locale; id: string }
}

export async function generateStaticParams() {
  const records = await Promise.all(i18n.locales.map((lang) => getProducts(lang)))

  return records.flatMap((items, index) =>
    items.map((product) => ({
      lang: i18n.locales[index],
      id: product.slug,
    }))
  )
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const record = await getProductBySlug(params.lang, decodeURIComponent(params.id))
  if (!record) {
    return {}
  }

  const product = toProductDetail(record)
  const seoData = await getSeoByPath(`/products/${params.id}`, params.lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(product.model),
    description: product.description,
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${params.lang}/products/${params.id}`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : [product.image],
    },
    alternates: {
      canonical: seoMeta.canonical || `/${params.lang}/products/${params.id}`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/products/${params.id}`])
      ),
    },
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const dict = await getDictionary(params.lang)
  const copy = detailCopy[params.lang]
  const slug = decodeURIComponent(params.id)
  const record = await getProductBySlug(params.lang, slug)

  if (!record) {
    notFound()
  }

  const product = toProductDetail(record)
  const relatedRecords = await getRelatedProducts(params.lang, slug)
  const relatedProducts = relatedRecords.map(toProductDetail)

  return (
    <>
      <PageHeader
        title={product.model}
        breadcrumbs={[
          { label: dict('Home'), href: '/' },
          { label: dict('Products'), href: '/products' },
          { label: product.model },
        ]}
      />

      <section className="product-detail-top">
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-6">
              <div className="product-detail-top__image">
                <img src={product.image} alt={product.model} />
              </div>
            </div>
            <div className="col-xl-6 col-lg-6">
              <div className="product-detail-top__content">
                <Link
                  href={`/${params.lang}/products#${product.familyId}`}
                  className="product-detail-top__back"
                >
                  <span className="fa fa-angle-left"></span>
                  {copy.backLabel}
                </Link>
                <span className="product-detail-top__family">{product.familyName}</span>
                <h2 className="product-detail-top__title">{product.model}</h2>
                <p className="product-detail-top__subtitle">{product.subtitle}</p>
                <p className="product-detail-top__description">{product.description}</p>
                <ul className="products-overview__badges list-unstyled">
                  {product.specs.map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
                <div className="product-detail-top__actions">
                  <Link href={`/${params.lang}/contact`} className="thm-btn">
                    {copy.inquiryButton}
                  </Link>
                  <a href={`tel:${siteConfig.contact.phone}`} className="product-detail-top__phone">
                    {siteConfig.contact.phoneDisplay}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-detail-overview">
        <div className="container">
          <div className="row">
            <div className="col-xl-7 col-lg-7">
              <SectionTitle
                tagline={copy.overviewTagline}
                title={`${product.model} ${product.subtitle}`}
                highlight={product.model}
              />
              <p className="product-detail-overview__intro">{product.intro}</p>
            </div>
            <div className="col-xl-5 col-lg-5">
              <div className="product-detail-overview__metrics">
                {product.metrics.map((metric) => (
                  <div key={`${metric.label}-${metric.value}`} className="product-detail-overview__metric">
                    <h3>{metric.value}</h3>
                    <p>{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-detail-panels">
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-6">
              <div className="product-detail-panel">
                <h3 className="product-detail-panel__title">{copy.featuresTitle}</h3>
                <ul className="product-detail-panel__list list-unstyled">
                  {product.highlights.map((item) => (
                    <li key={item}>
                      <span className="fa fa-check-circle"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="col-xl-6 col-lg-6">
              <div className="product-detail-panel">
                <h3 className="product-detail-panel__title">{copy.applicationsTitle}</h3>
                <ul className="product-detail-panel__list list-unstyled">
                  {product.applications.map((item) => (
                    <li key={item}>
                      <span className="fa fa-location-arrow"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-detail-specs">
        <div className="container">
          <SectionTitle
            tagline={copy.overviewTagline}
            title={copy.specsTitle}
            highlight={copy.specsTitle}
            align="center"
          />
          <div className="row">
            {product.specs.map((spec) => (
              <div key={spec} className="col-xl-4 col-lg-4 col-md-6">
                <div className="product-detail-specs__item">
                  <span className="product-detail-specs__icon fa fa-cog"></span>
                  <p>{spec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="products-catalog product-detail-related">
          <div className="container">
            <SectionTitle
              tagline={copy.overviewTagline}
              title={copy.relatedTitle}
              highlight={copy.relatedTitle}
              align="center"
            />
            <div className="row">
              {relatedProducts.map((item) => (
                <div key={item.id} className="col-xl-4 col-lg-4 col-md-6">
                  <Link href={`/${params.lang}/products/${item.id}`} className="products-catalog__card">
                    <span className="products-catalog__card-label">{item.familyName}</span>
                    <h4 className="products-catalog__card-model">{item.model}</h4>
                    <p className="products-catalog__card-subtitle">{item.subtitle}</p>
                    <p className="products-catalog__card-description">{item.description}</p>
                    <span className="products-catalog__detail-link">
                      {copy.relatedButton}
                      <span className="fa fa-angle-right"></span>
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="products-cta">
        <div className="container">
          <div className="products-cta__inner">
            <div className="products-cta__shape float-bob-x"></div>
            <div className="products-cta__content">
              <span className="products-cta__tagline">{copy.overviewTagline}</span>
              <h2 className="products-cta__title">{copy.inquiryTitle}</h2>
              <p className="products-cta__text">{copy.inquiryText}</p>
            </div>
            <div className="products-cta__actions">
              <Link href={`/${params.lang}/contact`} className="thm-btn">
                {copy.inquiryButton}
              </Link>
              <a href={`tel:${siteConfig.contact.phone}`} className="products-cta__phone">
                {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
