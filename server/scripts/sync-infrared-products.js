require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Client } = require("pg");

function buildConnectionConfig() {
  if (process.env.PRODUCTS_DATABASE_URL) {
    return { connectionString: process.env.PRODUCTS_DATABASE_URL };
  }

  return {
    host: process.env.PRODUCTS_PG_HOST || process.env.PG_HOST,
    port: Number(process.env.PRODUCTS_PG_PORT || process.env.PG_PORT || 5432),
    database: process.env.PRODUCTS_PG_DATABASE || process.env.PG_DATABASE || "products_key",
    user: process.env.PRODUCTS_PG_USER || process.env.PG_USER || "products_key",
    password: process.env.PRODUCTS_PG_PASSWORD || process.env.PG_PASSWORD,
  };
}

const staleProductSlugs = [
  "cx640-uncooled-core",
  "m384-compact-core",
  "a19-germanium-lens",
  "a35-long-range-lens",
  "v1-thermal-eyepiece",
  "d2-rugged-eyepiece",
];

const staleCategorySlugs = [
  "infrared-cores",
  "infrared-lenses",
  "thermal-eyepieces",
];

const locales = {
  zh: {
    parentCategory: {
      slug: "infrared-products",
      parent_slug: null,
      locale: "zh",
      name: "红外产品",
      description: "面向机芯、镜头、目镜与整机系统的一体化红外产品数据库。",
      display_order: 1,
      visibility: "published",
    },
    categories: [
      { slug: "cores", parent_slug: "infrared-products", locale: "zh", name: "机芯", description: "适用于云台、枪机和 OEM 平台集成的红外机芯。", display_order: 11, visibility: "published" },
      { slug: "lenses", parent_slug: "infrared-products", locale: "zh", name: "镜头", description: "覆盖广角到中长焦场景的红外镜头方案。", display_order: 12, visibility: "published" },
      { slug: "eyepieces", parent_slug: "infrared-products", locale: "zh", name: "目镜", description: "面向手持和观察终端的热像目镜组件。", display_order: 13, visibility: "published" },
      { slug: "systems", parent_slug: "infrared-products", locale: "zh", name: "整机系统", description: "可直接部署的双光和热像整机系统。", display_order: 14, visibility: "published" },
    ],
    products: [
      {
        slug: "cy-640m",
        category_slug: "cores",
        locale: "zh",
        name: "CY-640M",
        short_description: "高分辨率红外机芯",
        description: "CY-640M 以高像素密度和稳定实时输出为核心，适合需要目标识别细节和二次集成能力的热像项目，能够快速融入云台、双光联动与智能分析系统。",
        images: ["/assets/images/services/services-details-img-1.jpg"],
        tags: ["红外", "机芯", "640x512", "12um"],
        specifications: {
          cards: ["640x512 / 12um", "50Hz 实时输出", "支持视频与串口控制"],
          metrics: [
            { value: "640x512", label: "分辨率" },
            { value: "12um", label: "像元尺寸" },
            { value: "50Hz", label: "输出帧率" },
          ],
        },
        display_order: 1,
        visibility: "published",
        extra: {
          family_id: "cores",
          family_name: "机芯",
          model: "CY-640M",
          subtitle: "高分辨率红外机芯",
          card_description: "适用于中远距离目标识别与高端双光云台项目。",
          cover_image: "/assets/images/services/services-details-img-1.jpg",
          highlights: ["高灵敏度非制冷探测器", "适合中远距离识别任务", "支持整机厂商快速集成开发"],
          applications: ["周界安防", "制高点监控", "双光云台", "行业热像平台"],
          metrics: [
            { value: "640x512", label: "分辨率" },
            { value: "12um", label: "像元尺寸" },
            { value: "50Hz", label: "输出帧率" },
          ],
        },
      },
      {
        slug: "cy-384s",
        category_slug: "cores",
        locale: "zh",
        name: "CY-384S",
        short_description: "紧凑型机芯",
        description: "CY-384S 面向量产场景优化了结构尺寸与供电方案，在保持基础热像性能的前提下，降低整机设计门槛，适合标准化产品快速铺开。",
        images: ["/assets/images/services/services-details-img-2.jpg"],
        tags: ["红外", "机芯", "384x288", "低功耗"],
        specifications: {
          cards: ["384x288 / 17um", "低功耗设计", "板级快速集成"],
          metrics: [
            { value: "384x288", label: "分辨率" },
            { value: "17um", label: "像元尺寸" },
            { value: "<2W", label: "典型功耗" },
          ],
        },
        display_order: 2,
        visibility: "published",
        extra: {
          family_id: "cores",
          family_name: "机芯",
          model: "CY-384S",
          subtitle: "紧凑型机芯",
          card_description: "在尺寸、功耗与成本之间保持平衡，适合批量整机产品。",
          cover_image: "/assets/images/services/services-details-img-2.jpg",
          highlights: ["体积紧凑，适合轻量设备", "低功耗便于长期值守", "适合批量整机平台"],
          applications: ["枪机热像相机", "便携终端", "工业巡检", "OEM 整机"],
          metrics: [
            { value: "384x288", label: "分辨率" },
            { value: "17um", label: "像元尺寸" },
            { value: "<2W", label: "典型功耗" },
          ],
        },
      },
      {
        slug: "cy-lwir-pro",
        category_slug: "cores",
        locale: "zh",
        name: "CY-LWIR Pro",
        short_description: "开发平台机芯",
        description: "CY-LWIR Pro 强调接口开放和软件适配能力，适合需要快速验证算法、接入业务平台或开展温度分析的开发型项目。",
        images: ["/assets/images/services/services-details-img-3.jpg"],
        tags: ["红外", "机芯", "SDK", "LWIR"],
        specifications: {
          cards: ["MIPI / USB / CVBS", "SDK 支持", "多种测温扩展"],
          metrics: [
            { value: "3+", label: "输出接口" },
            { value: "SDK", label: "开发支持" },
            { value: "LWIR", label: "波段" },
          ],
        },
        display_order: 3,
        visibility: "published",
        extra: {
          family_id: "cores",
          family_name: "机芯",
          model: "CY-LWIR Pro",
          subtitle: "开发平台机芯",
          card_description: "预留丰富接口，适配算法验证、二开和行业设备对接。",
          cover_image: "/assets/images/services/services-details-img-3.jpg",
          highlights: ["多接口适配开发环境", "提供 SDK 与调试支持", "可扩展测温和算法能力"],
          applications: ["算法验证", "行业终端开发", "测温设备", "科研平台"],
          metrics: [
            { value: "3+", label: "输出接口" },
            { value: "SDK", label: "开发支持" },
            { value: "LWIR", label: "波段" },
          ],
        },
      },
      {
        slug: "ir-lens-9mm",
        category_slug: "lenses",
        locale: "zh",
        name: "IR Lens 9mm",
        short_description: "广角监控镜头",
        description: "9mm 广角镜头针对近距大场景感知优化，在周界和园区入口等需要覆盖优先的场景中，可以显著提升单机覆盖效率。",
        images: ["/assets/images/services/services-page-1-1.jpg"],
        tags: ["红外", "镜头", "9mm", "广角"],
        specifications: {
          cards: ["大视场覆盖", "低畸变优化", "适配 12um 芯片"],
          metrics: [
            { value: "9mm", label: "焦距" },
            { value: "Wide", label: "视场类型" },
            { value: "12um", label: "芯片适配" },
          ],
        },
        display_order: 4,
        visibility: "published",
        extra: {
          family_id: "lenses",
          family_name: "镜头",
          model: "IR Lens 9mm",
          subtitle: "广角监控镜头",
          card_description: "适合近距离大视场周界监控和辅助感知场景。",
          cover_image: "/assets/images/services/services-page-1-1.jpg",
          highlights: ["适合广角热像监控", "兼顾边缘画质与低畸变", "适合紧凑结构整机"],
          applications: ["园区入口", "周界监控", "仓储通道", "辅助驾驶感知"],
          metrics: [
            { value: "9mm", label: "焦距" },
            { value: "Wide", label: "视场类型" },
            { value: "12um", label: "芯片适配" },
          ],
        },
      },
      {
        slug: "ir-lens-19mm",
        category_slug: "lenses",
        locale: "zh",
        name: "IR Lens 19mm",
        short_description: "标准焦段镜头",
        description: "19mm 镜头是通用项目中最平衡的选择，在识别距离、成像亮度和结构尺寸之间保持稳定，适合大多数标准化热像产品。",
        images: ["/assets/images/services/services-page-1-2.jpg"],
        tags: ["红外", "镜头", "19mm", "F1.0"],
        specifications: {
          cards: ["均衡成像", "F1.0 透过率", "紧凑结构"],
          metrics: [
            { value: "19mm", label: "焦距" },
            { value: "F1.0", label: "通光能力" },
            { value: "Std", label: "应用定位" },
          ],
        },
        display_order: 5,
        visibility: "published",
        extra: {
          family_id: "lenses",
          family_name: "镜头",
          model: "IR Lens 19mm",
          subtitle: "标准焦段镜头",
          card_description: "兼顾探测距离和画面范围，适配通用安防整机。",
          cover_image: "/assets/images/services/services-page-1-2.jpg",
          highlights: ["适合通用安防热像项目", "成像亮度与焦段平衡", "适合大部分标准机芯"],
          applications: ["标准枪机", "小型云台", "工业监控", "通用 OEM"],
          metrics: [
            { value: "19mm", label: "焦距" },
            { value: "F1.0", label: "通光能力" },
            { value: "Std", label: "应用定位" },
          ],
        },
      },
      {
        slug: "ir-lens-35mm",
        category_slug: "lenses",
        locale: "zh",
        name: "IR Lens 35mm",
        short_description: "中长焦镜头",
        description: "35mm 中长焦镜头强调探测距离和结构稳定性，适合高位监控、边防布控以及对环境可靠性要求更高的户外部署。",
        images: ["/assets/images/services/services-page-1-3.jpg"],
        tags: ["红外", "镜头", "35mm", "长焦"],
        specifications: {
          cards: ["更远识别距离", "金属镜筒", "抗冲击设计"],
          metrics: [
            { value: "35mm", label: "焦距" },
            { value: "Tele", label: "视场类型" },
            { value: "Metal", label: "结构材质" },
          ],
        },
        display_order: 6,
        visibility: "published",
        extra: {
          family_id: "lenses",
          family_name: "镜头",
          model: "IR Lens 35mm",
          subtitle: "中长焦镜头",
          card_description: "面向中远距离识别任务，适合边防和制高点部署。",
          cover_image: "/assets/images/services/services-page-1-3.jpg",
          highlights: ["更适合中远距离任务", "结构强度更高", "适应复杂户外环境"],
          applications: ["边防布控", "高位监控", "桥梁通道", "重点区域巡检"],
          metrics: [
            { value: "35mm", label: "焦距" },
            { value: "Tele", label: "视场类型" },
            { value: "Metal", label: "结构材质" },
          ],
        },
      },
      {
        slug: "eo-039",
        category_slug: "eyepieces",
        locale: "zh",
        name: "EO-0.39",
        short_description: "轻量型热像目镜",
        description: "EO-0.39 重点优化体积和佩戴舒适度，适合轻量观察设备和手持终端，便于在移动场景中长期使用。",
        images: ["/assets/images/services/services-page-1-4.jpg"],
        tags: ["红外", "目镜", "便携", "0.39"],
        specifications: {
          cards: ["紧凑结构", "舒适目距", "适配小型终端"],
          metrics: [
            { value: "0.39\"", label: "显示尺寸" },
            { value: "Light", label: "结构特性" },
            { value: "Portable", label: "适用终端" },
          ],
        },
        display_order: 7,
        visibility: "published",
        extra: {
          family_id: "eyepieces",
          family_name: "目镜",
          model: "EO-0.39",
          subtitle: "轻量型热像目镜",
          card_description: "面向便携设备，兼顾重量控制与基础显示效果。",
          cover_image: "/assets/images/services/services-page-1-4.jpg",
          highlights: ["轻量型结构设计", "适合便携终端", "兼顾基础显示与舒适度"],
          applications: ["手持观测仪", "便携夜视设备", "轻量终端", "观察附件"],
          metrics: [
            { value: "0.39\"", label: "显示尺寸" },
            { value: "Light", label: "结构特性" },
            { value: "Portable", label: "适用终端" },
          ],
        },
      },
      {
        slug: "eo-05-hd",
        category_slug: "eyepieces",
        locale: "zh",
        name: "EO-0.5 HD",
        short_description: "高清显示目镜",
        description: "EO-0.5 HD 面向更高质量的观察需求，强调显示清晰度、层次感和长时使用体验，适合专业观测终端。",
        images: ["/assets/images/services/services-page-1-5.jpg"],
        tags: ["红外", "目镜", "OLED", "高清"],
        specifications: {
          cards: ["高清 OLED", "高对比显示", "长时佩戴舒适"],
          metrics: [
            { value: "OLED", label: "显示方案" },
            { value: "HD", label: "画质等级" },
            { value: "High", label: "对比表现" },
          ],
        },
        display_order: 8,
        visibility: "published",
        extra: {
          family_id: "eyepieces",
          family_name: "目镜",
          model: "EO-0.5 HD",
          subtitle: "高清显示目镜",
          card_description: "增强细节观察体验，适合高像质观察类产品。",
          cover_image: "/assets/images/services/services-page-1-5.jpg",
          highlights: ["高清显示提升细节判断", "高对比适合复杂夜视场景", "适合专业观察产品"],
          applications: ["观测瞄具", "专业手持设备", "执法巡检", "夜视观察"],
          metrics: [
            { value: "OLED", label: "显示方案" },
            { value: "HD", label: "画质等级" },
            { value: "High", label: "对比表现" },
          ],
        },
      },
      {
        slug: "eo-dual-view",
        category_slug: "eyepieces",
        locale: "zh",
        name: "EO-Dual View",
        short_description: "双模式目镜组件",
        description: "EO-Dual View 强调在现场观测与记录之间快速切换，适合对留证、协同和模块更换效率有要求的终端产品。",
        images: ["/assets/images/services/services-page-1-6.jpg"],
        tags: ["红外", "目镜", "双模式", "模块化"],
        specifications: {
          cards: ["观察录制同步", "防雾设计", "模块化安装"],
          metrics: [
            { value: "Dual", label: "工作模式" },
            { value: "Anti-fog", label: "环境适应" },
            { value: "Modular", label: "安装方式" },
          ],
        },
        display_order: 9,
        visibility: "published",
        extra: {
          family_id: "eyepieces",
          family_name: "目镜",
          model: "EO-Dual View",
          subtitle: "双模式目镜组件",
          card_description: "支持观测和记录协同输出，提升现场使用效率。",
          cover_image: "/assets/images/services/services-page-1-6.jpg",
          highlights: ["观测与记录一体化", "更适合现场任务协同", "模块化安装维护更高效"],
          applications: ["任务记录设备", "巡检终端", "现场取证", "模块化平台"],
          metrics: [
            { value: "Dual", label: "工作模式" },
            { value: "Anti-fog", label: "环境适应" },
            { value: "Modular", label: "安装方式" },
          ],
        },
      },
      {
        slug: "ptz-300",
        category_slug: "systems",
        locale: "zh",
        name: "PTZ-300",
        short_description: "双光云台摄像机",
        description: "PTZ-300 将热像与可见光能力集成到同一云台平台，适合需要昼夜联动、自动巡航和远程值守的监控任务。",
        images: ["/assets/images/services/services-two-hover-img-1.jpg"],
        tags: ["红外", "整机", "双光", "PTZ"],
        specifications: {
          cards: ["双光联动", "智能预置位", "全天候巡航"],
          metrics: [
            { value: "Dual", label: "光谱能力" },
            { value: "PTZ", label: "平台形态" },
            { value: "24/7", label: "值守模式" },
          ],
        },
        display_order: 10,
        visibility: "published",
        extra: {
          family_id: "systems",
          family_name: "整机系统",
          model: "PTZ-300",
          subtitle: "双光云台摄像机",
          card_description: "集成红外与可见光模组，适合周界、园区和制高点监控。",
          cover_image: "/assets/images/services/services-two-hover-img-1.jpg",
          highlights: ["双光融合提升全天候感知", "适合自动巡航和值守", "减少整机集成工作量"],
          applications: ["园区安防", "周界布控", "高点巡航", "交通监测"],
          metrics: [
            { value: "Dual", label: "光谱能力" },
            { value: "PTZ", label: "平台形态" },
            { value: "24/7", label: "值守模式" },
          ],
        },
      },
      {
        slug: "borderscope-x2",
        category_slug: "systems",
        locale: "zh",
        name: "BorderScope X2",
        short_description: "边海防监控终端",
        description: "BorderScope X2 针对边海防场景加强了夜间发现能力和恶劣环境稳定性，适合高价值区域长期部署和告警联动。",
        images: ["/assets/images/services/services-two-hover-img-2.jpg"],
        tags: ["红外", "整机", "边防", "告警"],
        specifications: {
          cards: ["长距离探测", "告警联动", "低温稳定运行"],
          metrics: [
            { value: "Long", label: "探测距离" },
            { value: "Alert", label: "联动能力" },
            { value: "Low Temp", label: "环境适配" },
          ],
        },
        display_order: 11,
        visibility: "published",
        extra: {
          family_id: "systems",
          family_name: "整机系统",
          model: "BorderScope X2",
          subtitle: "边海防监控终端",
          card_description: "面向复杂环境连续值守，强化夜间发现与告警能力。",
          cover_image: "/assets/images/services/services-two-hover-img-2.jpg",
          highlights: ["长距离发现能力更强", "适合全天候连续值守", "支持告警与平台联动"],
          applications: ["边防监控", "海防哨位", "重点区域值守", "低温环境部署"],
          metrics: [
            { value: "Long", label: "探测距离" },
            { value: "Alert", label: "联动能力" },
            { value: "Low Temp", label: "环境适配" },
          ],
        },
      },
      {
        slug: "vehiclecam-v5",
        category_slug: "systems",
        locale: "zh",
        name: "VehicleCam V5",
        short_description: "车载热像相机",
        description: "VehicleCam V5 面向车载与移动平台，重点增强抗震、延迟控制和宽温运行能力，保证移动环境下的画面稳定输出。",
        images: ["/assets/images/services/services-two-hover-img-3.jpg"],
        tags: ["红外", "整机", "车载", "低延迟"],
        specifications: {
          cards: ["抗震动设计", "宽温工作", "低延迟输出"],
          metrics: [
            { value: "Vehicle", label: "部署平台" },
            { value: "Low Latency", label: "输出表现" },
            { value: "Wide Temp", label: "工作环境" },
          ],
        },
        display_order: 12,
        visibility: "published",
        extra: {
          family_id: "systems",
          family_name: "整机系统",
          model: "VehicleCam V5",
          subtitle: "车载热像相机",
          card_description: "为移动平台提供稳定热视频与夜间辅助识别能力。",
          cover_image: "/assets/images/services/services-two-hover-img-3.jpg",
          highlights: ["适合移动平台热像感知", "抗震设计更可靠", "低延迟适配实时决策"],
          applications: ["车载辅助观察", "特种车辆", "移动巡逻", "平台载荷"],
          metrics: [
            { value: "Vehicle", label: "部署平台" },
            { value: "Low Latency", label: "输出表现" },
            { value: "Wide Temp", label: "工作环境" },
          ],
        },
      },
    ],
  },
  en: {
    parentCategory: {
      slug: "infrared-products",
      parent_slug: null,
      locale: "en",
      name: "Infrared Products",
      description: "A structured infrared product catalog for cores, lenses, eyepieces, and complete thermal systems.",
      display_order: 1,
      visibility: "published",
    },
    categories: [
      { slug: "cores", parent_slug: "infrared-products", locale: "en", name: "Cores", description: "Infrared camera cores for PTZs, fixed cameras, and OEM thermal platforms.", display_order: 11, visibility: "published" },
      { slug: "lenses", parent_slug: "infrared-products", locale: "en", name: "Lenses", description: "Infrared lens options spanning wide-angle to mid-tele deployment needs.", display_order: 12, visibility: "published" },
      { slug: "eyepieces", parent_slug: "infrared-products", locale: "en", name: "Eyepieces", description: "Thermal eyepiece assemblies for portable and observation-oriented devices.", display_order: 13, visibility: "published" },
      { slug: "systems", parent_slug: "infrared-products", locale: "en", name: "Systems", description: "Deployment-ready dual-spectrum and thermal camera systems.", display_order: 14, visibility: "published" },
    ],
    products: [
      {
        slug: "cy-640m",
        category_slug: "cores",
        locale: "en",
        name: "CY-640M",
        short_description: "High-resolution thermal core",
        description: "CY-640M is built for projects that need higher image detail and stable real-time output, making it well suited for PTZ integration, dual-spectrum systems, and advanced thermal platforms.",
        images: ["/assets/images/services/services-details-img-1.jpg"],
        tags: ["infrared", "core", "640x512", "12um"],
        specifications: {
          cards: ["640x512 / 12um", "50Hz live output", "Video and serial control"],
          metrics: [
            { value: "640x512", label: "Resolution" },
            { value: "12um", label: "Pixel pitch" },
            { value: "50Hz", label: "Frame rate" },
          ],
        },
        display_order: 1,
        visibility: "published",
        extra: {
          family_id: "cores",
          family_name: "Cores",
          model: "CY-640M",
          subtitle: "High-resolution thermal core",
          card_description: "Designed for mid-to-long range identification and premium dual-spectrum PTZ projects.",
          cover_image: "/assets/images/services/services-details-img-1.jpg",
          highlights: ["High-sensitivity uncooled detector", "Designed for mid-to-long range identification", "Fast integration for OEM thermal platforms"],
          applications: ["Perimeter security", "High-point surveillance", "Dual-spectrum PTZs", "Industrial thermal platforms"],
          metrics: [
            { value: "640x512", label: "Resolution" },
            { value: "12um", label: "Pixel pitch" },
            { value: "50Hz", label: "Frame rate" },
          ],
        },
      },
      {
        slug: "cy-384s",
        category_slug: "cores",
        locale: "en",
        name: "CY-384S",
        short_description: "Compact thermal core",
        description: "CY-384S is optimized for production-oriented platforms where structure size, power budget, and cost efficiency need to stay in balance without sacrificing dependable thermal imaging.",
        images: ["/assets/images/services/services-details-img-2.jpg"],
        tags: ["infrared", "core", "384x288", "low-power"],
        specifications: {
          cards: ["384x288 / 17um", "Low-power design", "Board-level integration"],
          metrics: [
            { value: "384x288", label: "Resolution" },
            { value: "17um", label: "Pixel pitch" },
            { value: "<2W", label: "Typical power" },
          ],
        },
        display_order: 2,
        visibility: "published",
        extra: {
          family_id: "cores",
          family_name: "Cores",
          model: "CY-384S",
          subtitle: "Compact thermal core",
          card_description: "Balanced for size, power, and cost in volume-ready thermal camera platforms.",
          cover_image: "/assets/images/services/services-details-img-2.jpg",
          highlights: ["Compact package for lightweight devices", "Low-power architecture for longer duty cycles", "Well suited for standardized camera products"],
          applications: ["Thermal box cameras", "Portable terminals", "Industrial inspection", "OEM systems"],
          metrics: [
            { value: "384x288", label: "Resolution" },
            { value: "17um", label: "Pixel pitch" },
            { value: "<2W", label: "Typical power" },
          ],
        },
      },
      {
        slug: "cy-lwir-pro",
        category_slug: "cores",
        locale: "en",
        name: "CY-LWIR Pro",
        short_description: "Development platform core",
        description: "CY-LWIR Pro focuses on interface flexibility and software openness, making it a practical foundation for teams building analytics, custom devices, or thermal measurement workflows.",
        images: ["/assets/images/services/services-details-img-3.jpg"],
        tags: ["infrared", "core", "sdk", "lwir"],
        specifications: {
          cards: ["MIPI / USB / CVBS", "SDK support", "Temperature measurement options"],
          metrics: [
            { value: "3+", label: "Output interfaces" },
            { value: "SDK", label: "Development support" },
            { value: "LWIR", label: "Waveband" },
          ],
        },
        display_order: 3,
        visibility: "published",
        extra: {
          family_id: "cores",
          family_name: "Cores",
          model: "CY-LWIR Pro",
          subtitle: "Development platform core",
          card_description: "Rich interfaces for algorithm validation, OEM customization, and rapid system bring-up.",
          cover_image: "/assets/images/services/services-details-img-3.jpg",
          highlights: ["Multi-interface development support", "SDK and integration toolkit included", "Expandable thermal measurement functions"],
          applications: ["Algorithm validation", "Vertical device development", "Thermography", "Research platforms"],
          metrics: [
            { value: "3+", label: "Output interfaces" },
            { value: "SDK", label: "Development support" },
            { value: "LWIR", label: "Waveband" },
          ],
        },
      },
      {
        slug: "ir-lens-9mm",
        category_slug: "lenses",
        locale: "en",
        name: "IR Lens 9mm",
        short_description: "Wide-angle surveillance lens",
        description: "The 9mm lens is tuned for wide-scene thermal coverage, improving single-camera efficiency in entrances, short-range perimeter zones, and other deployments where area coverage matters most.",
        images: ["/assets/images/services/services-page-1-1.jpg"],
        tags: ["infrared", "lens", "9mm", "wide-angle"],
        specifications: {
          cards: ["Wide field coverage", "Low distortion tuning", "Compatible with 12um sensors"],
          metrics: [
            { value: "9mm", label: "Focal length" },
            { value: "Wide", label: "Field type" },
            { value: "12um", label: "Sensor match" },
          ],
        },
        display_order: 4,
        visibility: "published",
        extra: {
          family_id: "lenses",
          family_name: "Lenses",
          model: "IR Lens 9mm",
          subtitle: "Wide-angle surveillance lens",
          card_description: "Built for near-range perimeter coverage and wide-scene thermal awareness.",
          cover_image: "/assets/images/services/services-page-1-1.jpg",
          highlights: ["Optimized for wide-angle thermal surveillance", "Balanced edge clarity and low distortion", "Fits compact infrared camera platforms"],
          applications: ["Campus entrances", "Perimeter monitoring", "Warehouse aisles", "Thermal awareness systems"],
          metrics: [
            { value: "9mm", label: "Focal length" },
            { value: "Wide", label: "Field type" },
            { value: "12um", label: "Sensor match" },
          ],
        },
      },
      {
        slug: "ir-lens-19mm",
        category_slug: "lenses",
        locale: "en",
        name: "IR Lens 19mm",
        short_description: "Standard focal lens",
        description: "The 19mm lens offers one of the most balanced options in common thermal projects, combining practical detection range, strong transmission, and a structure that fits standard camera designs.",
        images: ["/assets/images/services/services-page-1-2.jpg"],
        tags: ["infrared", "lens", "19mm", "f1.0"],
        specifications: {
          cards: ["Balanced imaging", "F1.0 transmission", "Compact package"],
          metrics: [
            { value: "19mm", label: "Focal length" },
            { value: "F1.0", label: "Transmission" },
            { value: "Std", label: "Positioning" },
          ],
        },
        display_order: 5,
        visibility: "published",
        extra: {
          family_id: "lenses",
          family_name: "Lenses",
          model: "IR Lens 19mm",
          subtitle: "Standard focal lens",
          card_description: "A balanced choice for mainstream security deployments and general thermal imaging.",
          cover_image: "/assets/images/services/services-page-1-2.jpg",
          highlights: ["Strong fit for general thermal security", "Balanced brightness and focal reach", "Compatible with standard thermal cores"],
          applications: ["Standard cameras", "Small PTZs", "Industrial monitoring", "General OEM systems"],
          metrics: [
            { value: "19mm", label: "Focal length" },
            { value: "F1.0", label: "Transmission" },
            { value: "Std", label: "Positioning" },
          ],
        },
      },
      {
        slug: "ir-lens-35mm",
        category_slug: "lenses",
        locale: "en",
        name: "IR Lens 35mm",
        short_description: "Mid-tele lens",
        description: "The 35mm mid-tele lens is designed for longer-distance recognition tasks and tougher field conditions, making it a stronger option for elevated installations and border-facing deployments.",
        images: ["/assets/images/services/services-page-1-3.jpg"],
        tags: ["infrared", "lens", "35mm", "tele"],
        specifications: {
          cards: ["Extended reach", "Metal housing", "Impact-resistant structure"],
          metrics: [
            { value: "35mm", label: "Focal length" },
            { value: "Tele", label: "Field type" },
            { value: "Metal", label: "Housing" },
          ],
        },
        display_order: 6,
        visibility: "published",
        extra: {
          family_id: "lenses",
          family_name: "Lenses",
          model: "IR Lens 35mm",
          subtitle: "Mid-tele lens",
          card_description: "Optimized for longer-range recognition in border and elevated surveillance positions.",
          cover_image: "/assets/images/services/services-page-1-3.jpg",
          highlights: ["Better suited to mid-to-long range tasks", "Higher structural strength", "Reliable in demanding outdoor conditions"],
          applications: ["Border protection", "High-point observation", "Bridge approaches", "Critical zone patrol"],
          metrics: [
            { value: "35mm", label: "Focal length" },
            { value: "Tele", label: "Field type" },
            { value: "Metal", label: "Housing" },
          ],
        },
      },
      {
        slug: "eo-039",
        category_slug: "eyepieces",
        locale: "en",
        name: "EO-0.39",
        short_description: "Lightweight thermal eyepiece",
        description: "EO-0.39 is optimized for lightweight observation products, helping portable devices stay compact while preserving practical viewing comfort in field use.",
        images: ["/assets/images/services/services-page-1-4.jpg"],
        tags: ["infrared", "eyepiece", "portable", "0.39"],
        specifications: {
          cards: ["Compact assembly", "Comfortable eye relief", "Small-device ready"],
          metrics: [
            { value: "0.39\"", label: "Display size" },
            { value: "Light", label: "Structure" },
            { value: "Portable", label: "Device fit" },
          ],
        },
        display_order: 7,
        visibility: "published",
        extra: {
          family_id: "eyepieces",
          family_name: "Eyepieces",
          model: "EO-0.39",
          subtitle: "Lightweight thermal eyepiece",
          card_description: "Compact and efficient for portable thermal instruments and lightweight terminals.",
          cover_image: "/assets/images/services/services-page-1-4.jpg",
          highlights: ["Lightweight structure for portable devices", "Comfortable for mobile observation", "A good fit for compact thermal terminals"],
          applications: ["Handheld viewers", "Portable night devices", "Lightweight terminals", "Observation accessories"],
          metrics: [
            { value: "0.39\"", label: "Display size" },
            { value: "Light", label: "Structure" },
            { value: "Portable", label: "Device fit" },
          ],
        },
      },
      {
        slug: "eo-05-hd",
        category_slug: "eyepieces",
        locale: "en",
        name: "EO-0.5 HD",
        short_description: "High-definition eyepiece",
        description: "EO-0.5 HD is designed for applications where image quality and observation detail matter most, combining stronger display clarity with comfort for longer sessions.",
        images: ["/assets/images/services/services-page-1-5.jpg"],
        tags: ["infrared", "eyepiece", "oled", "hd"],
        specifications: {
          cards: ["HD OLED", "High contrast", "Comfort for extended use"],
          metrics: [
            { value: "OLED", label: "Display type" },
            { value: "HD", label: "Image grade" },
            { value: "High", label: "Contrast level" },
          ],
        },
        display_order: 8,
        visibility: "published",
        extra: {
          family_id: "eyepieces",
          family_name: "Eyepieces",
          model: "EO-0.5 HD",
          subtitle: "High-definition eyepiece",
          card_description: "Improves visual detail for products where observation quality is the primary priority.",
          cover_image: "/assets/images/services/services-page-1-5.jpg",
          highlights: ["Improved display detail for observation", "High contrast for more complex night scenes", "Suitable for professional observation products"],
          applications: ["Observation scopes", "Professional handhelds", "Inspection devices", "Night viewing products"],
          metrics: [
            { value: "OLED", label: "Display type" },
            { value: "HD", label: "Image grade" },
            { value: "High", label: "Contrast level" },
          ],
        },
      },
      {
        slug: "eo-dual-view",
        category_slug: "eyepieces",
        locale: "en",
        name: "EO-Dual View",
        short_description: "Dual-mode eyepiece module",
        description: "EO-Dual View is built for products that need both real-time viewing and on-site recording, helping teams move faster in field workflows that depend on capture and review.",
        images: ["/assets/images/services/services-page-1-6.jpg"],
        tags: ["infrared", "eyepiece", "dual-mode", "modular"],
        specifications: {
          cards: ["View and record sync", "Anti-fog design", "Modular mounting"],
          metrics: [
            { value: "Dual", label: "Operating mode" },
            { value: "Anti-fog", label: "Environmental fit" },
            { value: "Modular", label: "Mounting" },
          ],
        },
        display_order: 9,
        visibility: "published",
        extra: {
          family_id: "eyepieces",
          family_name: "Eyepieces",
          model: "EO-Dual View",
          subtitle: "Dual-mode eyepiece module",
          card_description: "Supports observation and recording workflows in the same field-ready optical package.",
          cover_image: "/assets/images/services/services-page-1-6.jpg",
          highlights: ["Integrated view and recording workflow", "Better fit for field coordination", "Modular installation for easier maintenance"],
          applications: ["Mission recording devices", "Inspection terminals", "Evidence capture", "Modular optical platforms"],
          metrics: [
            { value: "Dual", label: "Operating mode" },
            { value: "Anti-fog", label: "Environmental fit" },
            { value: "Modular", label: "Mounting" },
          ],
        },
      },
      {
        slug: "ptz-300",
        category_slug: "systems",
        locale: "en",
        name: "PTZ-300",
        short_description: "Dual-spectrum PTZ camera",
        description: "PTZ-300 integrates thermal and visible imaging into a single PTZ platform for deployments that need day-night linking, automated patrol workflows, and remote monitoring efficiency.",
        images: ["/assets/images/services/services-two-hover-img-1.jpg"],
        tags: ["infrared", "system", "dual-spectrum", "ptz"],
        specifications: {
          cards: ["Dual-spectrum fusion", "Smart presets", "All-weather patrol"],
          metrics: [
            { value: "Dual", label: "Spectrum" },
            { value: "PTZ", label: "Platform type" },
            { value: "24/7", label: "Duty mode" },
          ],
        },
        display_order: 10,
        visibility: "published",
        extra: {
          family_id: "systems",
          family_name: "Systems",
          model: "PTZ-300",
          subtitle: "Dual-spectrum PTZ camera",
          card_description: "Combines thermal and visible modules for perimeter, campus, and high-point surveillance.",
          cover_image: "/assets/images/services/services-two-hover-img-1.jpg",
          highlights: ["Dual-spectrum fusion for round-the-clock awareness", "Built for automated patrol and duty cycles", "Reduces integration effort for project teams"],
          applications: ["Campus security", "Perimeter defense", "High-point patrol", "Traffic observation"],
          metrics: [
            { value: "Dual", label: "Spectrum" },
            { value: "PTZ", label: "Platform type" },
            { value: "24/7", label: "Duty mode" },
          ],
        },
      },
      {
        slug: "borderscope-x2",
        category_slug: "systems",
        locale: "en",
        name: "BorderScope X2",
        short_description: "Border monitoring terminal",
        description: "BorderScope X2 is strengthened for border-facing deployments that need more dependable night discovery, extended duty cycles, and better resilience in exposed outdoor conditions.",
        images: ["/assets/images/services/services-two-hover-img-2.jpg"],
        tags: ["infrared", "system", "border", "alert"],
        specifications: {
          cards: ["Long-range detection", "Alarm linkage", "Low-temperature stability"],
          metrics: [
            { value: "Long", label: "Detection range" },
            { value: "Alert", label: "System linkage" },
            { value: "Low Temp", label: "Environment" },
          ],
        },
        display_order: 11,
        visibility: "published",
        extra: {
          family_id: "systems",
          family_name: "Systems",
          model: "BorderScope X2",
          subtitle: "Border monitoring terminal",
          card_description: "Built for continuous duty in harsh environments with stronger night discovery performance.",
          cover_image: "/assets/images/services/services-two-hover-img-2.jpg",
          highlights: ["Stronger long-range discovery performance", "Built for all-weather duty cycles", "Supports alarm and platform linkage"],
          applications: ["Border monitoring", "Coastal stations", "Critical site duty", "Low-temperature deployment"],
          metrics: [
            { value: "Long", label: "Detection range" },
            { value: "Alert", label: "System linkage" },
            { value: "Low Temp", label: "Environment" },
          ],
        },
      },
      {
        slug: "vehiclecam-v5",
        category_slug: "systems",
        locale: "en",
        name: "VehicleCam V5",
        short_description: "Vehicle thermal camera",
        description: "VehicleCam V5 is designed for mobile platforms where shock resistance, latency control, and stable thermal output are critical to maintaining usable imagery on the move.",
        images: ["/assets/images/services/services-two-hover-img-3.jpg"],
        tags: ["infrared", "system", "vehicle", "low-latency"],
        specifications: {
          cards: ["Anti-vibration design", "Wide temperature range", "Low-latency output"],
          metrics: [
            { value: "Vehicle", label: "Platform fit" },
            { value: "Low Latency", label: "Output profile" },
            { value: "Wide Temp", label: "Operating range" },
          ],
        },
        display_order: 12,
        visibility: "published",
        extra: {
          family_id: "systems",
          family_name: "Systems",
          model: "VehicleCam V5",
          subtitle: "Vehicle thermal camera",
          card_description: "Delivers reliable thermal video and night assistance for mobile platforms.",
          cover_image: "/assets/images/services/services-two-hover-img-3.jpg",
          highlights: ["Built for mobile thermal sensing", "Higher resistance to vibration", "Low-latency output for real-time decisions"],
          applications: ["Vehicle observation", "Special-purpose fleets", "Mobile patrol", "Integrated payload systems"],
          metrics: [
            { value: "Vehicle", label: "Platform fit" },
            { value: "Low Latency", label: "Output profile" },
            { value: "Wide Temp", label: "Operating range" },
          ],
        },
      },
    ],
  },
};

