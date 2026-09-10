import { permanentRedirect } from 'next/navigation'
import type { Locale } from '@/i18n-config'

export default function TeamDetailPage({ params: { lang } }: { params: { lang: Locale; id: string } }) {
  permanentRedirect(`/${lang}/about`)
}
