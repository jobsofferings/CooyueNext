import type { Locale } from '@/i18n-config'

export type ModuleId = 'optics' | 'detector' | 'display' | 'viewfinder' | 'controls' | 'power'
export type ImagingMode = 'thermal' | 'gas' | 'mono'

export interface ProductModule {
  id: ModuleId
  number: string
  label: string
  title: string
  english: string
  description: string
  detail: string
  tags: string[]
}

export const productModules: Record<Locale, ProductModule[]> = {
  zh: [
    {
      id: 'optics', number: '01', label: '红外光学', title: '把不可见，带入视野。', english: 'INFRARED OPTICS',
      description: '红外光学系统收集目标场景的红外辐射，将信息传递至探测器。无需接触目标，即可开始观察。',
      detail: '从镜头开始，沿着红外信号的路径，理解气体成像的第一步。',
      tags: ['非接触观察', '红外成像'],
    },
    {
      id: 'detector', number: '02', label: '制冷探测器', title: '敏锐，源自核心。', english: 'COOLED DETECTOR',
      description: '制冷型红外探测器是 PV400 的成像核心。原厂公布的红外分辨率为 320 × 256，帧频为 50 Hz。',
      detail: '这里用独立模块示意探测与信号处理环节，内部结构并非原厂工程图。',
      tags: ['320 × 256', '50 Hz'],
    },
    {
      id: 'display', number: '03', label: '翻折触控屏', title: '换个角度，一样清晰。', english: 'FLIP-OUT DISPLAY',
      description: '翻折式 LCD 触控屏支持多角度观察。气体增强算法帮助呈现气体的分布与扩散，便于现场查看。',
      detail: '下方切换演示配色，3D 机身上的屏幕也会同步变化。',
      tags: ['LCD 触控', '多角度查看'],
    },
    {
      id: 'viewfinder', number: '04', label: 'OLED 取景器', title: '专注眼前的每一处。', english: 'OLED VIEWFINDER',
      description: '可旋转 OLED 取景器提供另一种观察方式，与翻折屏配合，适应不同的拍摄姿态。',
      detail: '转动模型，查看取景器与提手、机身之间的位置关系。',
      tags: ['OLED', '可旋转取景'],
    },
    {
      id: 'controls', number: '05', label: '手持操控', title: '让巡检，掌握在手。', english: 'HANDHELD CONTROLS',
      description: '顶部提手与机身按键构成便携操作区域。这个模块展示产品外观中的握持与操作布局。',
      detail: '模型按产品图片重建外观关系，不对按键定义、材料或尺寸作工程级推定。',
      tags: ['顶部提手', '实体操控'],
    },
    {
      id: 'power', number: '06', label: '便携供电', title: '从工作台，走向现场。', english: 'PORTABLE POWER',
      description: '原厂配件资料列有锂电池与桌面充电器。独立的供电模块示意设备便携使用的组成环节。',
      detail: '电池位置、内部连接及拆卸路径仅作功能演示，实际操作请遵循原厂手册。',
      tags: ['锂电池供电', '现场巡检'],
    },
  ],
  en: [
    {
      id: 'optics', number: '01', label: 'Infrared optics', title: 'Bring the invisible into view.', english: 'INFRARED OPTICS',
      description: 'The optical system collects infrared radiation from the scene and directs it to the detector for non-contact observation.',
      detail: 'Follow the signal from the lens to explore the first stage of infrared imaging.',
      tags: ['Non-contact', 'Infrared imaging'],
    },
    {
      id: 'detector', number: '02', label: 'Cooled detector', title: 'Sensitivity starts at the core.', english: 'COOLED DETECTOR',
      description: 'A cooled infrared detector sits at the heart of PV400 imaging. Published specifications include 320 × 256 resolution and a 50 Hz frame rate.',
      detail: 'This module illustrates detection and processing, not the manufacturer’s internal engineering design.',
      tags: ['320 × 256', '50 Hz'],
    },
    {
      id: 'display', number: '03', label: 'Flip-out display', title: 'A clearer angle on the scene.', english: 'FLIP-OUT DISPLAY',
      description: 'The flip-out LCD touchscreen supports multi-angle viewing. Gas-enhancement processing helps visualize gas distribution and diffusion.',
      detail: 'Change the demonstration palette below to update the screen on the 3D camera, too.',
      tags: ['LCD touchscreen', 'Multi-angle viewing'],
    },
    {
      id: 'viewfinder', number: '04', label: 'OLED viewfinder', title: 'Stay focused on the details.', english: 'OLED VIEWFINDER',
      description: 'The rotating OLED viewfinder complements the flip-out display for observation from different operating positions.',
      detail: 'Rotate the model to explore the viewfinder’s position relative to the handle and body.',
      tags: ['OLED', 'Rotating viewfinder'],
    },
    {
      id: 'controls', number: '05', label: 'Handheld controls', title: 'Inspection, in your hands.', english: 'HANDHELD CONTROLS',
      description: 'The top handle and physical controls form a portable operating layout, reconstructed here from the product reference image.',
      detail: 'Button assignments, materials and dimensions are not engineering specifications.',
      tags: ['Top handle', 'Physical controls'],
    },
    {
      id: 'power', number: '06', label: 'Portable power', title: 'Built to leave the workbench.', english: 'PORTABLE POWER',
      description: 'The manufacturer lists a lithium battery and desktop charger. This module illustrates the portable power stage.',
      detail: 'Battery placement, connections and removal paths are illustrative. Follow the official operating manual.',
      tags: ['Lithium battery', 'Field inspection'],
    },
  ],
}

