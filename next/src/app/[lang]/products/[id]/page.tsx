import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

type ProductDetail = {
  id: string
  familyId: string
  familyName: string
  model: string
  subtitle: string
  description: string
  specs: string[]
  image: string
  intro: string
  highlights: string[]
  applications: string[]
  metrics: Array<{ value: string; label: string }>
}

type DetailContent = {
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
  products: ProductDetail[]
}

const detailContent: Record<Locale, DetailContent> = {
  zh: {
    backLabel: '返回产品中心',
    overviewTagline: '产品详情',
    featuresTitle: '核心亮点',
    applicationsTitle: '典型应用',
    specsTitle: '关键规格',
    relatedTitle: '相关产品',
    inquiryTitle: '需要项目级方案支持？',
    inquiryText: '如果你已经确定了使用场景、探测距离或结构限制，我们可以基于当前产品帮你进一步匹配方案。',
    inquiryButton: '联系销售团队',
    relatedButton: '查看详情',
    products: [
      {
        id: 'cy-640m',
        familyId: 'cores',
        familyName: '机芯',
        model: 'CY-640M',
        subtitle: '高分辨率红外机芯',
        description: '适用于中远距离目标识别与高端双光云台项目。',
        specs: ['640x512 / 12um', '50Hz 实时输出', '支持视频与串口控制'],
        image: '/assets/images/services/services-details-img-1.jpg',
        intro: 'CY-640M 以高像素密度和稳定实时输出为核心，适合需要目标识别细节和二次集成能力的热像项目，能够快速融入云台、双光联动与智能分析系统。',
        highlights: ['高灵敏度非制冷探测器', '适合中远距离识别任务', '支持整机厂商快速集成开发'],
        applications: ['周界安防', '制高点监控', '双光云台', '行业热像平台'],
        metrics: [{ value: '640x512', label: '分辨率' }, { value: '12um', label: '像元尺寸' }, { value: '50Hz', label: '输出帧率' }],
      },
      {
        id: 'cy-384s',
        familyId: 'cores',
        familyName: '机芯',
        model: 'CY-384S',
        subtitle: '紧凑型机芯',
        description: '在尺寸、功耗与成本之间保持平衡，适合批量整机产品。',
        specs: ['384x288 / 17um', '低功耗设计', '板级快速集成'],
        image: '/assets/images/services/services-details-img-2.jpg',
        intro: 'CY-384S 面向量产场景优化了结构尺寸与供电方案，在保持基础热像性能的前提下，降低整机设计门槛，适合标准化产品快速铺开。',
        highlights: ['体积紧凑，适合轻量设备', '低功耗便于长期值守', '适合批量整机平台'],
        applications: ['枪机热像相机', '便携终端', '工业巡检', 'OEM 整机'],
        metrics: [{ value: '384x288', label: '分辨率' }, { value: '17um', label: '像元尺寸' }, { value: '<2W', label: '典型功耗' }],
      },
      {
        id: 'cy-lwir-pro',
        familyId: 'cores',
        familyName: '机芯',
        model: 'CY-LWIR Pro',
        subtitle: '开发平台机芯',
        description: '预留丰富接口，适配算法验证、二开和行业设备对接。',
        specs: ['MIPI / USB / CVBS', 'SDK 支持', '多种测温扩展'],
        image: '/assets/images/services/services-details-img-3.jpg',
        intro: 'CY-LWIR Pro 强调接口开放和软件适配能力，适合需要快速验证算法、接入业务平台或开展温度分析的开发型项目。',
        highlights: ['多接口适配开发环境', '提供 SDK 与调试支持', '可扩展测温和算法能力'],
        applications: ['算法验证', '行业终端开发', '测温设备', '科研平台'],
        metrics: [{ value: '3+', label: '输出接口' }, { value: 'SDK', label: '开发支持' }, { value: 'LWIR', label: '波段' }],
      },
      {
        id: 'ir-lens-9mm',
        familyId: 'lenses',
        familyName: '镜头',
        model: 'IR Lens 9mm',
        subtitle: '广角监控镜头',
        description: '适合近距离大视场周界监控和辅助感知场景。',
        specs: ['大视场覆盖', '低畸变优化', '适配 12um 芯片'],
        image: '/assets/images/services/services-page-1-1.jpg',
        intro: '9mm 广角镜头针对近距大场景感知优化，在周界和园区入口等需要覆盖优先的场景中，可以显著提升单机覆盖效率。',
        highlights: ['适合广角热像监控', '兼顾边缘画质与低畸变', '适合紧凑结构整机'],
        applications: ['园区入口', '周界监控', '仓储通道', '辅助驾驶感知'],
        metrics: [{ value: '9mm', label: '焦距' }, { value: 'Wide', label: '视场类型' }, { value: '12um', label: '芯片适配' }],
      },
      {
        id: 'ir-lens-19mm',
        familyId: 'lenses',
        familyName: '镜头',
        model: 'IR Lens 19mm',
        subtitle: '标准焦段镜头',
        description: '兼顾探测距离和画面范围，适配通用安防整机。',
        specs: ['均衡成像', 'F1.0 透过率', '紧凑结构'],
        image: '/assets/images/services/services-page-1-2.jpg',
        intro: '19mm 镜头是通用项目中最平衡的选择，在识别距离、成像亮度和结构尺寸之间保持稳定，适合大多数标准化热像产品。',
        highlights: ['适合通用安防热像项目', '成像亮度与焦段平衡', '适合大部分标准机芯'],
        applications: ['标准枪机', '小型云台', '工业监控', '通用 OEM'],
        metrics: [{ value: '19mm', label: '焦距' }, { value: 'F1.0', label: '通光能力' }, { value: 'Std', label: '应用定位' }],
      },
      {
        id: 'ir-lens-35mm',
        familyId: 'lenses',
        familyName: '镜头',
        model: 'IR Lens 35mm',
        subtitle: '中长焦镜头',
        description: '面向中远距离识别任务，适合边防和制高点部署。',
        specs: ['更远识别距离', '金属镜筒', '抗冲击设计'],
        image: '/assets/images/services/services-page-1-3.jpg',
        intro: '35mm 中长焦镜头强调探测距离和结构稳定性，适合高位监控、边防布控以及对环境可靠性要求更高的户外部署。',
        highlights: ['更适合中远距离任务', '结构强度更高', '适应复杂户外环境'],
        applications: ['边防布控', '高位监控', '桥梁通道', '重点区域巡检'],
        metrics: [{ value: '35mm', label: '焦距' }, { value: 'Tele', label: '视场类型' }, { value: 'Metal', label: '结构材质' }],
      },
      {
        id: 'eo-039',
        familyId: 'eyepieces',
        familyName: '目镜',
        model: 'EO-0.39',
        subtitle: '轻量型热像目镜',
        description: '面向便携设备，兼顾重量控制与基础显示效果。',
        specs: ['紧凑结构', '舒适目距', '适配小型终端'],
        image: '/assets/images/services/services-page-1-4.jpg',
        intro: 'EO-0.39 重点优化体积和佩戴舒适度，适合轻量观察设备和手持终端，便于在移动场景中长期使用。',
        highlights: ['轻量型结构设计', '适合便携终端', '兼顾基础显示与舒适度'],
        applications: ['手持观测仪', '便携夜视设备', '轻量终端', '观察附件'],
        metrics: [{ value: '0.39"', label: '显示尺寸' }, { value: 'Light', label: '结构特性' }, { value: 'Portable', label: '适用终端' }],
      },
      {
        id: 'eo-05-hd',
        familyId: 'eyepieces',
        familyName: '目镜',
        model: 'EO-0.5 HD',
        subtitle: '高清显示目镜',
        description: '增强细节观察体验，适合高像质观察类产品。',
        specs: ['高清 OLED', '高对比显示', '长时佩戴舒适'],
        image: '/assets/images/services/services-page-1-5.jpg',
        intro: 'EO-0.5 HD 面向更高质量的观察需求，强调显示清晰度、层次感和长时使用体验，适合专业观测终端。',
        highlights: ['高清显示提升细节判断', '高对比适合复杂夜视场景', '适合专业观察产品'],
        applications: ['观测瞄具', '专业手持设备', '执法巡检', '夜视观察'],
        metrics: [{ value: 'OLED', label: '显示方案' }, { value: 'HD', label: '画质等级' }, { value: 'High', label: '对比表现' }],
      },
      {
        id: 'eo-dual-view',
        familyId: 'eyepieces',
        familyName: '目镜',
        model: 'EO-Dual View',
        subtitle: '双模式目镜组件',
        description: '支持观测和记录协同输出，提升现场使用效率。',
        specs: ['观察录制同步', '防雾设计', '模块化安装'],
        image: '/assets/images/services/services-page-1-6.jpg',
        intro: 'EO-Dual View 强调在现场观测与记录之间快速切换，适合对留证、协同和模块更换效率有要求的终端产品。',
        highlights: ['观测与记录一体化', '更适合现场任务协同', '模块化安装维护更高效'],
        applications: ['任务记录设备', '巡检终端', '现场取证', '模块化平台'],
        metrics: [{ value: 'Dual', label: '工作模式' }, { value: 'Anti-fog', label: '环境适应' }, { value: 'Modular', label: '安装方式' }],
      },
      {
        id: 'ptz-300',
        familyId: 'systems',
        familyName: '整机系统',
        model: 'PTZ-300',
        subtitle: '双光云台摄像机',
        description: '集成红外与可见光模组，适合周界、园区和制高点监控。',
        specs: ['双光联动', '智能预置位', '全天候巡航'],
        image: '/assets/images/services/services-two-hover-img-1.jpg',
        intro: 'PTZ-300 将热像与可见光能力集成到同一云台平台，适合需要昼夜联动、自动巡航和远程值守的监控任务。',
        highlights: ['双光融合提升全天候感知', '适合自动巡航和值守', '减少整机集成工作量'],
        applications: ['园区安防', '周界布控', '高点巡航', '交通监测'],
        metrics: [{ value: 'Dual', label: '光谱能力' }, { value: 'PTZ', label: '平台形态' }, { value: '24/7', label: '值守模式' }],
      },
      {
        id: 'borderscope-x2',
        familyId: 'systems',
        familyName: '整机系统',
        model: 'BorderScope X2',
        subtitle: '边海防监控终端',
        description: '面向复杂环境连续值守，强化夜间发现与告警能力。',
        specs: ['长距离探测', '告警联动', '低温稳定运行'],
        image: '/assets/images/services/services-two-hover-img-2.jpg',
        intro: 'BorderScope X2 针对边海防场景加强了夜间发现能力和恶劣环境稳定性，适合高价值区域长期部署和告警联动。',
        highlights: ['长距离发现能力更强', '适合全天候连续值守', '支持告警与平台联动'],
        applications: ['边防监控', '海防哨位', '重点区域值守', '低温环境部署'],
        metrics: [{ value: 'Long', label: '探测距离' }, { value: 'Alert', label: '联动能力' }, { value: 'Low Temp', label: '环境适配' }],
      },
      {
        id: 'vehiclecam-v5',
        familyId: 'systems',
        familyName: '整机系统',
        model: 'VehicleCam V5',
        subtitle: '车载热像相机',
        description: '为移动平台提供稳定热视频与夜间辅助识别能力。',
        specs: ['抗震动设计', '宽温工作', '低延迟输出'],
        image: '/assets/images/services/services-two-hover-img-3.jpg',
        intro: 'VehicleCam V5 面向车载与移动平台，重点增强抗震、延迟控制和宽温运行能力，保证移动环境下的画面稳定输出。',
        highlights: ['适合移动平台热像感知', '抗震设计更可靠', '低延迟适配实时决策'],
        applications: ['车载辅助观察', '特种车辆', '移动巡逻', '平台载荷'],
        metrics: [{ value: 'Vehicle', label: '部署平台' }, { value: 'Low Latency', label: '输出表现' }, { value: 'Wide Temp', label: '工作环境' }],
      },
    ],
  },
  en: {
    backLabel: 'Back to Products',
    overviewTagline: 'Product Detail',
    featuresTitle: 'Key Highlights',
    applicationsTitle: 'Typical Applications',
    specsTitle: 'Key Specs',
    relatedTitle: 'Related Products',
    inquiryTitle: 'Need support for a project-fit solution?',
    inquiryText: 'If you already know your deployment scenario, target range, or integration constraints, we can help match this product to a more complete solution path.',
    inquiryButton: 'Talk to Sales',
    relatedButton: 'View Detail',
    products: [
      {
        id: 'cy-640m',
        familyId: 'cores',
        familyName: 'Cores',
        model: 'CY-640M',
        subtitle: 'High-resolution thermal core',
        description: 'Designed for mid-to-long range identification and premium dual-spectrum PTZ projects.',
        specs: ['640x512 / 12um', '50Hz live output', 'Video and serial control'],
        image: '/assets/images/services/services-details-img-1.jpg',
        intro: 'CY-640M is built for projects that need higher image detail and stable real-time output, making it well suited for PTZ integration, dual-spectrum systems, and advanced thermal platforms.',
        highlights: ['High-sensitivity uncooled detector', 'Designed for mid-to-long range identification', 'Fast integration for OEM thermal platforms'],
        applications: ['Perimeter security', 'High-point surveillance', 'Dual-spectrum PTZs', 'Industrial thermal platforms'],
        metrics: [{ value: '640x512', label: 'Resolution' }, { value: '12um', label: 'Pixel pitch' }, { value: '50Hz', label: 'Frame rate' }],
      },
      {
        id: 'cy-384s',
        familyId: 'cores',
        familyName: 'Cores',
        model: 'CY-384S',
        subtitle: 'Compact thermal core',
        description: 'Balanced for size, power, and cost in volume-ready thermal camera platforms.',
        specs: ['384x288 / 17um', 'Low-power design', 'Board-level integration'],
        image: '/assets/images/services/services-details-img-2.jpg',
        intro: 'CY-384S is optimized for production-oriented platforms where structure size, power budget, and cost efficiency need to stay in balance without sacrificing dependable thermal imaging.',
        highlights: ['Compact package for lightweight devices', 'Low-power architecture for longer duty cycles', 'Well suited for standardized camera products'],
        applications: ['Thermal box cameras', 'Portable terminals', 'Industrial inspection', 'OEM systems'],
        metrics: [{ value: '384x288', label: 'Resolution' }, { value: '17um', label: 'Pixel pitch' }, { value: '<2W', label: 'Typical power' }],
      },
      {
        id: 'cy-lwir-pro',
        familyId: 'cores',
        familyName: 'Cores',
        model: 'CY-LWIR Pro',
        subtitle: 'Development platform core',
        description: 'Rich interfaces for algorithm validation, OEM customization, and rapid system bring-up.',
        specs: ['MIPI / USB / CVBS', 'SDK support', 'Temperature measurement options'],
        image: '/assets/images/services/services-details-img-3.jpg',
        intro: 'CY-LWIR Pro focuses on interface flexibility and software openness, making it a practical foundation for teams building analytics, custom devices, or thermal measurement workflows.',
        highlights: ['Multi-interface development support', 'SDK and integration toolkit included', 'Expandable thermal measurement functions'],
        applications: ['Algorithm validation', 'Vertical device development', 'Thermography', 'Research platforms'],
        metrics: [{ value: '3+', label: 'Output interfaces' }, { value: 'SDK', label: 'Development support' }, { value: 'LWIR', label: 'Waveband' }],
      },
      {
        id: 'ir-lens-9mm',
        familyId: 'lenses',
        familyName: 'Lenses',
        model: 'IR Lens 9mm',
        subtitle: 'Wide-angle surveillance lens',
        description: 'Built for near-range perimeter coverage and wide-scene thermal awareness.',
        specs: ['Wide field coverage', 'Low distortion tuning', 'Compatible with 12um sensors'],
        image: '/assets/images/services/services-page-1-1.jpg',
        intro: 'The 9mm lens is tuned for wide-scene thermal coverage, improving single-camera efficiency in entrances, short-range perimeter zones, and other deployments where area coverage matters most.',
        highlights: ['Optimized for wide-angle thermal surveillance', 'Balanced edge clarity and low distortion', 'Fits compact infrared camera platforms'],
        applications: ['Campus entrances', 'Perimeter monitoring', 'Warehouse aisles', 'Thermal awareness systems'],
        metrics: [{ value: '9mm', label: 'Focal length' }, { value: 'Wide', label: 'Field type' }, { value: '12um', label: 'Sensor match' }],
      },
      {
        id: 'ir-lens-19mm',
        familyId: 'lenses',
        familyName: 'Lenses',
        model: 'IR Lens 19mm',
        subtitle: 'Standard focal lens',
        description: 'A balanced choice for mainstream security deployments and general thermal imaging.',
        specs: ['Balanced imaging', 'F1.0 transmission', 'Compact package'],
        image: '/assets/images/services/services-page-1-2.jpg',
        intro: 'The 19mm lens offers one of the most balanced options in common thermal projects, combining practical detection range, strong transmission, and a structure that fits standard camera designs.',
        highlights: ['Strong fit for general thermal security', 'Balanced brightness and focal reach', 'Compatible with standard thermal cores'],
        applications: ['Standard cameras', 'Small PTZs', 'Industrial monitoring', 'General OEM systems'],
        metrics: [{ value: '19mm', label: 'Focal length' }, { value: 'F1.0', label: 'Transmission' }, { value: 'Std', label: 'Positioning' }],
      },
      {
        id: 'ir-lens-35mm',
        familyId: 'lenses',
        familyName: 'Lenses',
        model: 'IR Lens 35mm',
        subtitle: 'Mid-tele lens',
        description: 'Optimized for longer-range recognition in border and elevated surveillance positions.',
        specs: ['Extended reach', 'Metal housing', 'Impact-resistant structure'],
        image: '/assets/images/services/services-page-1-3.jpg',
        intro: 'The 35mm mid-tele lens is designed for longer-distance recognition tasks and tougher field conditions, making it a stronger option for elevated installations and border-facing deployments.',
        highlights: ['Better suited to mid-to-long range tasks', 'Higher structural strength', 'Reliable in demanding outdoor conditions'],
        applications: ['Border protection', 'High-point observation', 'Bridge approaches', 'Critical zone patrol'],
        metrics: [{ value: '35mm', label: 'Focal length' }, { value: 'Tele', label: 'Field type' }, { value: 'Metal', label: 'Housing' }],
      },
      {
        id: 'eo-039',
        familyId: 'eyepieces',
        familyName: 'Eyepieces',
        model: 'EO-0.39',
        subtitle: 'Lightweight thermal eyepiece',
        description: 'Compact and efficient for portable thermal instruments and lightweight terminals.',
        specs: ['Compact assembly', 'Comfortable eye relief', 'Small-device ready'],
        image: '/assets/images/services/services-page-1-4.jpg',
        intro: 'EO-0.39 is optimized for lightweight observation products, helping portable devices stay compact while preserving practical viewing comfort in field use.',
        highlights: ['Lightweight structure for portable devices', 'Comfortable for mobile observation', 'A good fit for compact thermal terminals'],
        applications: ['Handheld viewers', 'Portable night devices', 'Lightweight terminals', 'Observation accessories'],
        metrics: [{ value: '0.39"', label: 'Display size' }, { value: 'Light', label: 'Structure' }, { value: 'Portable', label: 'Device fit' }],
      },
      {
        id: 'eo-05-hd',
        familyId: 'eyepieces',
        familyName: 'Eyepieces',
        model: 'EO-0.5 HD',
        subtitle: 'High-definition eyepiece',
        description: 'Improves visual detail for products where observation quality is the primary priority.',
        specs: ['HD OLED', 'High contrast', 'Comfort for extended use'],
        image: '/assets/images/services/services-page-1-5.jpg',
        intro: 'EO-0.5 HD is designed for applications where image quality and observation detail matter most, combining stronger display clarity with comfort for longer sessions.',
        highlights: ['Improved display detail for observation', 'High contrast for more complex night scenes', 'Suitable for professional observation products'],
        applications: ['Observation scopes', 'Professional handhelds', 'Inspection devices', 'Night viewing products'],
        metrics: [{ value: 'OLED', label: 'Display type' }, { value: 'HD', label: 'Image grade' }, { value: 'High', label: 'Contrast level' }],
      },
      {
        id: 'eo-dual-view',
        familyId: 'eyepieces',
        familyName: 'Eyepieces',
        model: 'EO-Dual View',
        subtitle: 'Dual-mode eyepiece module',
        description: 'Supports observation and recording workflows in the same field-ready optical package.',
        specs: ['View and record sync', 'Anti-fog design', 'Modular mounting'],
        image: '/assets/images/services/services-page-1-6.jpg',
        intro: 'EO-Dual View is built for products that need both real-time viewing and on-site recording, helping teams move faster in field workflows that depend on capture and review.',
        highlights: ['Integrated view and recording workflow', 'Better fit for field coordination', 'Modular installation for easier maintenance'],
        applications: ['Mission recording devices', 'Inspection terminals', 'Evidence capture', 'Modular optical platforms'],
        metrics: [{ value: 'Dual', label: 'Operating mode' }, { value: 'Anti-fog', label: 'Environmental fit' }, { value: 'Modular', label: 'Mounting' }],
      },
      {
        id: 'ptz-300',
        familyId: 'systems',
        familyName: 'Systems',
        model: 'PTZ-300',
        subtitle: 'Dual-spectrum PTZ camera',
        description: 'Combines thermal and visible modules for perimeter, campus, and high-point surveillance.',
        specs: ['Dual-spectrum fusion', 'Smart presets', 'All-weather patrol'],
        image: '/assets/images/services/services-two-hover-img-1.jpg',
        intro: 'PTZ-300 integrates thermal and visible imaging into a single PTZ platform for deployments that need day-night linking, automated patrol workflows, and remote monitoring efficiency.',
        highlights: ['Dual-spectrum fusion for round-the-clock awareness', 'Built for automated patrol and duty cycles', 'Reduces integration effort for project teams'],
        applications: ['Campus security', 'Perimeter defense', 'High-point patrol', 'Traffic observation'],
        metrics: [{ value: 'Dual', label: 'Spectrum' }, { value: 'PTZ', label: 'Platform type' }, { value: '24/7', label: 'Duty mode' }],
      },
      {
        id: 'borderscope-x2',
        familyId: 'systems',
        familyName: 'Systems',
        model: 'BorderScope X2',
        subtitle: 'Border monitoring terminal',
        description: 'Built for continuous duty in harsh environments with stronger night discovery performance.',
        specs: ['Long-range detection', 'Alarm linkage', 'Low-temperature stability'],
        image: '/assets/images/services/services-two-hover-img-2.jpg',
        intro: 'BorderScope X2 is strengthened for border-facing deployments that need more dependable night discovery, extended duty cycles, and better resilience in exposed outdoor conditions.',
        highlights: ['Stronger long-range discovery performance', 'Built for all-weather duty cycles', 'Supports alarm and platform linkage'],
        applications: ['Border monitoring', 'Coastal stations', 'Critical site duty', 'Low-temperature deployment'],
        metrics: [{ value: 'Long', label: 'Detection range' }, { value: 'Alert', label: 'System linkage' }, { value: 'Low Temp', label: 'Environment' }],
      },
      {
        id: 'vehiclecam-v5',
        familyId: 'systems',
        familyName: 'Systems',
        model: 'VehicleCam V5',
        subtitle: 'Vehicle thermal camera',
        description: 'Delivers reliable thermal video and night assistance for mobile platforms.',
        specs: ['Anti-vibration design', 'Wide temperature range', 'Low-latency output'],
        image: '/assets/images/services/services-two-hover-img-3.jpg',
        intro: 'VehicleCam V5 is designed for mobile platforms where shock resistance, latency control, and stable thermal output are critical to maintaining usable imagery on the move.',
        highlights: ['Built for mobile thermal sensing', 'Higher resistance to vibration', 'Low-latency output for real-time decisions'],
        applications: ['Vehicle observation', 'Special-purpose fleets', 'Mobile patrol', 'Integrated payload systems'],
        metrics: [{ value: 'Vehicle', label: 'Platform fit' }, { value: 'Low Latency', label: 'Output profile' }, { value: 'Wide Temp', label: 'Operating range' }],
      },
    ],
  },
}

