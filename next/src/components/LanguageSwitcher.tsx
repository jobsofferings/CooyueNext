'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { i18n } from '@/i18n-config'
import { useDictionary, useLocale } from '@/hooks/useDictionary'
import type { MouseEvent } from 'react'

const fallbackLocaleNames: Record<string, string> = {
  zh: '中文',
  en: 'English',
}

const getLocaleLabel = (locale: string) => {
  const baseLocale = locale.split('-')[0]

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'language' })
    return displayNames.of(baseLocale) ?? fallbackLocaleNames[baseLocale] ?? locale.toUpperCase()
  } catch {
    return fallbackLocaleNames[baseLocale] ?? locale.toUpperCase()
  }
}

export default function LanguageSwitcher() {
  const pathName = usePathname()
  const currentLocale = useLocale()
  const dict = useDictionary()

  const closeAllSwitchers = () => {
    document
      .querySelectorAll<HTMLDetailsElement>('.language-switcher[open]')
      .forEach((switcher) => {
        switcher.open = false
      })
  }

  const showGlobalPreloader = () => {
    const preloader = document.querySelector<HTMLElement>('.preloader')

    if (!preloader) {
      return
    }

    preloader.style.display = 'flex'
    preloader.style.opacity = '1'
  }

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Element)) {
        closeAllSwitchers()
        return
      }

      if (target.closest('.language-switcher')) {
        return
      }

      closeAllSwitchers()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllSwitchers()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const redirectedPathName = (locale: string) => {
    if (!pathName) return `/${locale}`
    const segments = pathName.split('/')
    segments[1] = locale
    return segments.join('/')
  }

  const locales = i18n.locales.map((locale) => ({
    locale,
    code: locale.toUpperCase(),
    label: getLocaleLabel(locale),
  }))

  const activeLocale = locales.find(({ locale }) => locale === currentLocale) ?? locales[0]

  const handleLocaleClick = (event: MouseEvent<HTMLAnchorElement>, locale: string) => {
    closeAllSwitchers()

    if (locale === currentLocale) {
      event.preventDefault()
      return
    }

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    showGlobalPreloader()
  }

  return (
    <details className="language-switcher">
      <summary className="language-switcher__trigger" aria-label={activeLocale.label}>
        <span className="language-switcher__icon">
          <i className="fas fa-globe" aria-hidden="true"></i>
        </span>
        <span className="language-switcher__value">{activeLocale.label}</span>
        <span className="language-switcher__arrow" aria-hidden="true">
          <i className="fa fa-angle-down"></i>
        </span>
      </summary>
      <div className="language-switcher__menu">
        {locales.map(({ locale, code, label }) => {
          const isActive = locale === currentLocale

          return (
            <Link
              key={locale}
              href={redirectedPathName(locale)}
              className={`language-switcher__item ${isActive ? 'language-switcher__item--active' : ''}`}
              aria-label={dict('Switch to {language}', { language: label })}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => handleLocaleClick(event, locale)}
            >
              <span className="language-switcher__item-label">{label}</span>
              <span className="language-switcher__item-code">{code}</span>
            </Link>
          )
        })}
      </div>
    </details>
  )
}
