'use client'

import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import type { KnowledgeProduct } from '@/lib/knowledge-api'
import styles from './agent.module.css'

const gasLabels: Record<string, { zh: string; en: string }> = {
  methane: { zh: '甲烷', en: 'Methane' }, sf6: { zh: '六氟化硫（SF6）', en: 'SF6' },
  voc: { zh: '部分挥发性有机化合物', en: 'Selected VOCs' }, ammonia: { zh: '氨', en: 'Ammonia' }, ethylene: { zh: '乙烯', en: 'Ethylene' },
}

export default function ProductComparison({ products, locale }: { products: KnowledgeProduct[]; locale: Locale }) {
  const chinese = locale === 'zh'
  const metrics = Array.from(new Set(products.flatMap((product) => product.metrics.map((metric) => metric.label))))
  const rows: Array<{ label: string; value: (product: KnowledgeProduct) => string }> = [
    { label: chinese ? '产品分类' : 'Category', value: (product) => product.categoryName },
    { label: chinese ? '产品规格' : 'Specifications', value: (product) => product.specs.join('\n') },
    ...(products.some((product) => product.facts.gases.length) ? [{ label: chinese ? '已收录的目标气体' : 'Documented gases', value: (product: KnowledgeProduct) => product.facts.gases.map((gas) => gasLabels[gas]?.[locale] || gas).join(' / ') }] : []),
    ...(products.some((product) => product.facts.resolution) ? [{ label: chinese ? '红外分辨率' : 'Infrared resolution', value: (product: KnowledgeProduct) => product.facts.resolution }] : []),
    ...metrics.map((label) => ({ label, value: (product: KnowledgeProduct) => product.metrics.find((metric) => metric.label === label)?.value || '' })),
  ]
  return <>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={chinese ? '产品参数对比' : 'Product comparison'}><table>
      <caption>{chinese ? '所选产品参数对比' : 'Selected product specifications'}</caption>
      <thead><tr><th scope="col">{chinese ? '参数' : 'Specification'}</th>{products.map((product) => <th scope="col" key={product.slug}>{product.name}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${row.label}:${index}`}><th scope="row">{row.label}</th>{products.map((product) => <td key={product.slug}>{row.value(product) || (chinese ? '待确认' : 'To be confirmed')}</td>)}</tr>)}
        <tr><th scope="row">{chinese ? '产品详情' : 'Product details'}</th>{products.map((product) => <td key={product.slug}><Link href={`/${locale}/products/${product.slug}`} target="_blank" rel="noopener noreferrer">{chinese ? '查看详情' : 'View details'}</Link></td>)}</tr>
      </tbody>
    </table></div>
    <p className={styles.actionHint}>{chinese ? '对比仅展示公开参数，不代表已确认适用性；未列参数、实际配置与工况请向工程师确认。' : 'Public specifications are not confirmation of suitability. Confirm missing parameters, configurations and operating conditions with an engineer.'}</p>
  </>
}
