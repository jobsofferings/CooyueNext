const products = [
  {
    slug: "guide-sensmart-pv400",
    name: "Guide Sensmart PV400",
    url: "https://www.guideir.com/products/gas-detection/pv-series",
    title: "Guide Sensmart PV Series — PV400",
    gases: ["methane", "voc"],
    resolution: "320 × 256",
    sections: {
      zh: [
        ["用途", "PV400 是手持式光学气体成像设备，采用制冷型中波红外探测器，用于甲烷及部分挥发性有机化合物的泄漏可视化。"],
        ["成像参数", "PV400 的红外探测器分辨率为 320 × 256。具体气体适用性应核对厂家公布的可检测气体清单。"],
      ],
      en: [
        ["Applications", "PV400 is a handheld optical gas imaging camera with a cooled MWIR detector for visualizing methane and selected VOC leaks."],
        ["Imaging", "PV400 has a 320 × 256 infrared detector. Check the manufacturer's gas list for the intended substance."],
      ],
    },
  },
  {
    slug: "flir-g306",
    name: "FLIR G306",
    url: "https://www.flir.com/products/g306/",
    title: "FLIR G306 — Optical Gas Imaging Camera for SF6",
    gases: ["sf6", "ammonia", "ethylene"],
    resolution: "320 × 240",
    sections: {
      zh: [
        ["用途", "FLIR G306 用于六氟化硫（SF6）、氨、乙烯及其他适用工业气体的光学成像，应用场景包括变电站及电力设备检查。"],
        ["成像参数", "G306 是手持式气体成像相机，红外分辨率为 320 × 240。该资料不构成对甲烷检测能力的确认。"],
      ],
      en: [
        ["Applications", "FLIR G306 images sulfur hexafluoride (SF6), ammonia, ethylene and other compatible industrial gases, including inspection applications at substations and electrical equipment."],
        ["Imaging", "G306 is a handheld gas imaging camera with 320 × 240 infrared resolution. This evidence does not establish methane compatibility."],
      ],
    },
  },
  {
    slug: "flir-gf77",
    name: "FLIR GF77",
    url: "https://www.flir.com/products/gf77/",
    title: "FLIR GF77 — Uncooled Optical Gas Imaging Camera",
    gases: ["methane", "sf6", "ammonia", "ethylene"],
    resolution: "320 × 240",
    sections: {
      zh: [
        ["用途", "FLIR GF77 为非制冷手持式气体成像相机。厂家列出的目标气体包括甲烷、六氟化硫（SF6）、氨和乙烯，实际气体适用性需要结合镜头配置确认。"],
        ["成像参数", "GF77 的红外分辨率为 320 × 240。不能将不同镜头支持的气体视为同一配置下全部可检测。"],
      ],
      en: [
        ["Applications", "FLIR GF77 is an uncooled handheld gas imaging camera. Listed gases include methane, SF6, ammonia and ethylene; compatibility depends on the lens configuration."],
        ["Imaging", "GF77 has 320 × 240 infrared resolution. Gas capabilities across different lenses must not be treated as capabilities of every configuration."],
      ],
    },
  },
];

module.exports = products.flatMap((product) => ["zh", "en"].map((locale) => ({
  key: `${product.slug}-${locale}-official`,
  productSlug: product.slug,
  locale,
  category: "gas-imaging-cameras",
  title: product.title,
  sourceUrl: product.url,
  version: "2026-09-08.1",
  reviewedAt: "2026-09-08T00:00:00Z",
  facts: { name: product.name, gases: product.gases, formFactor: "handheld", resolution: product.resolution },
  sections: product.sections[locale].map(([title, content], index) => ({ key: String(index + 1), title, content })),
})));
