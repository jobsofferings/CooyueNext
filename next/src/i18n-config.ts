export const i18n = {
  defaultLocale: 'en', // 默认为英文
  locales: ['zh', 'en', 'ja'], // 支持中文、英文、日文
} as const

export type Locale = (typeof i18n)['locales'][number]