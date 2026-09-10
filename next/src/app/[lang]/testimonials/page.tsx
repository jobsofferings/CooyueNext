import { permanentRedirect } from 'next/navigation'
import type { Locale } from '@/i18n-config'

export default function TestimonialsPage({ params: { lang } }: { params: { lang: Locale } }) {
  permanentRedirect(`/${lang}/about`)
}