async function main() {
  const client = new Client(buildConnectionConfig());
  await client.connect();

  try {
    await client.query("BEGIN");

    for (const locale of Object.keys(locales)) {
      const config = locales[locale];

      await client.query(
        `INSERT INTO product_categories
          (slug, parent_slug, locale, name, description, display_order, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug, locale) DO UPDATE SET
           parent_slug = EXCLUDED.parent_slug,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           display_order = EXCLUDED.display_order,
           visibility = EXCLUDED.visibility`,
        [
          config.parentCategory.slug,
          config.parentCategory.parent_slug,
          config.parentCategory.locale,
          config.parentCategory.name,
          config.parentCategory.description,
          config.parentCategory.display_order,
          config.parentCategory.visibility,
        ]
      );

      for (const category of config.categories) {
        await client.query(
          `INSERT INTO product_categories
            (slug, parent_slug, locale, name, description, display_order, visibility)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (slug, locale) DO UPDATE SET
             parent_slug = EXCLUDED.parent_slug,
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             display_order = EXCLUDED.display_order,
             visibility = EXCLUDED.visibility`,
          [
            category.slug,
            category.parent_slug,
            category.locale,
            category.name,
            category.description,
            category.display_order,
            category.visibility,
          ]
        );
      }

      for (const product of config.products) {
        await client.query(
          `INSERT INTO products_key
            (slug, category_slug, locale, name, short_description, description,
             price, original_price, currency, images, tags, specifications,
             visibility, display_order, extra)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, 'USD', $7, $8, $9, $10, $11, $12)
           ON CONFLICT (slug, locale) DO UPDATE SET
             category_slug = EXCLUDED.category_slug,
             name = EXCLUDED.name,
             short_description = EXCLUDED.short_description,
             description = EXCLUDED.description,
             currency = EXCLUDED.currency,
             images = EXCLUDED.images,
             tags = EXCLUDED.tags,
             specifications = EXCLUDED.specifications,
             visibility = EXCLUDED.visibility,
             display_order = EXCLUDED.display_order,
             extra = EXCLUDED.extra`,
          [
            product.slug,
            product.category_slug,
            product.locale,
            product.name,
            product.short_description,
            product.description,
            product.images,
            product.tags,
            JSON.stringify(product.specifications),
            product.visibility,
            product.display_order,
            JSON.stringify(product.extra),
          ]
        );
      }

      await client.query(
        `DELETE FROM products_key
         WHERE locale = $1
           AND slug = ANY($2::text[])`,
        [locale, staleProductSlugs]
      );

      await client.query(
        `DELETE FROM product_categories
         WHERE locale = $1
           AND slug = ANY($2::text[])`,
        [locale, staleCategorySlugs]
      );
    }

    await client.query("COMMIT");
    console.log("Infrared product categories and products synchronized successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
