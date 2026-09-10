import { permanentRedirect } from 'next/navigation'
import type { Locale } from '@/i18n-config'

export default function TeamPage({ params: { lang } }: { params: { lang: Locale } }) {
  permanentRedirect(`/${lang}/about`)
}
