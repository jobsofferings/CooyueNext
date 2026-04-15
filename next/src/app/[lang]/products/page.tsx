import Link from 'next/link'
import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

type Family = {
  id: string
  icon: string
  image: string
  name: string
  summary: string
  badges: string[]
}

type ProductCard = {
  id: string
  model: string
  subtitle: string
  description: string
  specs: string[]
}

type FamilySection = {
  id: string
  name: string
  lead: string
  products: ProductCard[]
}

type ProductsContent = {
  hero: {
    description: string
  }
  overview: {
    tagline: string
    title: string
    highlight: string
    families: Family[]
  }
  capability: {
    tagline: string
    title: string
    highlight: string
    description: string
    bullets: string[]
    metrics: Array<{ value: string; label: string }>
  }
  catalog: {
    tagline: string
    title: string
    highlight: string
    viewLabel: string
    sections: FamilySection[]
  }
  cta: {
    tagline: string
    title: string
    description: string
    button: string
  }
}

const productsContent: Record<Locale, ProductsContent> = {
  zh: {
    hero: {
      description: '覆盖机芯、镜头、目镜与整机系统的一体化红外产品矩阵，适配安防监控、边海防、工业测温与夜视观测等场景。',
    },
    overview: {
      tagline: '产品矩阵',
      title: '面向多场景的红外摄像产品体系',
      highlight: '红外摄像',
      families: [
        {
          id: 'cores',
          icon: 'fas fa-microchip',
          image: '/assets/images/services/services-1-1.jpg',
          name: '机芯',
          summary: '提供高灵敏度非制冷红外机芯，适合云台、枪机与定制载荷集成。',
          badges: ['640x512', '12um', 'NETD < 30mK'],
        },
        {
          id: 'lenses',
          icon: 'fas fa-bullseye',
          image: '/assets/images/services/services-1-2.jpg',
          name: '镜头',
          summary: '覆盖广角到长焦焦段，兼顾透过率、成像均匀性与环境可靠性。',
          badges: ['9-75mm', '低畸变', '抗震设计'],
        },
        {
          id: 'eyepieces',
          icon: 'fas fa-binoculars',
          image: '/assets/images/services/services-1-3.jpg',
          name: '目镜',
          summary: '适配观察型热像产品，兼顾舒适目距、高清显示与长时使用体验。',
          badges: ['OLED', '高对比', '轻量化'],
        },
        {
          id: 'systems',
          icon: 'fas fa-video',
          image: '/assets/images/services/services-1-4.jpg',
          name: '整机系统',
          summary: '整合红外模组、可见光与智能算法，快速部署到复杂监控任务中。',
          badges: ['双光融合', 'AI 识别', '全天候'],
        },
      ],
    },
    capability: {
      tagline: '性能优势',
      title: '围绕精准探测构建可靠的产品能力',
      highlight: '精准探测',
      description: '从核心探测器到整机热管理，我们在图像细节、响应速度和环境适应性之间做完整协同，帮助项目更快交付。',
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
    catalog: {
      tagline: '核心产品',
      title: '按产品类型快速查看方案组合',
      highlight: '方案组合',
      viewLabel: '查看详情',
      sections: [
        {
          id: 'cores',
          name: '机芯',
          lead: '面向整机集成、轻量化终端和行业定制方案的核心热像模组。',
          products: [
            {
              id: 'cy-640m',
              model: 'CY-640M',
              subtitle: '高分辨率红外机芯',
              description: '适用于中远距离目标识别与高端双光云台项目。',
              specs: ['640x512 / 12um', '50Hz 实时输出', '支持视频与串口控制'],
            },
            {
              id: 'cy-384s',
              model: 'CY-384S',
              subtitle: '紧凑型机芯',
              description: '在尺寸、功耗与成本之间保持平衡，适合批量整机产品。',
              specs: ['384x288 / 17um', '低功耗设计', '板级快速集成'],
            },
            {
              id: 'cy-lwir-pro',
              model: 'CY-LWIR Pro',
              subtitle: '开发平台机芯',
              description: '预留丰富接口，适配算法验证、二开和行业设备对接。',
              specs: ['MIPI / USB / CVBS', 'SDK 支持', '多种测温扩展'],
            },
          ],
        },
        {
          id: 'lenses',
          name: '镜头',
          lead: '针对不同视场角和探测距离，提供稳定透过率与结构可靠性的镜头组合。',
          products: [
            {
              id: 'ir-lens-9mm',
              model: 'IR Lens 9mm',
              subtitle: '广角监控镜头',
              description: '适合近距离大视场周界监控和辅助感知场景。',
              specs: ['大视场覆盖', '低畸变优化', '适配 12um 芯片'],
            },
            {
              id: 'ir-lens-19mm',
              model: 'IR Lens 19mm',
              subtitle: '标准焦段镜头',
              description: '兼顾探测距离和画面范围，适配通用安防整机。',
              specs: ['均衡成像', 'F1.0 透过率', '紧凑结构'],
            },
            {
              id: 'ir-lens-35mm',
              model: 'IR Lens 35mm',
              subtitle: '中长焦镜头',
              description: '面向中远距离识别任务，适合边防和制高点部署。',
              specs: ['更远识别距离', '金属镜筒', '抗冲击设计'],
            },
          ],
        },
        {
          id: 'eyepieces',
          name: '目镜',
          lead: '提升观察舒适度和显示细节，服务于手持、瞄准与便携观测设备。',
          products: [
            {
              id: 'eo-039',
              model: 'EO-0.39',
              subtitle: '轻量型热像目镜',
              description: '面向便携设备，兼顾重量控制与基础显示效果。',
              specs: ['紧凑结构', '舒适目距', '适配小型终端'],
            },
            {
              id: 'eo-05-hd',
              model: 'EO-0.5 HD',
              subtitle: '高清显示目镜',
              description: '增强细节观察体验，适合高像质观察类产品。',
              specs: ['高清 OLED', '高对比显示', '长时佩戴舒适'],
            },
            {
              id: 'eo-dual-view',
              model: 'EO-Dual View',
              subtitle: '双模式目镜组件',
              description: '支持观测和记录协同输出，提升现场使用效率。',
              specs: ['观察录制同步', '防雾设计', '模块化安装'],
            },
          ],
        },
        {
          id: 'systems',
          name: '整机系统',
          lead: '聚焦直接部署的红外整机设备，减少项目集成成本并提升交付效率。',
          products: [
            {
              id: 'ptz-300',
              model: 'PTZ-300',
              subtitle: '双光云台摄像机',
              description: '集成红外与可见光模组，适合周界、园区和制高点监控。',
              specs: ['双光联动', '智能预置位', '全天候巡航'],
            },
            {
              id: 'borderscope-x2',
              model: 'BorderScope X2',
              subtitle: '边海防监控终端',
              description: '面向复杂环境连续值守，强化夜间发现与告警能力。',
              specs: ['长距离探测', '告警联动', '低温稳定运行'],
            },
            {
              id: 'vehiclecam-v5',
              model: 'VehicleCam V5',
              subtitle: '车载热像相机',
              description: '为移动平台提供稳定热视频与夜间辅助识别能力。',
              specs: ['抗震动设计', '宽温工作', '低延迟输出'],
            },
          ],
        },
      ],
    },
    cta: {
      tagline: '项目对接',
      title: '需要匹配具体应用的红外产品方案？',
      description: '告诉我们探测距离、安装方式与平台接口，我们可以按项目需求推荐合适的机芯、镜头和整机组合。',
      button: '联系我们',
    },
  },
  en: {
    hero: {
      description: 'An integrated infrared product portfolio across cores, lenses, eyepieces, and complete systems for surveillance, border security, industrial thermography, and night observation.',
    },
    overview: {
      tagline: 'Product Portfolio',
      title: 'Infrared camera lines built for multiple deployment scenarios',
      highlight: 'Infrared camera',
      families: [
        {
          id: 'cores',
          icon: 'fas fa-microchip',
          image: '/assets/images/services/services-1-1.jpg',
          name: 'Cores',
          summary: 'High-sensitivity uncooled thermal cores for PTZs, box cameras, and custom payload integration.',
          badges: ['640x512', '12um', 'NETD < 30mK'],
        },
        {
          id: 'lenses',
          icon: 'fas fa-bullseye',
          image: '/assets/images/services/services-1-2.jpg',
          name: 'Lenses',
          summary: 'Wide-to-tele focal lengths with strong transmission, image uniformity, and field reliability.',
          badges: ['9-75mm', 'Low distortion', 'Shock resistant'],
        },
        {
          id: 'eyepieces',
          icon: 'fas fa-binoculars',
          image: '/assets/images/services/services-1-3.jpg',
          name: 'Eyepieces',
          summary: 'Observation-grade eyepieces optimized for eye relief, display clarity, and long-duration comfort.',
          badges: ['OLED', 'High contrast', 'Lightweight'],
        },
        {
          id: 'systems',
          icon: 'fas fa-video',
          image: '/assets/images/services/services-1-4.jpg',
          name: 'Systems',
          summary: 'Complete thermal systems combining infrared modules, visible light, and onboard intelligence.',
          badges: ['Dual spectrum', 'AI analytics', 'All-weather'],
        },
      ],
    },
    capability: {
      tagline: 'Capabilities',
      title: 'Reliable product engineering centered on precision detection',
      highlight: 'precision detection',
      description: 'From detector performance to thermal management, each layer is tuned for sharper imagery, faster response, and dependable operation in the field.',
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
    catalog: {
      tagline: 'Core Lines',
      title: 'Browse solution groups by product type',
      highlight: 'solution groups',
      viewLabel: 'View Detail',
      sections: [
        {
          id: 'cores',
          name: 'Cores',
          lead: 'Thermal imaging modules for integrators, compact devices, and industry-specific payload development.',
          products: [
            {
              id: 'cy-640m',
              model: 'CY-640M',
              subtitle: 'High-resolution thermal core',
              description: 'Designed for mid-to-long range identification and premium dual-spectrum PTZ projects.',
              specs: ['640x512 / 12um', '50Hz live output', 'Video and serial control'],
            },
            {
              id: 'cy-384s',
              model: 'CY-384S',
              subtitle: 'Compact thermal core',
              description: 'Balanced for size, power, and cost in volume-ready thermal camera platforms.',
              specs: ['384x288 / 17um', 'Low-power design', 'Board-level integration'],
            },
            {
              id: 'cy-lwir-pro',
              model: 'CY-LWIR Pro',
              subtitle: 'Development platform core',
              description: 'Rich interfaces for algorithm validation, OEM customization, and rapid system bring-up.',
              specs: ['MIPI / USB / CVBS', 'SDK support', 'Temperature measurement options'],
            },
          ],
        },
        {
          id: 'lenses',
          name: 'Lenses',
          lead: 'Infrared lens options matched to field of view, target distance, and long-term structural reliability.',
          products: [
            {
              id: 'ir-lens-9mm',
              model: 'IR Lens 9mm',
              subtitle: 'Wide-angle surveillance lens',
              description: 'Built for near-range perimeter coverage and wide-scene thermal awareness.',
              specs: ['Wide field coverage', 'Low distortion tuning', 'Compatible with 12um sensors'],
            },
            {
              id: 'ir-lens-19mm',
              model: 'IR Lens 19mm',
              subtitle: 'Standard focal lens',
              description: 'A balanced choice for mainstream security deployments and general thermal imaging.',
              specs: ['Balanced imaging', 'F1.0 transmission', 'Compact package'],
            },
            {
              id: 'ir-lens-35mm',
              model: 'IR Lens 35mm',
              subtitle: 'Mid-tele lens',
              description: 'Optimized for longer-range recognition in border and elevated surveillance positions.',
              specs: ['Extended reach', 'Metal housing', 'Impact-resistant structure'],
            },
          ],
        },
        {
          id: 'eyepieces',
          name: 'Eyepieces',
          lead: 'Display-side assemblies focused on comfort and image clarity for handheld and observation devices.',
          products: [
            {
              id: 'eo-039',
              model: 'EO-0.39',
              subtitle: 'Lightweight thermal eyepiece',
              description: 'Compact and efficient for portable thermal instruments and lightweight terminals.',
              specs: ['Compact assembly', 'Comfortable eye relief', 'Small-device ready'],
            },
            {
              id: 'eo-05-hd',
              model: 'EO-0.5 HD',
              subtitle: 'High-definition eyepiece',
              description: 'Improves visual detail for products where observation quality is the primary priority.',
              specs: ['HD OLED', 'High contrast', 'Comfort for extended use'],
            },
            {
              id: 'eo-dual-view',
              model: 'EO-Dual View',
              subtitle: 'Dual-mode eyepiece module',
              description: 'Supports observation and recording workflows in the same field-ready optical package.',
              specs: ['View and record sync', 'Anti-fog design', 'Modular mounting'],
            },
          ],
        },
        {
          id: 'systems',
          name: 'Systems',
          lead: 'Deployment-ready infrared systems that reduce integration effort and accelerate project delivery.',
          products: [
            {
              id: 'ptz-300',
              model: 'PTZ-300',
              subtitle: 'Dual-spectrum PTZ camera',
              description: 'Combines thermal and visible modules for perimeter, campus, and high-point surveillance.',
              specs: ['Dual-spectrum fusion', 'Smart presets', 'All-weather patrol'],
            },
            {
              id: 'borderscope-x2',
              model: 'BorderScope X2',
              subtitle: 'Border monitoring terminal',
              description: 'Built for continuous duty in harsh environments with stronger night discovery performance.',
              specs: ['Long-range detection', 'Alarm linkage', 'Low-temperature stability'],
            },
            {
              id: 'vehiclecam-v5',
              model: 'VehicleCam V5',
              subtitle: 'Vehicle thermal camera',
              description: 'Delivers reliable thermal video and night assistance for mobile platforms.',
              specs: ['Anti-vibration design', 'Wide temperature range', 'Low-latency output'],
            },
          ],
        },
      ],
    },
    cta: {
      tagline: 'Project Fit',
      title: 'Need an infrared product stack matched to a real deployment?',
      description: 'Share your detection range, mounting method, and platform interface requirements. We can recommend the right combination of core, lens, and complete system.',
      button: 'Contact Us',
    },
  },
}

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)
  const content = productsContent[lang]

  const seoData = await getSeoByPath('/products', lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('Products')),
    description: content.hero.description,
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
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/products`])
      ),
    },
  }
}

export default async function ProductsPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  const content = productsContent[lang]

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
                    tagline={content.capability.tagline}
                    title={content.capability.title}
                    highlight={content.capability.highlight}
                  />
                  <p className="grow-business__text">{content.capability.description}</p>
                  <ul className="grow-business__points list-unstyled">
                    {content.capability.bullets.map((bullet) => (
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
                  {content.capability.metrics.map((metric) => (
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
            tagline={content.catalog.tagline}
            title={content.catalog.title}
            highlight={content.catalog.highlight}
            align="center"
          />
          <div className="products-catalog__list">
            {content.catalog.sections.map((section) => (
              <div key={section.id} id={section.id} className="products-catalog__section products-anchor">
                <div className="products-catalog__section-header">
                  <div>
                    <h3 className="products-catalog__section-title">{section.name}</h3>
                    <p className="products-catalog__section-lead">{section.lead}</p>
                  </div>
                  <Link href={`/${lang}/contact`} className="products-catalog__header-link">
                    {content.cta.button}
                    <span className="fa fa-angle-right"></span>
                  </Link>
                </div>
                <div className="row">
                  {section.products.map((product) => (
                    <div key={product.model} className="col-xl-4 col-lg-4 col-md-6">
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
                          {content.catalog.viewLabel}
                          <span className="fa fa-angle-right"></span>
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="products-cta">
        <div className="container">
          <div className="products-cta__inner">
            <div className="products-cta__shape float-bob-x"></div>
            <div className="products-cta__content">
              <span className="products-cta__tagline">{content.cta.tagline}</span>
              <h2 className="products-cta__title">{content.cta.title}</h2>
              <p className="products-cta__text">{content.cta.description}</p>
            </div>
            <div className="products-cta__actions">
              <Link href={`/${lang}/contact`} className="thm-btn">
                {content.cta.button}
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