export const experienceCopy = {
  zh: {
    back: '返回产品中心', category: '光学气体成像 · PV SERIES', title: '洞见无形，拆解可能。',
    intro: '不止于一张产品图。转动、拆解、探索，从光学镜头到成像核心，重新认识 PV400。',
    lab: '交互实验室', assembled: '整机视图', exploded: '爆炸拆解', auto: '自动旋转', pause: '暂停旋转',
    reset: '重置视角', zoomIn: '放大模型', zoomOut: '缩小模型', drag: '拖动旋转', scroll: '滚轮缩放', touch: '单指旋转 · 双指缩放',
    loading: '正在构建 3D 展台', fallback: '当前设备暂不支持 3D，仍可探索下方功能说明。', retry: '重新加载 3D',
    selected: '正在探索', next: '下一个模块', previous: '上一个模块', explodeLabel: '拆解程度',
    modelNote: '基于产品图片构建的功能示意模型，非原厂 CAD；拆解路径不作为维修指导。',
    modelLabel: 'PV400 三维功能示意模型。拖动旋转，双指或滚轮缩放；键盘方向键旋转，加减键缩放，0 重置。',
    resolution: '红外分辨率', frameRate: '成像帧频', detector: '红外探测器', cooled: '制冷型',
    previewTag: '02 / 成像探索', previewTitle: '让细微变化，', previewAccent: '变得直观。',
    previewDescription: '切换三种演示配色，观察同一模拟场景中的不同视觉表达。机身屏幕与演示窗口实时联动。',
    thermal: '铁红热像', gas: '气体增强', mono: '白热灰阶', simulated: '程序模拟 · 非实测画面',
    previewNote: '演示配色不代表设备的完整模式清单；不用于气体识别、浓度判断或安全决策。',
    signal: '从红外信号，到可见信息', signalSteps: ['光学采集', '红外探测', '图像处理', '屏幕呈现'],
    referenceTag: '03 / 产品档案', referenceTitle: '真实产品，是一切的起点。',
    referenceText: '这个交互展台让产品功能更容易被理解。实际配置、适用气体、性能与操作要求，请以原厂资料和项目确认结果为准。',
    referenceImage: 'PV400 原厂产品参考图', source: '查看原厂资料', inquire: '咨询产品方案',
    verified: '规格来源：Guide Sensmart PV Series 原厂公开页面', explore: '点击编号或下方模块，探索部件功能',
    paletteLabel: '选择演示配色', viewLabel: '选择模型视图', moduleLabel: '选择产品功能模块',
    fullscreen: '全屏查看', exitFullscreen: '退出全屏',
  },
  en: {
    back: 'Back to products', category: 'OPTICAL GAS IMAGING · PV SERIES', title: 'See the unseen. Explore within.',
    intro: 'More than a product image. Rotate, separate and explore the PV400, from its optics to its imaging core.',
    lab: 'Interactive lab', assembled: 'Assembled', exploded: 'Exploded', auto: 'Auto rotate', pause: 'Pause rotation',
    reset: 'Reset view', zoomIn: 'Zoom in', zoomOut: 'Zoom out', drag: 'Drag to rotate', scroll: 'Scroll to zoom', touch: 'Drag to rotate · Pinch to zoom',
    loading: 'Building your 3D experience', fallback: '3D is unavailable on this device. You can still explore every module below.', retry: 'Retry 3D',
    selected: 'EXPLORING', next: 'Next module', previous: 'Previous module', explodeLabel: 'Explode amount',
    modelNote: 'An illustrative model based on product imagery, not manufacturer CAD. Separation paths are not service instructions.',
    modelLabel: 'PV400 interactive illustrative model. Drag to rotate, pinch or scroll to zoom. Arrow keys rotate, plus/minus zoom, 0 resets.',
    resolution: 'IR resolution', frameRate: 'Frame rate', detector: 'IR detector', cooled: 'Cooled',
    previewTag: '02 / IMAGING EXPLORER', previewTitle: 'Small changes.', previewAccent: 'A clearer picture.',
    previewDescription: 'Switch between three illustrative palettes of the same simulated scene. The preview and the camera’s 3D display stay in sync.',
    thermal: 'Iron palette', gas: 'Gas highlight', mono: 'White hot', simulated: 'SIMULATED · NOT MEASURED',
    previewNote: 'Demonstration palettes are not a complete device mode list. Not for gas identification, concentration measurement or safety decisions.',
    signal: 'From infrared signals to visible information', signalSteps: ['Optical collection', 'IR detection', 'Image processing', 'Display'],
    referenceTag: '03 / PRODUCT FILE', referenceTitle: 'The real product. The starting point.',
    referenceText: 'This interactive exhibit makes the functions easier to understand. Refer to manufacturer documentation for configuration, gases, performance and operating requirements.',
    referenceImage: 'PV400 manufacturer product reference image', source: 'Manufacturer details', inquire: 'Discuss your application',
    verified: 'Specifications: Guide Sensmart PV Series official product page', explore: 'Select a numbered point or a module to explore its function',
    paletteLabel: 'Choose a demonstration palette', viewLabel: 'Choose a model view', moduleLabel: 'Choose a product module',
    fullscreen: 'Enter fullscreen', exitFullscreen: 'Exit fullscreen',
  },
} as const
