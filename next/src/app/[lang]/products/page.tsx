import Link from 'next/link'
import { Metadata } from 'next'
import ProductCatalog from '@/components/products/ProductCatalog'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import {
  getProductCategories,
  getProducts,
  type ProductCategoryRecord,
  toProductFamilySections,
} from '@/lib/products-api'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'
import { getCompanyContent } from '@/content/company'

export const revalidate = 300
export const dynamic = 'force-static'

export function generateStaticParams() {
  return i18n.locales.map((lang) => ({ lang }))
}

const INFRARED_ROOT_CATEGORY = 'infrared-products'

function getCatalogCategories(categories: ProductCategoryRecord[]) {
  return categories.filter(
    (category) =>
      category.slug === INFRARED_ROOT_CATEGORY || category.parent_slug === INFRARED_ROOT_CATEGORY
  )
}

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
    moreLabel: string
    lessLabel: string
  }
> = {
  zh: {
    capability: {
      tagline: '产品与项目支持',
      title: '围绕实际应用，选择合适的红外设备',
      highlight: '实际应用',
      description:
        '浏览红外摄像头、机芯、镜头与气体成像设备。Cooyue Tech 提供定制、销售及售后支持，具体配置和交付条件按项目确认。',
      bullets: [
        '从应用、型号、安装空间和接口开始梳理需求',
        '区分可询购产品与第三方参考资料，再确认可供方案',
        '通过邮件确认定制范围、价格、交期和售后条款',
      ],
      metrics: [
        { value: '定制', label: '按项目核对要求' },
        { value: '销售', label: '确认设备与配置' },
        { value: '售后', label: '按约定范围支持' },
        { value: '邮件', label: '海外主要联系渠道' },
      ],
    },
    empty: '暂时没有可展示的产品。请通过邮箱告诉我们你的需求。',
    cta: {
      tagline: '项目对接',
      title: '还没有确定型号？从应用需求开始',
      description:
        '发送应用、使用距离、安装方式、接口、数量与目的国家，我们会与你讨论产品方向和待确认问题。',
      button: '发送询盘',
    },
    viewLabel: '查看详情',
    moreLabel: '展开更多产品',
    lessLabel: '收起产品',
  },
  en: {
    capability: {
      tagline: 'Product and project support',
      title: 'Choose infrared equipment around your application',
      highlight: 'your application',
      description:
        'Explore infrared cameras, cores, lenses and gas imaging equipment. Cooyue Tech offers customization, sales and after-sales support, with configuration and delivery terms confirmed per project.',
      bullets: [
        'Start with your application, model, mounting space and interfaces',
        'Distinguish purchasing options from third-party reference information',
        'Confirm customization scope, pricing, lead time and support terms by email',
      ],
      metrics: [
        { value: 'Custom', label: 'Requirements reviewed together' },
        { value: 'Supply', label: 'Equipment and configuration' },
        { value: 'Support', label: 'Agreed after-sales scope' },
        { value: 'Email', label: 'Our primary contact channel' },
      ],
    },
    empty: 'No products are currently available to display. Email us with your requirements.',
    cta: {
      tagline: 'Project Fit',
      title: 'Not sure which model fits? Start with your application.',
      description:
        'Send your application, viewing distance, mounting method, interfaces, quantity and destination country. We can discuss product directions and open questions.',
      button: 'Send an inquiry',
    },
    viewLabel: 'View product details',
    moreLabel: 'Show more products',
    lessLabel: 'Show Less',
  },
}

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const defaultDescription = getCompanyContent(lang).description

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
  const sections = toProductFamilySections(getCatalogCategories(categories), products)

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
          <p className="text-center">
            <Link href={`/${lang}/search`} className="thm-btn">
              {lang === 'zh' ? '搜索产品 · 对比与询盘' : 'Find Products · Compare & Inquire'}
            </Link>
          </p>
          <SectionTitle
            tagline={lang === 'zh' ? '产品目录' : 'Catalog'}
            title={lang === 'zh' ? '按类别查看红外设备与组件' : 'Browse infrared equipment and components'}
            highlight={lang === 'zh' ? '红外设备与组件' : 'infrared equipment and components'}
            align="center"
          />
          <p className="catalog-reference-note">{getCompanyContent(lang).referenceText}</p>
          {sections.length === 0 ? (
            <p className="text-center">{copy.empty}</p>
          ) : (
            <ProductCatalog
              sections={sections}
              lang={lang}
              contactLabel={copy.cta.button}
              viewLabel={copy.viewLabel}
              moreLabel={copy.moreLabel}
              lessLabel={copy.lessLabel}
            />
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
              <a href={`mailto:${siteConfig.contact.email}`} className="products-cta__phone">
                {siteConfig.contact.email}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
