import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { SectionTitle, TeamCard } from '@/components/ui'

const team = [
  { name: 'Kevin Martin', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-1.jpg', href: '/team/1' },
  { name: 'Jessica Brown', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-2.jpg', href: '/team/2' },
  { name: 'Mike Hardson', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-3.jpg', href: '/team/3' },
  { name: 'Sarah Albert', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-4.jpg', href: '/team/4' },
  { name: 'Christine Eve', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-5.jpg', href: '/team/5' },
  { name: 'David Cooper', role: 'Consultant', description: 'There are many vartion of passages of available.', image: '/assets/images/team/team-1-6.jpg', href: '/team/6' },
]

export const metadata: Metadata = {
  title: 'Our Team - Sinace',
  description: 'Meet our professional team',
}

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Our Team"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Our Team' }]}
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
