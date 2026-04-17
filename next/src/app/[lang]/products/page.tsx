import Link from 'next/link'
import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import {
  getProductCategories,
  getProducts,
  toProductFamilySections,
} from '@/lib/products-api'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

export const revalidate = 300

const pageCopy: Record<
  Locale,
  {
    capability: {
      tagline: string
      title: string
      highlight: string
      description: string
      bullets: string[]
      metrics: Array<{ value: string; label: string }>
    }
    empty: string
    cta: {
      tagline: string
      title: string
      description: string
      button: string
    }
    viewLabel: string
  }
> = {
  zh: {
    capability: {
      tagline: '性能优势',
      title: '围绕精准探测构建可靠的产品能力',
      highlight: '精准探测',
      description:
        '从核心探测器到整机热管理，我们在图像细节、响应速度和环境适应性之间做完整协同，帮助项目更快交付。',
      bullets: [
        '支持多分辨率、多焦段与多接口平台快速适配',
        '面向安防、车载、边防与工业应用提供稳定图像输出',
        '支持二次开发与整机定制，缩短样机到量产的周期',
      ],
      metrics: [
        { value: '30mK', label: '最低热灵敏度' },
        { value: '4x', label: '电子变倍方案' },
        { value: 'IP66', label: '整机防护等级' },
        { value: '24h', label: '连续稳定工作' },
      ],
    },
    empty: '当前没有可展示的产品数据，请先在后台发布产品。',
    cta: {
      tagline: '项目对接',
      title: '需要匹配具体应用的红外产品方案？',
      description:
        '告诉我们探测距离、安装方式与平台接口，我们可以按项目需求推荐合适的机芯、镜头和整机组合。',
      button: '联系我们',
    },
    viewLabel: '查看详情',
  },
  en: {
    capability: {
      tagline: 'Capabilities',
      title: 'Reliable product engineering centered on precision detection',
      highlight: 'precision detection',
      description:
        'From detector performance to thermal management, each layer is tuned for sharper imagery, faster response, and dependable operation in the field.',
      bullets: [
        'Fast platform adaptation across resolutions, focal lengths, and interface standards',
        'Stable image output for security, vehicle, border, and industrial applications',
        'Customization support from evaluation units to production-ready system integration',
      ],
      metrics: [
        { value: '30mK', label: 'Minimum thermal sensitivity' },
        { value: '4x', label: 'Digital zoom workflow' },
        { value: 'IP66', label: 'Protection rating' },
        { value: '24h', label: 'Continuous operation' },
      ],
    },
    empty: 'No published products are available yet. Publish products in the management console first.',
    cta: {
      tagline: 'Project Fit',
      title: 'Need an infrared product stack matched to a real deployment?',
      description:
        'Share your detection range, mounting method, and platform interface requirements. We can recommend the right combination of core, lens, and complete system.',
      button: 'Contact Us',
    },
    viewLabel: 'View Detail',
  },
}

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const categories = await getProductCategories(lang)
  const copy = pageCopy[lang]
  const defaultDescription =
    categories.map((category) => category.description).filter(Boolean).join(' ') ||
    copy.capability.description

  const seoData = await getSeoByPath('/products', lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(lang === 'zh' ? '产品中心' : 'Products'),
    description: defaultDescription,
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    robots: seoMeta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.canonical || `/${lang}/products`,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
    },
    alternates: {
      canonical: seoMeta.canonical || `/${lang}/products`,
      languages: Object.fromEntries(i18n.locales.map((locale) => [locale, `/${locale}/products`])),
    },
  }
}

export default async function ProductsPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  const copy = pageCopy[lang]
  const [categories, products] = await Promise.all([getProductCategories(lang), getProducts(lang)])
  const sections = toProductFamilySections(categories, products)

  return (
    <>
      <PageHeader
        title={dict('Products')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('Products') }]}
      />

      <section className="grow-business products-capability">
        <div className="container">
          <div className="grow-business__inner">
            <div
              className="grow-business__bg"
              style={{ backgroundImage: 'url(/assets/images/backgrounds/grow-business-bg.jpg)' }}
            ></div>
            <div className="row">
              <div className="col-xl-6">
                <div className="grow-business__left">
                  <SectionTitle
                    tagline={copy.capability.tagline}
                    title={copy.capability.title}
                    highlight={copy.capability.highlight}
                  />
                  <p className="grow-business__text">{copy.capability.description}</p>
                  <ul className="grow-business__points list-unstyled">
                    {copy.capability.bullets.map((bullet) => (
                      <li key={bullet}>
                        <div className="icon">
                          <span className="fa fa-check"></span>
                        </div>
                        <div className="text">
                          <p>{bullet}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="col-xl-6">
                <div className="products-capability__metrics">
                  {copy.capability.metrics.map((metric) => (
                    <div key={metric.label} className="products-capability__metric">
                      <h3>{metric.value}</h3>
                      <p>{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="products-catalog">
        <div className="container">
          <SectionTitle
            tagline={lang === 'zh' ? '产品目录' : 'Catalog'}
            title={lang === 'zh' ? '按分类查看已发布产品' : 'Browse published products by category'}
            highlight={lang === 'zh' ? '已发布产品' : 'published products'}
            align="center"
          />
          {sections.length === 0 ? (
            <p className="text-center">{copy.empty}</p>
          ) : (
            <div className="products-catalog__list">
              {sections.map((section) => (
                <div
                  key={section.id}
                  id={section.id}
                  className="products-catalog__section products-anchor"
                >
                  <div className="products-catalog__section-header">
                    <div>
                      <h3 className="products-catalog__section-title">{section.name}</h3>
                      <p className="products-catalog__section-lead">{section.lead}</p>
                    </div>
                    <Link href={`/${lang}/contact`} className="products-catalog__header-link">
                      {copy.cta.button}
                      <span className="fa fa-angle-right"></span>
                    </Link>
                  </div>
                  <div className="row">
                    {section.products.map((product) => (
                      <div key={product.id} className="col-xl-4 col-lg-4 col-md-6">
                        <Link href={`/${lang}/products/${product.id}`} className="products-catalog__card">
                          <span className="products-catalog__card-label">{section.name}</span>
                          <h4 className="products-catalog__card-model">{product.model}</h4>
                          <p className="products-catalog__card-subtitle">{product.subtitle}</p>
                          <p className="products-catalog__card-description">{product.description}</p>
                          <ul className="products-catalog__specs list-unstyled">
                            {product.specs.map((spec) => (
                              <li key={spec}>
                                <span className="fa fa-check-circle"></span>
                                {spec}
                              </li>
                            ))}
                          </ul>
                          <span className="products-catalog__detail-link">
                            {copy.viewLabel}
                            <span className="fa fa-angle-right"></span>
                          </span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="products-cta">
        <div className="container">
          <div className="products-cta__inner">
            <div className="products-cta__shape float-bob-x"></div>
            <div className="products-cta__content">
              <span className="products-cta__tagline">{copy.cta.tagline}</span>
              <h2 className="products-cta__title">{copy.cta.title}</h2>
              <p className="products-cta__text">{copy.cta.description}</p>
            </div>
            <div className="products-cta__actions">
              <Link href={`/${lang}/contact`} className="thm-btn">
                {copy.cta.button}
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
