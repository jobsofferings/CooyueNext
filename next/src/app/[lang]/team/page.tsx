import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { PageHeader } from '@/components/layout'
import { TeamCard } from '@/components/ui'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getTeamSeo, extractSeoMeta } from '@/lib/seo-api'

const getTeam = (dict: (key: string) => string) => [
  { name: dict('Kevin Martin'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-1.jpg', href: '/team/1' },
  { name: dict('Jessica Brown'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-2.jpg', href: '/team/2' },
  { name: dict('Mike Hardson'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-3.jpg', href: '/team/3' },
  { name: dict('Sarah Albert'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-4.jpg', href: '/team/4' },
  { name: dict('Christine Eve'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-5.jpg', href: '/team/5' },
  { name: dict('David Cooper'), role: dict('Consultant'), description: dict('There are many vartion of passages of available.'), image: '/assets/images/team/team-1-6.jpg', href: '/team/6' },
]

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(lang)

  // 尝试从数据库获取 SEO 数据
  const seoData = await getTeamSeo(lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(dict('Our Team')),
    description: dict('Meet our professional team'),
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    openGraph: seoMeta.ogImage ? {
      images: [seoMeta.ogImage],
    } : undefined,
    alternates: {
      canonical: `/${lang}/team`,
      languages: Object.fromEntries(
        i18n.locales.map((locale) => [locale, `/${locale}/team`])
      ),
    },
  }
}

export default async function TeamPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  const team = getTeam(dict)
  
  return (
    <>
      <PageHeader
        title={dict('Our Team')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('Our Team') }]}
      />

      <section className="team-page">
        <div className="container">
          <div className="row">
            {team.map((member, index) => (
              <div key={index} className="col-xl-4 col-lg-4">
                <TeamCard {...member} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
