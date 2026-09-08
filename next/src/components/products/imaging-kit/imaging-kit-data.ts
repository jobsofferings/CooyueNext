import type { Locale } from '@/i18n-config'

export const imagingKitSlug = 'gla07512k-t2-itz1212ip-imaging-kit'
export const modelUrl = '/assets/models/imaging-kit/imaging-kit.glb'
export const posterUrl = '/assets/models/imaging-kit/imaging-kit.webp'
export const sourceUrl = 'https://whale-core-infra.oss-cn-shanghai.aliyuncs.com/20260421_proto/GLA07512K-T2%20ITZ1212IP%20p240921.stp'
export const moduleIds = ['lens', 'core', 'adapter', 'k10', 'housing'] as const
export type ModuleId = typeof moduleIds[number]

interface ProductModule {
  id: ModuleId
  number: string
  label: string
  description: string
}

export const productModules: Record<Locale, ProductModule[]> = {
  zh: [
    { id: 'lens', number: '01', label: '镜头', description: '前端光学组件，将场景光线汇聚至机芯。展示保留了 CAD 中的镜筒、镜片及相关结构；具体光学参数以项目确认资料为准。' },
    { id: 'core', number: '02', label: '机芯 · SDI 输出', description: '成像机芯接收镜头形成的光学图像，并提供 SDI 视频输出。机芯与后端 K10 配合构成视频输出链路；供电、线缆和控制接口需在集成时确认。' },
    { id: 'adapter', number: '03', label: '镜头／机芯连接件', description: '位于镜头与机芯之间的机械连接结构，用于衔接两侧组件。拆解展示将连接法兰及相关紧固件作为一组呈现；定位与安装要求以工程图纸为准。' },
    { id: 'k10', number: '04', label: 'K10 转换模块', description: '将机芯的 SDI 信号转换为以太网输出，供客户侧系统接入。点击此模块可展开查看内部板卡；具体网络协议、编码方式和延迟未在现有资料中确认。' },
    { id: 'housing', number: '05', label: 'K10 外壳／散热底座', description: 'K10 的局部外壳及散热底座，为转换模块提供结构支撑与散热接触面。它不包覆整套组件，不等同于手持相机的一体式外壳；整套系统的安装与防护由客户按平台设计。' },
  ],
  en: [
    { id: 'lens', number: '01', label: 'Lens', description: 'The front optical assembly focuses the scene onto the imaging core. The viewer retains the barrel, optical elements and associated structures from the CAD file. Optical specifications require project confirmation.' },
    { id: 'core', number: '02', label: 'Core · SDI output', description: 'The imaging core receives the optical image and provides SDI video output. It works with the downstream K10 module; power, cabling and control interfaces must be confirmed during integration.' },
    { id: 'adapter', number: '03', label: 'Lens-to-core adapter', description: 'The mechanical interface between the lens and imaging core. The connecting flange and associated fasteners are presented as one functional group. Alignment and installation requirements are defined by the engineering drawings.' },
    { id: 'k10', number: '04', label: 'K10 converter', description: 'Converts the core’s SDI signal to Ethernet output for connection to the customer’s system. Selecting this module separates the assembly to reveal the electronics. Network protocol, encoding and latency are not confirmed by the supplied information.' },
    { id: 'housing', number: '05', label: 'K10 housing / heat sink', description: 'The local K10 enclosure and heat-sink base support the converter and provide a thermal contact surface. They do not enclose the complete kit. Platform mounting and environmental protection are designed by the customer.' },
  ],
}

export const experienceCopy = {
  zh: {
    title: '从成像到输出，看清每一层结构',
    intro: '自动循环展示镜头、机芯、连接件、K10 与散热外壳，依次查看五个功能模块和装配关系。',
    assembled: '装配视图', exploded: '组件拆解', viewLabel: '切换装配与拆解视图',
    play: '开始轮播', pause: '暂停轮播', carousel: '循环轮播', manual: '手动查看', reset: '重置视图', zoomIn: '放大', zoomOut: '缩小',
    loading: '正在加载 CAD 三维模型…', fallback: '当前无法显示交互模型，可查看 CAD 渲染图与下方组件说明。', retry: '重新加载',
    modelLabel: '成像组件套件三维模型。拖动旋转，滚轮或双指缩放；方向键旋转，加减号缩放，0 重置视图。',
    poster: 'GLA07512K-T2 + ITZ1212IP 成像组件套件 CAD 渲染图',
    gesture: '拖动旋转 · 滚轮／双指缩放 · 点击组件查看说明',
    separation: '组件分离程度', modules: '选择成像组件',
    chainTitle: '成像与信号链路', chain: ['镜头', '机芯', 'SDI 信号', 'K10', '以太网输出'],
    integrationTitle: '一套成像组件，多种集成平台',
    integration: '可面向机载、车载、船载等项目进行客户侧集成。不是带统一外壳的手持相机；客户需按平台完成装配、供电、布线、散热与防护设计，适配条件另行确认。',
    note: '几何来自所提供的 CAD（69 个实体）。原文件未提供部件名称，五组划分依据结构位置与提供的功能说明；展示配色、分离方向和间距仅用于讲解，不作为材料、尺寸、装配顺序或平台认证依据。',
  },
  en: {
    title: 'Explore the complete imaging chain',
    intro: 'Automatically cycle through the lens, imaging core, adapter, K10 converter and heat-sink housing, then repeat the assembly tour.',
    assembled: 'Assembled', exploded: 'Exploded', viewLabel: 'Assembly views',
    play: 'Start carousel', pause: 'Pause carousel', carousel: 'Looping tour', manual: 'Manual view', reset: 'Reset view', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    loading: 'Loading the CAD model…', fallback: 'The interactive model is unavailable. The CAD render and component descriptions remain available.', retry: 'Retry',
    modelLabel: 'Imaging kit 3D model. Drag to rotate, scroll or pinch to zoom. Arrow keys rotate, plus/minus zoom, and 0 resets the view.',
    poster: 'CAD render of the GLA07512K-T2 + ITZ1212IP imaging kit',
    gesture: 'Drag to rotate · Scroll / pinch to zoom · Select a component',
    separation: 'Component separation', modules: 'Select an imaging component',
    chainTitle: 'Imaging and signal chain', chain: ['Lens', 'Imaging core', 'SDI signal', 'K10', 'Ethernet output'],
    integrationTitle: 'One imaging kit. Your integration platform.',
    integration: 'For customer integration into airborne, vehicle and marine projects. This is not a handheld camera with a common outer enclosure. The customer designs mounting, power, wiring, cooling and environmental protection; platform suitability requires confirmation.',
    note: 'Geometry comes from the supplied CAD (69 bodies). The source has no component names; the five functional groups are interpreted from geometry and the supplied descriptions. Display finishes and separation paths are illustrative, not material specifications, dimensions, assembly instructions or platform certifications.',
  },
}