interface ProductDetailPageProps {
  params: { lang: Locale; id: string }
}

function getProduct(locale: Locale, id: string) {
  const normalizedId = decodeURIComponent(id).toLowerCase()
  return detailContent[locale].products.find((item) => item.id.toLowerCase() === normalizedId)
}

export function generateStaticParams() {
  return i18n.locales.flatMap((lang) =>
    detailContent[lang].products.map((product) => ({
      lang,
      id: product.id,
    }))
  )
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const product = getProduct(params.lang, params.id)
  if (!product) {
    return {}
  }

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
      images: seoMeta.ogImage ? [seoMeta.ogImage] : undefined,
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
  const content = detailContent[params.lang]
  const product = getProduct(params.lang, params.id)

  if (!product) {
    notFound()
  }

  const relatedProducts = content.products
    .filter((item) => item.id !== product.id && item.familyId === product.familyId)
    .slice(0, 3)

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
                <Link href={`/${params.lang}/products#${product.familyId}`} className="product-detail-top__back">
                  <span className="fa fa-angle-left"></span>
                  {content.backLabel}
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
                    {content.inquiryButton}
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
                tagline={content.overviewTagline}
                title={`${product.model} ${product.subtitle}`}
                highlight={product.model}
              />
              <p className="product-detail-overview__intro">{product.intro}</p>
            </div>
            <div className="col-xl-5 col-lg-5">
              <div className="product-detail-overview__metrics">
                {product.metrics.map((metric) => (
                  <div key={metric.label} className="product-detail-overview__metric">
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
                <h3 className="product-detail-panel__title">{content.featuresTitle}</h3>
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
                <h3 className="product-detail-panel__title">{content.applicationsTitle}</h3>
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
          <SectionTitle tagline={content.overviewTagline} title={content.specsTitle} highlight={content.specsTitle} align="center" />
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

      <section className="products-catalog product-detail-related">
        <div className="container">
          <SectionTitle tagline={content.overviewTagline} title={content.relatedTitle} highlight={content.relatedTitle} align="center" />
          <div className="row">
            {relatedProducts.map((item) => (
              <div key={item.id} className="col-xl-4 col-lg-4 col-md-6">
                <Link href={`/${params.lang}/products/${item.id}`} className="products-catalog__card">
                  <span className="products-catalog__card-label">{item.familyName}</span>
                  <h4 className="products-catalog__card-model">{item.model}</h4>
                  <p className="products-catalog__card-subtitle">{item.subtitle}</p>
                  <p className="products-catalog__card-description">{item.description}</p>
                  <span className="products-catalog__detail-link">
                    {content.relatedButton}
                    <span className="fa fa-angle-right"></span>
                  </span>
                </Link>
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
              <span className="products-cta__tagline">{content.overviewTagline}</span>
              <h2 className="products-cta__title">{content.inquiryTitle}</h2>
              <p className="products-cta__text">{content.inquiryText}</p>
            </div>
            <div className="products-cta__actions">
              <Link href={`/${params.lang}/contact`} className="thm-btn">
                {content.inquiryButton}
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
