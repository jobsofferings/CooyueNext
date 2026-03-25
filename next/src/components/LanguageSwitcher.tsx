'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { i18n } from '@/i18n-config'
import { useLocale } from '@/hooks/useDictionary'

export default function LanguageSwitcher() {
  const pathName = usePathname()
  const currentLocale = useLocale()

  const redirectedPathName = (locale: string) => {
    if (!pathName) return `/${locale}`
    const segments = pathName.split('/')
    segments[1] = locale
    return segments.join('/')
  }

  const localeNames = {
    zh: '中文',
    en: 'English',
  }

  return (
    <div className="language-switcher">
      {i18n.locales.map((locale) => {
        const isActive = locale === currentLocale
        return (
          <Link
            key={locale}
            href={redirectedPathName(locale)}
            className={`language-switcher__item ${isActive ? 'language-switcher__item--active' : ''}`}
            aria-label={`Switch to ${localeNames[locale as keyof typeof localeNames]}`}
          >
            {localeNames[locale as keyof typeof localeNames]}
          </Link>
        )
      })}
    </div>
  )
}
