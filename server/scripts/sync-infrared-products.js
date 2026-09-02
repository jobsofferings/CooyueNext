require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Client } = require("pg");

const SOURCE_CHECKED_AT = "2026-09-02";

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
  "a19-germanium-lens",
  "a35-long-range-lens",
  "borderscope-x2",
  "cx640-uncooled-core",
  "cy-384s",
  "cy-640m",
  "cy-lwir-pro",
  "d2-rugged-eyepiece",
  "eo-039",
  "eo-05-hd",
  "eo-dual-view",
  "ir-lens-19mm",
  "ir-lens-35mm",
  "ir-lens-9mm",
  "m384-compact-core",
  "ptz-300",
  "v1-thermal-eyepiece",
  "vehiclecam-v5",
];

const staleCategorySlugs = [
  "infrared-cores",
  "infrared-lenses",
  "thermal-eyepieces",
];

const categoryMeta = {
  "infrared-products": {
    parent_slug: null,
    en: "Infrared Products",
    zh: "红外产品",
    enDescription: "Source-backed infrared product catalog covering thermal imaging devices, cores, optics, thermometers, pyrometers, and accessories.",
    zhDescription: "有来源可追溯的红外产品库，覆盖热像设备、机芯、镜头、红外测温仪、高温计与相关附件。",
    display_order: 1,
  },
  cores: {
    parent_slug: "infrared-products",
    en: "Cores",
    zh: "机芯",
    enDescription: "Infrared camera cores and OEM thermal modules.",
    zhDescription: "红外机芯和 OEM 热像模块。",
    display_order: 11,
  },
  lenses: {
    parent_slug: "infrared-products",
    en: "Lenses",
    zh: "镜头",
    enDescription: "Infrared lens and optical assemblies.",
    zhDescription: "红外镜头与光学组件。",
    display_order: 12,
  },
  eyepieces: {
    parent_slug: "infrared-products",
    en: "Eyepieces",
    zh: "目镜",
    enDescription: "Thermal eyepieces and clip-on viewing accessories.",
    zhDescription: "热像目镜与转接观察附件。",
    display_order: 13,
  },
  systems: {
    parent_slug: "infrared-products",
    en: "Systems",
    zh: "整机系统",
    enDescription: "Complete infrared and thermal imaging systems.",
    zhDescription: "红外与热成像整机系统。",
    display_order: 14,
  },
  "handheld-thermal-cameras": {
    parent_slug: "infrared-products",
    en: "Handheld Thermal Cameras",
    zh: "手持热像仪",
    enDescription: "Handheld infrared thermal cameras for inspection and maintenance.",
    zhDescription: "用于巡检、维护和诊断的手持红外热像仪。",
    display_order: 21,
  },
  "thermal-monoculars": {
    parent_slug: "infrared-products",
    en: "Thermal Monoculars",
    zh: "热成像单筒",
    enDescription: "Thermal monoculars for observation and outdoor detection.",
    zhDescription: "用于观察和户外探测的热成像单筒设备。",
    display_order: 22,
  },
  "thermal-scopes": {
    parent_slug: "infrared-products",
    en: "Thermal Scopes",
    zh: "热成像瞄具",
    enDescription: "Thermal scopes and clip-on thermal sight products.",
    zhDescription: "热成像瞄具和前置夹瞄类产品。",
    display_order: 23,
  },
  "thermal-binoculars": {
    parent_slug: "infrared-products",
    en: "Thermal Binoculars",
    zh: "热成像双筒",
    enDescription: "Thermal and multi-spectrum binocular observation devices.",
    zhDescription: "热成像和多光谱双筒观察设备。",
    display_order: 24,
  },
  "thermal-phone-modules": {
    parent_slug: "infrared-products",
    en: "Phone Thermal Modules",
    zh: "手机热像模块",
    enDescription: "Thermal camera modules and attachments for mobile phones.",
    zhDescription: "面向手机的热像模块和热成像附件。",
    display_order: 25,
  },
  "fixed-thermal-cameras": {
    parent_slug: "infrared-products",
    en: "Fixed Thermal Cameras",
    zh: "固定式热像仪",
    enDescription: "Fixed thermal cameras for monitoring, automation, and machine vision.",
    zhDescription: "面向监控、自动化和机器视觉的固定式热像仪。",
    display_order: 26,
  },
  "gas-imaging-cameras": {
    parent_slug: "infrared-products",
    en: "Gas Imaging Cameras",
    zh: "气体红外成像",
    enDescription: "Infrared optical gas imaging and gas detection cameras.",
    zhDescription: "红外光学气体成像和气体检测相机。",
    display_order: 27,
  },
  "infrared-thermometers": {
    parent_slug: "infrared-products",
    en: "Infrared Thermometers",
    zh: "红外测温仪",
    enDescription: "Non-contact infrared thermometers and visual IR thermometers.",
    zhDescription: "非接触红外测温仪和可视化红外测温产品。",
    display_order: 28,
  },
  pyrometers: {
    parent_slug: "infrared-products",
    en: "Pyrometers",
    zh: "红外高温计",
    enDescription: "Industrial infrared pyrometers and process temperature sensors.",
    zhDescription: "工业红外高温计和过程测温传感器。",
    display_order: 29,
  },
  "ir-accessories": {
    parent_slug: "infrared-products",
    en: "IR Accessories",
    zh: "红外附件",
    enDescription: "Infrared lenses, windows, adapters, and related thermal imaging accessories.",
    zhDescription: "红外镜头、窗口、适配器和相关热像附件。",
    display_order: 30,
  },
};

