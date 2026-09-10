import type { Locale } from '@/i18n-config'

export interface ProductGuide {
  id: string
  title: string
  category: string
  intro: string
  sections: Array<{ title: string; text: string }>
  checklist: string[]
}

export const productGuides: Record<Locale, ProductGuide[]> = {
  en: [
    {
      id: '1', title: 'How to prepare an infrared camera inquiry', category: 'Buying guide',
      intro: 'A useful inquiry starts with the job the camera needs to do. You can contact Cooyue Tech before you have chosen a model.',
      sections: [
        { title: 'Describe the task before the model', text: 'Tell us what you want to observe or measure, where the equipment will be installed and the typical viewing distance. If you are replacing a camera, include its model and what you want to change.' },
        { title: 'Separate requirements from preferences', text: 'Mark the conditions that cannot change, such as the available mounting space or a required interface. List preferred specifications separately so alternatives can be discussed without losing the purpose of the project.' },
        { title: 'Include purchasing context', text: 'Quantity, destination and your preferred schedule help frame the discussion. Pricing, configuration and delivery are confirmed in the quotation rather than inferred from a catalog listing.' },
      ],
      checklist: ['Application and target', 'Viewing distance and installation', 'Known model or required interfaces', 'Quantity, destination and preferred schedule'],
    },
    {
      id: '2', title: 'A checklist for camera customization', category: 'Customization',
      intro: 'Customization is easier to evaluate when the mechanical, electrical and operating requirements are described together.',
      sections: [
        { title: 'Define the integration boundary', text: 'Explain whether you need a complete camera or components for your own system. Identify which parts of the mounting, power, cabling, software and enclosure your team will provide.' },
        { title: 'Share only approved project materials', text: 'A mounting sketch, interface list or reference drawing can make the discussion clearer. Before sending non-public files, tell us about any confidentiality arrangements that need to be agreed.' },
        { title: 'Confirm scope before commitments', text: 'A customization inquiry is a starting point, not a confirmation that every change is feasible. The configuration, validation requirements, quantity and delivery terms need written agreement.' },
      ],
      checklist: ['Complete camera or component assembly', 'Mounting space and connection requirements', 'Power and operating environment', 'Required deliverables and acceptance criteria'],
    },
    {
      id: '3', title: 'What to include in a gas imaging inquiry', category: 'Gas imaging',
      intro: 'Describe the inspection task and target gas explicitly. A broad request for a gas camera is not enough to confirm a suitable configuration.',
      sections: [
        { title: 'Name the target and the task', text: 'Provide the gas name or mixture if known and explain what you expect the inspection to achieve. If you have an existing inspection specification, include the parts you are permitted to share.' },
        { title: 'Describe the working conditions', text: 'Include the viewing distance, access conditions, installation method and operating environment. These are questions for a product-specific review, not assumptions that every camera in the category meets your requirements.' },
        { title: 'Request a documented suitability review', text: 'Ask which configuration is proposed and which requirements remain unconfirmed. Website imagery and interactive previews are not measurement results or instructions for safety decisions.' },
      ],
      checklist: ['Target gas or inspection object', 'Inspection purpose and viewing distance', 'Portable or installed use', 'Operating conditions and required documentation'],
    },
    {
      id: '4', title: 'Planning an open imaging assembly integration', category: 'System integration',
      intro: 'An open imaging assembly and a camera with a common outer enclosure are different purchasing requirements. Define what your project needs delivered.',
      sections: [
        { title: 'Start with the component boundary', text: 'The GLA07512K-T2 + ITZ1212IP page describes an assembly of a lens, imaging core, adapter, K10 converter and local housing or heat sink. Use the component view to frame a discussion, not as a substitute for approved drawings.' },
        { title: 'Ask about the full signal path', text: 'For this assembly, the supplied description identifies SDI output from the core and Ethernet output through K10. Confirm power, connectors and the network-side requirements rather than assuming a protocol or latency from the interface name.' },
        { title: 'Agree who completes the integration', text: 'List the responsibilities for mounting, wiring, thermal management and environmental protection. Platform suitability and acceptance requirements should be confirmed before an order.' },
      ],
      checklist: ['Required components and interfaces', 'Mounting, power and wiring responsibilities', 'Network-side requirements to confirm', 'Platform and acceptance requirements'],
    },
    {
      id: '5', title: 'Making an overseas equipment quotation clearer', category: 'Purchasing',
      intro: 'A quotation is more useful when the product scope and delivery requirements are explicit. Keep unresolved questions visible during the discussion.',
      sections: [
        { title: 'List the equipment and accessories', text: 'Include the model, quantity and any required lenses, cables or mounting parts. If the model is undecided, describe the application instead of filling the inquiry with assumed specifications.' },
        { title: 'Confirm commercial details', text: 'Provide the destination country and the delivery information available at this stage. Ask for written confirmation of pricing, payment, delivery scope and after-sales terms. Do not infer these from a product page.' },
        { title: 'Distinguish references from an offer', text: 'Third-party brands in this catalog are shown for reference and do not imply an agency or authorized distribution relationship. Only an agreed quotation identifies what Cooyue Tech proposes to supply.' },
      ],
      checklist: ['Model or application and quantity', 'Accessories and customization scope', 'Destination and preferred delivery schedule', 'Commercial and support terms to confirm'],
    },
    {
      id: '6', title: 'How to prepare an after-sales support request', category: 'After-sales support',
      intro: 'A short, specific description helps us understand an equipment issue and discuss the next step within the agreed support scope.',
      sections: [
        { title: 'Identify the equipment', text: 'Include your order reference, model and serial number if available. Explain the current configuration and any changes made before the issue occurred.' },
        { title: 'Describe what you observed', text: 'State when the issue appears, what you expected and what actually happened. Screenshots or short recordings can help when you are permitted to share them. Avoid including unrelated sensitive information.' },
        { title: 'Agree on the next step', text: 'Email the information to Cooyue Tech before arranging a return or making changes that are not covered by the supplied instructions. Support scope, any return arrangements and associated terms need direct confirmation.' },
      ],
      checklist: ['Order reference and model', 'Serial number and current configuration', 'Observed issue and when it occurs', 'Contact email and relevant supporting files'],
    },
  ],
  zh: [
    {
      id: '1', title: '如何准备一封有效的红外摄像头询盘', category: '采购指南',
      intro: '有效询盘从摄像头要完成的任务开始。即使没有选定型号，也可以联系 Cooyue Tech。',
      sections: [
        { title: '先说明任务，再讨论型号', text: '告诉我们希望观察或测量什么、设备安装在哪里，以及通常的使用距离。如果要替换现有摄像头，请提供原型号和希望改善的问题。' },
        { title: '区分必须满足与优先考虑的条件', text: '标明不可改变的要求，例如安装空间或指定接口；将偏好参数单独列出，便于在不偏离任务目标的前提下讨论替代方案。' },
        { title: '补充采购信息', text: '数量、目的地和期望时间有助于确定沟通范围。价格、配置与交付需要在报价中确认，不能仅凭目录收录推断。' },
      ],
      checklist: ['应用与目标', '使用距离和安装位置', '已知型号或必要接口', '数量、目的地和期望时间'],
    },
    {
      id: '2', title: '红外摄像头定制需求清单', category: '设备定制',
      intro: '把机械、电气和使用条件一起说明，更便于评估定制需求。',
      sections: [
        { title: '明确集成范围', text: '说明需要完整摄像头，还是用于自有系统的组件。明确安装、供电、布线、软件和外壳中，哪些部分由你的团队提供。' },
        { title: '只分享允许提供的项目资料', text: '安装示意图、接口清单或参考图纸能提高沟通效率。发送未公开文件前，请先说明需要约定的保密要求。' },
        { title: '先确认范围，再确认承诺', text: '定制询盘不代表所有更改都已确认可行。配置、验证要求、数量和交付条件需要进一步书面确认。' },
      ],
      checklist: ['完整摄像头或组件套件', '安装空间与连接要求', '供电和使用环境', '交付内容与验收要求'],
    },
    {
      id: '3', title: '气体红外成像询盘，需要说明什么', category: '气体成像',
      intro: '请明确巡检任务和目标气体。仅提出“需要气体相机”，还不足以确认适用配置。',
      sections: [
        { title: '说明目标与任务', text: '提供已知的气体名称或混合物，以及希望巡检实现的目标。如果已有检测需求文件，可以提供获准分享的部分。' },
        { title: '描述使用条件', text: '补充使用距离、现场可达性、安装方式和工作环境。这些条件需要逐产品核对，不能假定同类相机都满足要求。' },
        { title: '明确要求书面的适用性确认', text: '询问建议采用哪种配置、哪些要求仍待确认。网站图片和交互式画面不是测量结果，也不能用于安全决策。' },
      ],
      checklist: ['目标气体或检测对象', '巡检目标和使用距离', '便携或固定安装', '环境条件和所需资料'],
    },
    {
      id: '4', title: '开放式成像套件，如何规划集成需求', category: '系统集成',
      intro: '开放式成像套件与统一外壳的摄像头是不同的采购要求。先明确项目需要交付哪些部分。',
      sections: [
        { title: '从组件范围开始', text: 'GLA07512K-T2 + ITZ1212IP 页面介绍镜头、机芯、连接件、K10 模块和局部外壳或散热底座。可借助组件视图梳理问题，但不能用展示图替代确认后的工程图纸。' },
        { title: '核对完整信号链', text: '该套件已有描述标明机芯输出 SDI，经 K10 输出以太网。供电、连接器和网络侧要求仍需确认，不能仅凭接口名称推断协议或延迟。' },
        { title: '明确谁完成集成', text: '列出安装、布线、散热和环境防护的责任范围。下单前确认平台适配条件和验收要求。' },
      ],
      checklist: ['所需组件与接口', '安装、供电和布线的责任划分', '待确认的网络侧要求', '平台条件和验收要求'],
    },
    {
      id: '5', title: '海外设备采购，如何把报价沟通说清楚', category: '采购沟通',
      intro: '产品范围和交付要求越明确，报价越便于核对。沟通过程中，请持续标明未确认事项。',
      sections: [
        { title: '列清设备与附件', text: '提供型号、数量，以及所需镜头、线缆或安装件。尚未确定型号时，直接说明应用，不用猜测参数来填写询盘。' },
        { title: '确认商务细节', text: '提供目的国家和现阶段已知的交付信息。要求书面确认价格、支付、交付范围和售后条款，不从产品页面自行推断。' },
        { title: '区分参考资料与实际报价', text: '目录中的第三方品牌用于参考展示，不代表合作或授权代理。Cooyue Tech 拟提供的具体设备，以双方确认的报价为准。' },
      ],
      checklist: ['型号或应用及数量', '附件与定制范围', '目的地和期望时间', '待确认的商务与售后条款'],
    },
    {
      id: '6', title: '售后问题反馈，建议准备哪些信息', category: '售后支持',
      intro: '简短、具体的问题描述，便于我们了解设备情况，并在约定支持范围内讨论下一步。',
      sections: [
        { title: '标明设备信息', text: '提供订单编号、型号和已知序列号。说明当前配置，以及问题出现前是否调整过连接、设置或其他条件。' },
        { title: '描述实际观察', text: '说明问题何时出现、预期结果和实际情况。可在允许分享的前提下附上截图或短视频，避免包含无关敏感信息。' },
        { title: '先沟通下一步', text: '安排退回或进行说明书之外的更改前，请先通过邮件联系 Cooyue Tech。支持范围、退回安排及相关条款需要直接确认。' },
      ],
      checklist: ['订单编号与型号', '序列号和当前配置', '问题现象与出现条件', '联系邮箱及相关附件'],
    },
  ],
}
