'use client'

import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { MAX_SELECTED_PRODUCTS, type KnowledgeProduct } from '@/lib/knowledge-api'
import styles from './knowledge.module.css'

export default function ProductCards({ products, locale, selected, disabled, onToggle }: {
  products: KnowledgeProduct[]; locale: Locale; selected: KnowledgeProduct[]; disabled: boolean; onToggle: (product: KnowledgeProduct) => void
}) {
  const chinese = locale === 'zh'
  return <div className={styles.grid} data-agent-product-cards>{products.map((product) => {
    const checked = selected.some((item) => item.slug === product.slug)
    return <article key={product.slug} className={`${styles.product} ${checked ? styles.selected : ''}`} data-product-id={product.slug}>
      <span className={styles.hint}>{product.categoryName}</span><h3>{product.name}</h3><p>{product.description}</p>
      <ul>{product.specs.slice(0, 4).map((spec) => <li key={spec}>{spec}</li>)}</ul>
      <div className={styles.links}><Link href={`/${locale}/products/${product.slug}`} target="_blank" rel="noopener noreferrer">{chinese ? '查看产品详情' : 'View product details'}</Link></div>
      <label className={styles.check}><input type="checkbox" checked={checked} disabled={disabled || (!checked && selected.length >= MAX_SELECTED_PRODUCTS)} onChange={() => onToggle(product)} />{chinese ? '加入对比 / 询盘' : 'Select for comparison / inquiry'}</label>
    </article>
  })}</div>
}
