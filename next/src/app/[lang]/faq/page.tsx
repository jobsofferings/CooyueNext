import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { getCompanyContent } from '@/content/company'
import { getDictionary } from '@/get-dictionary'
import { siteConfig } from '@/config/site.config'
import type { Locale } from '@/i18n-config'
import { getSeoByPath, extractSeoMeta } from '@/lib/seo-api'

type Faq = { question: string; answer: string }

function getFaqs(locale: Locale): Faq[] {
  const copy = getCompanyContent(locale)
  if (locale === 'zh') {
    return [
      { question: '如何开始询盘或采购？', answer: '可以从一个型号开始，也可以直接描述目标、距离、安装方式和使用环境。请通过邮箱发送需求，我们会根据已有信息整理下一步需要确认的产品和条件。' },
      { question: '你们主要提供哪些红外设备？', answer: '网站目录覆盖红外摄像头、红外机芯、镜头、热像整机、气体红外成像设备及相关组件。页面中的部分第三方品牌产品仅作资料和类别参考，不代表授权代理或供货承诺。' },
      { question: '可以做红外摄像头定制吗？', answer: '我们负责红外摄像头定制沟通。请提供安装空间、接口、供电、环境、数量和交付要求，具体定制范围与配置需要逐项确认。' },
      { question: '如何获取报价和交期？', answer: '价格、配置、库存和交期会受到型号、数量、定制范围和目的地影响。请通过邮箱提供这些信息，我们会回复需要补充的条件并继续确认。' },
      { question: '海外客户可以远程沟通吗？', answer: '可以。邮箱是我们面向海外客户的主要联系渠道，产品选型、资料确认、采购协作和售后问题都可以在线沟通。' },
      { question: '气体红外成像设备需要提供哪些信息？', answer: '建议说明目标气体或检测对象、检测距离、巡检任务、环境条件、设备安装方式和输出接口。最终适用性需要结合具体产品和工况确认。' },
      { question: '第三方品牌产品是否代表你们有合作关系？', answer: copy.referenceText },
    ]
  }
  return [
    { question: 'How do I start an inquiry or purchase?', answer: 'Start with a model or describe the target, distance, mounting method and operating environment. Email the requirements and we will organize the next product and confirmation points.' },
    { question: 'What infrared equipment do you provide?', answer: 'The catalog covers infrared cameras, cores, lenses, thermal systems, gas imaging equipment and related assemblies. Some third-party brands are shown for information and category reference only, not as proof of an authorized relationship or supply commitment.' },
    { question: 'Can you customize an infrared camera?', answer: 'We handle infrared camera customization discussions. Share the mounting space, interfaces, power, environment, quantity and delivery requirements; the scope and configuration are reviewed item by item.' },
    { question: 'How do I get a quotation and lead time?', answer: 'Price, configuration, availability and lead time depend on the model, quantity, customization scope and destination. Email these details and we will reply with the next information needed.' },
    { question: 'Can overseas customers communicate remotely?', answer: 'Yes. Email is our primary contact channel for overseas customers. Product selection, document review, purchasing coordination and after-sales questions can be handled online.' },
    { question: 'What information helps with a gas imaging inquiry?', answer: 'Include the target gas or inspection object, detection distance, task, operating environment, mounting method and output interface. Suitability is confirmed for the specific product and operating conditions.' },
    { question: 'Do third-party listings mean you have a partnership?', answer: copy.referenceText },
  ]
}

export async function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Promise<Metadata> {
  const copy = getCompanyContent(lang)
  const seo = extractSeoMeta(await getSeoByPath('/faq', lang), { title: copy.faqTitle, description: copy.faqDescription })
  return { title: seo.title, description: seo.description, robots: seo.noIndex ? { index: false, follow: false } : undefined, alternates: { canonical: seo.canonical || `/${lang}/faq`, languages: { zh: '/zh/faq', en: '/en/faq' } }, openGraph: { title: seo.title, description: seo.description, url: seo.canonical || `/${lang}/faq` } }
}

export default async function FaqPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang)
  const copy = getCompanyContent(lang)
  return (
    <main>
      <PageHeader title={dict('FAQs')} breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('FAQs') }]} />
      <section className="faq-page">
        <div className="container">
          <SectionTitle tagline={lang === 'zh' ? '产品、定制与采购' : 'Products, customization and purchasing'} title={copy.faqTitle} align="center" />
          <p className="text-center faq-page__intro">{copy.faqDescription}</p>
          <div className="faq-page__inner">
            <div className="accrodion-grp faq-one-accrodion">
              {getFaqs(lang).map((faq) => <details key={faq.question} className="accrodion"><summary className="accrodion-title"><h4>{faq.question}<span className="accrodion-icon"></span></h4></summary><div className="accrodion-content"><div className="inner"><p>{faq.answer}</p></div></div></details>)}
            </div>
          </div>
          <p className="text-center"><Link href={`/${lang}/contact`} className="thm-btn">{copy.form}</Link>{' '}<a className="faq-page__email" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></p>
        </div>
      </section>
    </main>
  )
}
