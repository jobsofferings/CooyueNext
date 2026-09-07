'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Locale } from '@/i18n-config'

interface ProductListCard {
  id: string
  model: string
  subtitle: string
  description: string
  specs: string[]
}

interface ProductFamilySection {
  id: string
  name: string
  lead: string
  products: ProductListCard[]
}

interface ProductCatalogProps {
  sections: ProductFamilySection[]
  lang: Locale
  contactLabel: string
  viewLabel: string
  moreLabel: string
  lessLabel: string
}

const INITIAL_PRODUCT_LIMIT = 6

export default function ProductCatalog({
  sections,
  lang,
  contactLabel,
  viewLabel,
  moreLabel,
  lessLabel,
}: ProductCatalogProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }))
  }

  return (
    <div className="products-catalog__list">
      {sections.map((section) => {
        const isExpanded = Boolean(expandedSections[section.id])
        const visibleProducts = isExpanded
          ? section.products
          : section.products.slice(0, INITIAL_PRODUCT_LIMIT)
        const hiddenCount = section.products.length - visibleProducts.length
        const hasMoreProducts = section.products.length > INITIAL_PRODUCT_LIMIT

        return (
          <div key={section.id} id={section.id} className="products-catalog__section products-anchor">
            <div className="products-catalog__section-header">
              <div>
                <h3 className="products-catalog__section-title">{section.name}</h3>
                <p className="products-catalog__section-lead">{section.lead}</p>
              </div>
              <Link href={`/${lang}/contact`} className="products-catalog__header-link">
                {contactLabel}
                <span className="fa fa-angle-right"></span>
              </Link>
            </div>

            <div id={`${section.id}-products`} className="row products-catalog__grid">
              {visibleProducts.map((product) => (
                <div key={product.id} className="col-xl-4 col-lg-4 col-md-6">
                  <Link
                    href={`/${lang}/products/${product.id}`}
                    className="products-catalog__card"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="products-catalog__card-label">{section.name}</span>
                    <h4 className="products-catalog__card-model">{product.model}</h4>
                    <p className="products-catalog__card-subtitle">{product.subtitle}</p>
                    <p className="products-catalog__card-description">{product.description}</p>
                    <ul className="products-catalog__specs list-unstyled">
                      {product.specs.map((spec) => (
                        <li key={spec}>
                          <span className="fa fa-check-circle"></span>
                          {spec}
                        </li>
                      ))}
                    </ul>
                    <span className="products-catalog__detail-link">
                      {viewLabel}
                      <span className="fa fa-angle-right"></span>
                    </span>
                  </Link>
                </div>
              ))}
            </div>

            {hasMoreProducts && (
              <div className="products-catalog__more">
                <button
                  type="button"
                  className="products-catalog__more-btn"
                  aria-expanded={isExpanded}
                  aria-controls={`${section.id}-products`}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className={`fa ${isExpanded ? 'fa-angle-up' : 'fa-plus'}`}></span>
                  <span>{isExpanded ? lessLabel : moreLabel}</span>
                  {!isExpanded && <span className="products-catalog__more-count">{hiddenCount}</span>}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
