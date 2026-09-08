BEGIN;

INSERT INTO product_categories (slug, parent_slug, locale, name, description, display_order, visibility)
VALUES
  ('infrared-products', NULL, 'zh', '红外产品', '红外成像产品与组件。', 1, 'published'),
  ('infrared-products', NULL, 'en', 'Infrared Products', 'Infrared imaging products and components.', 1, 'published'),
  ('systems', 'infrared-products', 'zh', '整机系统', '红外与热成像整机系统。', 14, 'published'),
  ('systems', 'infrared-products', 'en', 'Systems', 'Complete infrared and thermal imaging systems.', 14, 'published')
ON CONFLICT (slug, locale) DO NOTHING;

WITH localized AS (
  SELECT * FROM (VALUES
    (
      'zh',
      'GLA07512K-T2 + ITZ1212IP 成像组件套件',
      '开放式成像系统套件 · 面向客户平台集成',
      '由镜头、SDI 输出机芯、镜头与机芯连接件、K10 SDI 转以太网模块，以及 K10 外壳（散热底座）组成。整套组件在完成配套供电、连接和系统集成后形成成像链路。与带统一外壳的手持相机不同，本套件以开放式组件形式供客户组装，可面向机载、车载、船载等项目进行集成。客户按平台完成安装、供电、布线、散热与环境防护设计，实际适配条件需另行确认。',
      ARRAY['成像系统', '开放式组件', '客户集成', 'SDI', '以太网', 'K10'],
      ARRAY['五大功能组件', '机芯 SDI 输出', 'K10 转以太网', '无整套统一外壳'],
      '整机系统',
      ARRAY['整套包含镜头、机芯、连接件、K10 及其外壳／散热底座', '机芯提供 SDI 输出，K10 将 SDI 转换为以太网输出', '开放式组件供客户组装，不是封装在统一外壳内的手持相机', '提供基于原始 STEP 几何的交互式三维组件展示', '安装、供电、散热、接口细节与环境适配按项目确认'],
      ARRAY['机载平台成像系统的客户侧集成', '车载平台成像系统的客户侧集成', '船载平台成像系统的客户侧集成', '定制设备与其他成像平台集成（需确认适配条件）'],
      '[{"value":"5","label":"功能组件"},{"value":"SDI","label":"机芯输出"},{"value":"Ethernet","label":"K10 输出"}]'::jsonb
    ),
    (
      'en',
      'GLA07512K-T2 + ITZ1212IP Imaging Kit',
      'Open-frame imaging system kit · Customer platform integration',
      'A complete component kit comprising a lens, an SDI-output imaging core, a lens-to-core mechanical adapter, a K10 SDI-to-Ethernet converter, and the K10 housing / heat-sink base. With the required power, connections and system integration, these components form an imaging chain. Unlike a handheld camera with a common outer enclosure, this open-frame kit is assembled by the customer for airborne, vehicle, marine or other platform projects. The customer designs mounting, power, wiring, cooling and environmental protection; suitability and interface details require project confirmation.',
      ARRAY['Imaging system', 'Open-frame kit', 'Customer integration', 'SDI', 'Ethernet', 'K10'],
      ARRAY['Five functional modules', 'SDI core output', 'K10 to Ethernet', 'No common outer enclosure'],
      'Systems',
      ARRAY['Includes lens, imaging core, adapter, K10 and its housing / heat-sink base', 'The core provides SDI output; K10 converts SDI to Ethernet output', 'Open-frame components for customer assembly, not an enclosed handheld camera', 'Interactive component viewer derived from the supplied STEP geometry', 'Mounting, power, cooling, interface details and environmental suitability require project confirmation'],
      ARRAY['Customer integration into airborne imaging platforms', 'Customer integration into vehicle imaging platforms', 'Customer integration into marine imaging platforms', 'Custom equipment and other imaging platforms, subject to suitability confirmation'],
      '[{"value":"5","label":"Functional modules"},{"value":"SDI","label":"Core output"},{"value":"Ethernet","label":"K10 output"}]'::jsonb
    )
  ) AS content(locale, name, subtitle, description, tags, cards, family_name, highlights, applications, metrics)
)
INSERT INTO products_key (
  slug, category_slug, locale, name, short_description, description,
  price, original_price, currency, images, tags, specifications,
  visibility, display_order, extra
)
SELECT
  'gla07512k-t2-itz1212ip-imaging-kit',
  'systems',
  localized.locale::"locale",
  name,
  subtitle,
  description,
  NULL,
  NULL,
  'USD',
  ARRAY['/assets/models/imaging-kit/imaging-kit.webp'],
  tags,
  jsonb_build_object(
    'model', 'GLA07512K-T2 + ITZ1212IP',
    'cards', to_jsonb(cards),
    'core_output', 'SDI',
    'converter', 'K10',
    'converter_output', 'Ethernet',
    'common_outer_enclosure', false,
    'source_url', 'https://whale-core-infra.oss-cn-shanghai.aliyuncs.com/20260421_proto/GLA07512K-T2%20ITZ1212IP%20p240921.stp',
    'source_type', 'Customer-provided functional description and STEP geometry',
    'unverified_parameters', ARRAY['resolution', 'focal_length', 'frame_rate', 'network_protocol', 'encoding', 'latency', 'power', 'environmental_rating']
  ),
  'published',
  0,
  jsonb_build_object(
    'model', 'GLA07512K-T2 + ITZ1212IP',
    'subtitle', subtitle,
    'family_id', 'systems',
    'family_name', family_name,
    'card_description', CASE WHEN localized.locale = 'zh'
      THEN '一套供客户组装的开放式成像组件：镜头、SDI 机芯、连接件、K10 转以太网模块及散热底座。面向机载、车载、船载等平台集成，非统一外壳手持相机。'
      ELSE 'An open-frame imaging kit with lens, SDI core, adapter, K10 Ethernet converter and heat-sink housing. For customer integration into airborne, vehicle and marine projects, not an enclosed handheld camera.' END,
    'cover_image', '/assets/models/imaging-kit/imaging-kit.webp',
    'highlights', to_jsonb(highlights),
    'applications', to_jsonb(applications),
    'metrics', metrics,
    'model_3d', '/assets/models/imaging-kit/imaging-kit.glb',
    'image_source', 'CAD render from customer-provided STEP',
    'source_checked_at', '2026-09-08'
  )
FROM localized
ON CONFLICT (slug, locale) DO NOTHING;

COMMIT;