const productGroups = [
  {
    brand: "Cooyue",
    family: "CY-T Series",
    category_slug: "infrared-thermometers",
    source_name: "Cooyue internal sample catalog",
    source_url: "",
    sample: true,
    names: ["CY-T80", "CY-T160", "CY-T320"],
  },
  {
    brand: "Cooyue",
    family: "CY-PY Series",
    category_slug: "pyrometers",
    source_name: "Cooyue internal sample catalog",
    source_url: "",
    sample: true,
    names: ["CY-PY650", "CY-PY1200", "CY-PY1800"],
  },
  {
    brand: "Cooyue",
    family: "IR accessory samples",
    category_slug: "ir-accessories",
    source_name: "Cooyue internal sample catalog",
    source_url: "",
    sample: true,
    names: ["CY-IRW-50 Inspection Window", "CY-LA-25 Lens Adapter", "CY-MB-01 Mounting Bracket"],
  },
  {
    brand: "HIKMICRO",
    family: "LYNX 3.0",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO LYNX 3.0 thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/lynx-3-0-thermal-monocular/",
    names: ["LE10 3.0", "LE15 3.0", "LH15 3.0", "LH19 3.0", "LH25 3.0", "LH35 3.0", "LQ35 3.0"],
  },
  {
    brand: "HIKMICRO",
    family: "LYNX 2.0",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO LYNX 2.0 thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/lynx-2-0-thermal-monocular/",
    names: ["LH15 2.0", "LH19 2.0", "LH25 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "LYNX S",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO LYNX S thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/lynx-s-thermal-monocular/",
    names: ["LC06S", "LE10S", "LE15S"],
  },
  {
    brand: "HIKMICRO",
    family: "LYNX Pro",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO LYNX Pro thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/lynx-pro-series-monocular/",
    names: ["LH15", "LH19", "LH25"],
  },
  {
    brand: "HIKMICRO",
    family: "FALCON 2.0",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO FALCON 2.0 thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/falcon-2-0-thermal-monocular/",
    names: ["FQ35 2.0", "FQ50 2.0", "FQ50L 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "FALCON",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO FALCON thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/falcon-series-monocular/",
    names: ["FH25", "FH35", "FQ25", "FQ35", "FQ50"],
  },
  {
    brand: "HIKMICRO",
    family: "CONDOR LRF 2.0",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO CONDOR LRF 2.0 thermal monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/condor-2-0-thermal-lrf-monocular/",
    names: ["CQ35L 2.0", "CQ50L 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "CONDOR",
    category_slug: "thermal-monoculars",
    source_name: "HIKMICRO CONDOR thermal LRF monocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/condor-thermal-lrf-monocular/",
    names: ["CH25L", "CH35L", "CQ35L", "CQ50L"],
  },
  {
    brand: "HIKMICRO",
    family: "STELLAR 3.0",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO STELLAR 3.0 thermal scope page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/stellar-3-0-thermal-scope/",
    names: ["SH35 3.0", "SH35L 3.0", "SH50L 3.0", "SQ35L 3.0", "SQ50L 3.0", "SX60L 3.0", "SX60LS 3.0"],
  },
  {
    brand: "HIKMICRO",
    family: "STELLAR 2.0",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO STELLAR 2.0 thermal scope page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/stellar-2-0-thermal-scope/",
    names: ["SQ50 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "STELLAR",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO STELLAR thermal scope page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/stellar-series-thermal-scope/",
    names: ["SH35", "SH50", "SQ35", "SQ50"],
  },
  {
    brand: "HIKMICRO",
    family: "THUNDER 3.0",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO THUNDER 3.0 thermal clip-on page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/thunder-3-0-thermal-clip-on/",
    names: ["TH35C 3.0", "TQ35C 3.0", "TQ35CL 3.0", "TQ50C 3.0", "TQ50CL 3.0"],
  },
  {
    brand: "HIKMICRO",
    family: "THUNDER 2.0",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO THUNDER 2.0 thermal scope page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/thunder2-0-series-thermal-scope/",
    names: ["TE19 2.0", "TE25 2.0", "TH25P 2.0", "TH35P 2.0", "TQ35 2.0", "TQ50 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "THUNDER ZOOM 2.0",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO THUNDER ZOOM 2.0 thermal scope page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/thunder-zoom-2-0-thermal-scope/",
    names: ["TH50Z 2.0", "TQ60Z 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "THUNDER 2.0 Clip-On",
    category_slug: "thermal-scopes",
    source_name: "HIKMICRO THUNDER 2.0 thermal clip-on page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/thunder2-0-series-thermal-clip-on/",
    names: ["TE19C 2.0", "TE19CR 2.0"],
  },
  {
    brand: "HIKMICRO",
    family: "HABROK Pro",
    category_slug: "thermal-binoculars",
    source_name: "HIKMICRO HABROK Pro multi-spectrum binocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/habrok-pro-multi-spectrum-binocular/",
    names: ["HQ50L", "HQ50LN", "HX60L", "HX60LN", "HX60LS"],
  },
  {
    brand: "HIKMICRO",
    family: "HABROK 4K",
    category_slug: "thermal-binoculars",
    source_name: "HIKMICRO HABROK 4K multi-spectrum binocular page",
    source_url: "https://www.hikmicrotech.com/en/outdoor-products/habrok-4k-multi-spectrum-binocular/",
    names: ["HE25L 5.5-22x60", "HE25LN 5.5-22x60", "HQ35L 5.5-22x60"],
  },
  {
    brand: "HIKMICRO",
    family: "Mini",
    category_slug: "thermal-phone-modules",
    source_name: "HIKMICRO industrial products page",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/",
    names: ["MiniE", "Mini3", "Mini2 V2", "Mini2Plus V2", "Mini-X", "Mini3R"],
  },
  {
    brand: "HIKMICRO",
    family: "B/Eco/Pocket handheld",
    category_slug: "handheld-thermal-cameras",
    source_name: "HIKMICRO handheld thermal imager pages",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/",
    names: ["B20S", "B21LS", "Eco", "Eco-V", "Pocket2"],
  },
  {
    brand: "HIKMICRO",
    family: "M Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "HIKMICRO M Series handheld thermal imager page",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/m-series-handheld-thermal-imager/",
    names: ["M11", "M11W", "M20", "M20W", "M31", "M31T", "M60"],
  },
  {
    brand: "HIKMICRO",
    family: "G Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "HIKMICRO G Series handheld thermal imager page",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/gx1-series-handheld-thermal-imager/",
    names: ["G31", "G41", "G41H", "G61", "G61H"],
  },
  {
    brand: "HIKMICRO",
    family: "SP Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "HIKMICRO SP Series handheld thermal imager page",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/sp60-and-sp60h-series-handheld-thermal-imager/",
    names: ["SP40", "SP40H", "SP60", "SP60H", "SP100H", "SP120H"],
  },
  {
    brand: "HIKMICRO",
    family: "Fixed box and cube cameras",
    category_slug: "fixed-thermal-cameras",
    source_name: "HIKMICRO fixed thermographic camera pages",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/",
    names: ["HM-TD2A37T-15/Q", "HM-TD2A37T-25/Q", "HM-TD2A67T-15/Q", "HM-TD2A67T-25/Q", "HM-TD3118T-2/Q", "QF310", "QF610"],
  },
  {
    brand: "HIKMICRO",
    family: "PD/PS Pyrometer",
    category_slug: "pyrometers",
    source_name: "HIKMICRO pyrometer pages",
    source_url: "https://www.hikmicrotech.com/en/industrial-products/pyrometer/",
    names: ["PD110", "PD111", "PD120", "PD121", "PD210", "PD220", "PD230", "PS210", "PS220", "PS230"],
  },
  {
    brand: "Guide Sensmart",
    family: "EasIR Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "Guide Sensmart EasIR Series page",
    source_url: "https://www.guideir.com/products/thermography-tools/easir-series",
    names: ["E2+S", "E2S", "E1+S", "E1S", "E2+", "E1+", "E1"],
  },
  {
    brand: "Guide Sensmart",
    family: "EasIR Max Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "Guide Sensmart EasIR Max Series page",
    source_url: "https://www.guideir.com/products/thermography-tools/easir-max-series",
    names: ["E4S", "E3S", "E4", "E3"],
  },
  {
    brand: "Guide Sensmart",
    family: "Hammer II Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "Guide Sensmart Hammer II Series page",
    source_url: "https://www.guideir.com/products/thermography-tools/hammer-2-series",
    names: ["H6S", "H4S", "H3+S", "H3S", "H2S", "H6", "H4", "H3+", "H3", "H2"],
  },
  {
    brand: "Guide Sensmart",
    family: "PT II Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "Guide Sensmart PT II Series page",
    source_url: "https://www.guideir.com/products/thermography-tools/pt-2-series",
    names: ["PT850S", "PT650S", "PT450S", "PT850", "PT650", "PT450", "PT870S"],
  },
  {
    brand: "Guide Sensmart",
    family: "PF Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "Guide Sensmart PF Series page",
    source_url: "https://www.guideir.com/products/thermography-tools/pf-series",
    names: ["PF210S", "PF210"],
  },
  {
    brand: "Guide Sensmart",
    family: "MobIR 3.0 Series",
    category_slug: "thermal-phone-modules",
    source_name: "Guide Sensmart MobIR 3.0 Series page",
    source_url: "https://www.guideir.com/products/mobile-accessories/mobir-3-0-series",
    names: ["MobIR ES2+", "MobIR ES2", "MobIR ES1"],
  },
  {
    brand: "Guide Sensmart",
    family: "MobIR Air Series",
    category_slug: "thermal-phone-modules",
    source_name: "Guide Sensmart MobIR Air Series page",
    source_url: "https://www.guideir.com/products/mobile-accessories/mobir-air-series",
    names: ["MobIR Air"],
  },
  {
    brand: "Guide Sensmart",
    family: "MobIR 2S",
    category_slug: "thermal-phone-modules",
    source_name: "Guide Sensmart MobIR 2S page",
    source_url: "https://www.guideir.com/products/mobile-accessories/mobir-2s",
    names: ["MobIR 2S", "MobIR 2T"],
  },
  {
    brand: "Guide Sensmart",
    family: "PR II Series",
    category_slug: "systems",
    source_name: "Guide Sensmart PR II firefighting camera page",
    source_url: "https://www.guideir.com/products/firefighting-cameras/pr-2-series",
    names: ["PR610S", "PR410S", "PR610", "PR410"],
  },
  {
    brand: "Guide Sensmart",
    family: "PV Series",
    category_slug: "gas-imaging-cameras",
    source_name: "Guide Sensmart PV Series gas detection page",
    source_url: "https://www.guideir.com/products/gas-detection/pv-series",
    names: ["PV400"],
  },
  {
    brand: "FLIR",
    family: "Cx-Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "FLIR Cx-Series compact thermal camera page",
    source_url: "https://www.flir.com/browse/portable-inspection-solutions/handheld-thermal-cameras/cx-series/",
    names: ["Cx5", "C8", "C5", "C3-X"],
  },
  {
    brand: "FLIR",
    family: "ONE Series",
    category_slug: "thermal-phone-modules",
    source_name: "FLIR ONE Series page",
    source_url: "https://www.flir.com/browse/portable-inspection-solutions/handheld-thermal-cameras/flir-one/",
    names: ["ONE Edge Pro", "ONE Edge", "ONE", "ONE Pro"],
  },
  {
    brand: "FLIR",
    family: "Exx-Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "FLIR Exx-Series page",
    source_url: "https://www.flir.com/browse/portable-inspection-solutions/handheld-thermal-cameras/exx-series/",
    names: ["E54", "E76", "E86", "E96"],
  },
  {
    brand: "FLIR",
    family: "T-Series",
    category_slug: "handheld-thermal-cameras",
    source_name: "FLIR T-Series page",
    source_url: "https://www.flir.com/browse/portable-inspection-solutions/handheld-thermal-cameras/t-series/",
    names: ["T865", "T840", "T560", "T540", "T530", "T1010", "T1020"],
  },
  {
    brand: "FLIR",
    family: "TG-Series",
    category_slug: "infrared-thermometers",
    source_name: "FLIR TG-Series page",
    source_url: "https://www.flir.com/browse/portable-inspection-solutions/handheld-thermal-cameras/tg-series/",
    names: ["TG298", "TG268", "TG165-X"],
  },
  {
    brand: "FLIR",
    family: "IR Guided Measurement",
    category_slug: "infrared-thermometers",
    source_name: "FLIR infrared guided measurement page",
    source_url: "https://www.flir.com/browse/test--measurement/infrared-guided-measurement/",
    names: ["CM276", "DM286", "MR160", "MR176", "MR265", "MR277"],
  },
  {
    brand: "FLIR",
    family: "Fixed thermal cameras",
    category_slug: "fixed-thermal-cameras",
    source_name: "FLIR fixed thermal cameras page",
    source_url: "https://www.flir.com/browse/continuous-monitoring/fixed-thermal-cameras/",
    names: ["A40 Compact Thermal Smart Sensor Camera", "A50 Smart Sensor", "A70 Smart Sensor", "AX8", "A6451", "A6481"],
  },
  {
    brand: "FLIR",
    family: "Axxx-Series",
    category_slug: "fixed-thermal-cameras",
    source_name: "FLIR Axxx-Series Smart Sensor page",
    source_url: "https://www.flir.com/products/axxx-series-smart-sensor/",
    names: ["A400 Smart Sensor", "A500 Smart Sensor", "A700 Smart Sensor"],
  },
  {
    brand: "FLIR",
    family: "A500f/A700f",
    category_slug: "fixed-thermal-cameras",
    source_name: "FLIR A500f/A700f Advanced Smart Sensor page",
    source_url: "https://www.flir.com/products/a500f_a700f-environmental-housing-camera/",
    names: ["A500f Advanced Smart Sensor", "A700f Advanced Smart Sensor"],
  },
  {
    brand: "FLIR",
    family: "Optical gas imaging",
    category_slug: "gas-imaging-cameras",
    source_name: "FLIR handheld gas detection cameras page",
    source_url: "https://www.flir.com/browse/optical-gas-imaging/handheld-gas-detection-cameras/",
    names: ["G304", "G306", "G343", "G346", "G609", "GF77", "QL320"],
  },
  {
    brand: "FLIR",
    family: "Fixed gas detection",
    category_slug: "gas-imaging-cameras",
    source_name: "FLIR fixed gas detection cameras page",
    source_url: "https://www.flir.com/browse/optical-gas-imaging/fixed-gas-detection-cameras/",
    names: ["G620a", "GF77a", "ADGiLE"],
  },
  {
    brand: "FLIR",
    family: "Thermal security cameras",
    category_slug: "systems",
    source_name: "FLIR thermal security cameras page",
    source_url: "https://www.flir.com/browse/security/thermal-security-cameras/",
    names: ["Elara DX-Series", "Elara FB-Series ID", "FC-Series AI", "FC-Series AI-R", "FCB-Series AI", "FH-Series ID", "FH-Series R", "FH-Series R PTZ", "PT-Series AI SR", "Triton F-Series ID"],
  },
  {
    brand: "Teledyne FLIR OEM",
    family: "Infrared Camera Cores",
    category_slug: "cores",
    source_name: "Teledyne FLIR OEM products page",
    source_url: "https://oem.flir.com/en/products/",
    names: ["Boson", "Hadron 640", "Lepton", "Neutrino", "Boson Plus IQ Development Kit"],
  },
  {
    brand: "Teledyne FLIR OEM",
    family: "Zoom lens assemblies",
    category_slug: "lenses",
    source_name: "Teledyne FLIR OEM products page",
    source_url: "https://oem.flir.com/en/products/",
    names: ["LWIR Zoom Lens Assemblies", "MWIR Zoom Lens Assemblies"],
  },
  {
    brand: "Fluke",
    family: "Thermal Cameras",
    category_slug: "handheld-thermal-cameras",
    source_name: "Fluke thermal cameras page",
    source_url: "https://www.fluke.com/en-us/products/thermal-cameras",
    names: ["iSee Mobile Thermal Camera TC01A", "iSee Mobile Thermal Camera TC01B", "iSee Mobile Thermal Camera TC01C", "Ti480 PRO", "TiX580", "Ti480U", "Ti401U", "Ti300U", "TiS75+", "TiS55+", "TiS60+", "TiS20+", "TiS20+ MAX", "PTi120", "RSE300", "RSE600", "Ti300+", "Ti401 PRO"],
  },
  {
    brand: "Fluke",
    family: "IR Thermometers",
    category_slug: "infrared-thermometers",
    source_name: "Fluke IR thermometers page",
    source_url: "https://www.fluke.com/en-us/products/temperature-measurement/ir-thermometers",
    names: ["64 MAX", "561 Infrared and Contact Thermometer", "568 Infrared and Contact Thermometer", "62 MAX+", "62 MAX", "59 MAX+", "59 MAX", "572-2", "568 Ex", "417D / 62 MAX+ Kit", "414D / 62 MAX+ Kit", "62 MAX+ / 323 / 1AC Kit", "62 MAX+ / T+PRO / 1AC Kit"],
  },
  {
    brand: "Fluke",
    family: "Thermal imaging accessories",
    category_slug: "ir-accessories",
    source_name: "Fluke thermal imaging accessories page",
    source_url: "https://www.fluke.com/en-us/products/accessories/thermal-imaging",
    names: ["25 Micron Macro Infrared Smart Lens", "Smart Infrared 4x Telephoto Lens", "2x Telephoto Infrared Smart Lens", "Wide Angle Infrared Smart Lens", "Infrared Camera Visor 2", "Ti Visor 3", "Ti Eyepiece"],
  },
  {
    brand: "Fluke",
    family: "IR windows",
    category_slug: "ir-accessories",
    source_name: "Fluke IR windows page",
    source_url: "https://www.fluke.com/en-us/products/thermal-imaging/ir-windows",
    names: ["CV400 95 mm Infrared Window", "050 CLKT IR Window", "075 CLKT IR Window", "100 CLKT IR Window", "CV401 95 mm Infrared Window", "CV200 50 mm Infrared Window", "CV300 75 mm Infrared Window", "CV301 75 mm Infrared Window"],
  },
  {
    brand: "UNI-T",
    family: "Infrared Thermometers",
    category_slug: "infrared-thermometers",
    source_name: "UNI-T infrared thermometers page",
    source_url: "https://meters.uni-trend.com/product-categories/infrared-thermometers/",
    names: ["UT305+ Series", "UT300 Series", "UT301+ Series", "UT302+/UT303+ Series", "UT305S", "UT306A", "UT306 Series", "UT309 Series", "UT309D", "UT300A", "UT300C", "UT305A", "UT305C", "UT303A", "UT303C", "UT303D"],
  },
  {
    brand: "UNI-T",
    family: "Infrared contact thermometers",
    category_slug: "infrared-thermometers",
    source_name: "UNI-T infrared contact thermometer page",
    source_url: "https://meters.uni-trend.com/product-categories/infrared-contact-thermometer/",
    names: ["A63", "UT320T"],
  },
  {
    brand: "Fluke Process Instruments",
    family: "Thermal imaging solutions",
    category_slug: "fixed-thermal-cameras",
    source_name: "Fluke Process Instruments thermal imaging solutions page",
    source_url: "https://www.flukeprocessinstruments.com/en-us/products/infrared-temperature-solutions/thermal-imaging-solutions",
    names: ["ThermoView TV30", "ThermoView TV40"],
  },
  {
    brand: "Fluke Process Instruments",
    family: "Infrared pyrometers",
    category_slug: "pyrometers",
    source_name: "Fluke Process Instruments infrared pyrometers page",
    source_url: "https://www.flukeprocessinstruments.com/en-us/products/infrared-temperature-solutions/infrared-pyrometers",
    names: ["Endurance Series", "Thermalert 4.0", "Raytek Compact CI", "Raytek Compact CM", "Raytek Compact GP", "Raytek Compact MI3", "Raytek Marathon MM", "Raytek Raynger 3i Plus"],
  },
  {
    brand: "AMETEK Land",
    family: "Fixed spot infrared pyrometers",
    category_slug: "pyrometers",
    source_name: "AMETEK Land fixed spot non-contact thermometers page",
    source_url: "https://www.ametek-land.com/products/non-contact-infrared-thermometers-pyrometers",
    names: ["SPOT+ Non-Contact Infrared Pyrometer", "SPOT+ AL", "SPOT+ GS", "SPOT+ MM", "SPOT+ TMT", "SPOT Actuator", "Landmark Signal Processors", "Furnace Gas Temperature CDB", "SPOT+ EXSH", "EX LWIR", "HotSpotIR EX 9000", "SD Blast Furnace Stove Dome"],
  },
  {
    brand: "AMETEK Land",
    family: "Portable infrared products",
    category_slug: "infrared-thermometers",
    source_name: "AMETEK Land portable non-contact thermometers page",
    source_url: "https://www.ametek-land.com/products/portable-non-contact-thermometers",
    names: ["Cyclops L Handheld Portable Pyrometer", "Gold Cup Reference Pyrometer", "Modular Gold Cup Reference Pyrometer"],
  },
  {
    brand: "AMETEK Land",
    family: "Portable thermal imagers",
    category_slug: "systems",
    source_name: "AMETEK Land portable thermal imagers page",
    source_url: "https://www.ametek-land.com/products/portable-thermal-imagers",
    names: ["Light Portable Furnace Thermal Imaging System"],
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/®|™/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function displayName(brand, model) {
  const normalized = model.replace(/\bFlir\b/g, "FLIR");
  return normalized.toLowerCase().startsWith(brand.toLowerCase())
    ? normalized
    : `${brand} ${normalized}`;
}

function getCategories(locale) {
  return Object.entries(categoryMeta).map(([slug, meta]) => ({
    slug,
    parent_slug: meta.parent_slug,
    locale,
    name: locale === "zh" ? meta.zh : meta.en,
    description: locale === "zh" ? meta.zhDescription : meta.enDescription,
    display_order: meta.display_order,
    visibility: "published",
  }));
}

function makeProduct(group, model, locale, displayOrder) {
  const category = categoryMeta[group.category_slug];
  const name = displayName(group.brand, model);
  const categoryName = locale === "zh" ? category.zh : category.en;
  const isSample = group.sample === true;
  const shortDescription = locale === "zh"
    ? isSample
      ? `${group.brand} 内部样例${categoryName}，用于完善分类展示`
      : `${group.brand} ${group.family} ${categoryName}型号`
    : isSample
      ? `${group.brand} internal sample ${categoryName.toLowerCase()} for catalog display`
      : `${group.brand} ${group.family} ${categoryName.toLowerCase()} model`;
  const description = locale === "zh"
    ? isSample
      ? `${name} 是 Cooyue 内部样例产品资料，用于完善前台分类展示。型号和详细规格需在正式发布前由产品负责人确认。`
      : `${name} 是一条有来源的红外产品资料，型号来自 ${group.source_name}。此记录只保存已核实的品牌、型号、类别与来源，详细规格以来源页面为准。`
    : isSample
      ? `${name} is a Cooyue internal sample catalog entry for frontend category coverage. Model naming and specifications should be confirmed before a formal release.`
      : `${name} is a source-backed infrared product catalog entry from ${group.source_name}. This record stores verified brand, model, category, and source information; detailed specifications should be checked on the linked source page.`;
  const sourceFields = group.source_url
    ? {
      source_url: group.source_url,
      source_checked_at: SOURCE_CHECKED_AT,
    }
    : {};
  const sampleFields = isSample ? { sample_entry: true } : {};

  return {
    slug: slugify(`${group.brand}-${model}`),
    category_slug: group.category_slug,
    locale,
    name,
    short_description: shortDescription,
    description,
    images: [],
    tags: locale === "zh"
      ? ["红外", "热成像", group.brand, group.family, categoryName]
      : ["infrared", "thermal", group.brand, group.family, categoryName],
    specifications: {
      brand: group.brand,
      model,
      family: group.family,
      category: categoryName,
      source_name: group.source_name,
      ...sourceFields,
      ...sampleFields,
    },
    visibility: "published",
    display_order: displayOrder,
    extra: {
      family_id: group.category_slug,
      family_name: categoryName,
      model,
      brand: group.brand,
      source_name: group.source_name,
      ...sourceFields,
      ...sampleFields,
      subtitle: shortDescription,
      card_description: shortDescription,
      highlights: locale === "zh"
        ? isSample
          ? ["内部样例产品", "价格未填写", "正式发布前需确认规格"]
          : ["型号来自来源页面", "价格未填写", "详细参数以来源页面为准"]
        : isSample
          ? ["Internal sample product", "Price intentionally left blank", "Specifications require confirmation before release"]
          : ["Model sourced from linked page", "Price intentionally left blank", "Specifications should be verified on the source page"],
      applications: [],
      metrics: locale === "zh"
        ? [
          { value: group.brand, label: "品牌" },
          { value: model, label: "型号" },
          { value: categoryName, label: "分类" },
        ]
        : [
          { value: group.brand, label: "Brand" },
          { value: model, label: "Model" },
          { value: categoryName, label: "Category" },
        ],
    },
  };
}

function buildProducts(locale) {
  const products = [];
  let displayOrder = 1;
  for (const group of productGroups) {
    for (const model of group.names) {
      products.push(makeProduct(group, model, locale, displayOrder++));
    }
  }
  return products;
}

function assertUniqueProducts(products) {
  const seen = new Set();
  for (const product of products) {
    const key = `${product.slug}:${product.locale}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate product key generated: ${key}`);
    }
    seen.add(key);
  }
}

async function upsertCategory(client, category) {
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

async function upsertProduct(client, product) {
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
       price = EXCLUDED.price,
       original_price = EXCLUDED.original_price,
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

async function main() {
  const client = new Client(buildConnectionConfig());
  await client.connect();

  const locales = ["zh", "en"];
  const products = locales.flatMap(buildProducts);
  assertUniqueProducts(products);

  try {
    await client.query("BEGIN");

    for (const locale of locales) {
      for (const category of getCategories(locale)) {
        await upsertCategory(client, category);
      }
    }

    for (const product of products) {
      await upsertProduct(client, product);
    }

    for (const locale of locales) {
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
    console.log(`Synchronized ${products.length} localized infrared product rows from ${productGroups.length} source groups.`);
    console.log(`Unique product slugs: ${products.length / locales.length}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
