import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { getDictionary } from '@/get-dictionary'
import { Locale } from '@/i18n-config'

const jobs = [
  { title: 'Senior Business Analyst', location: 'New York', type: 'Full Time', department: 'Business' },
  { title: 'Financial Consultant', location: 'Los Angeles', type: 'Full Time', department: 'Finance' },
  { title: 'Marketing Manager', location: 'Chicago', type: 'Full Time', department: 'Marketing' },
  { title: 'Investment Advisor', location: 'Houston', type: 'Part Time', department: 'Investment' },
  { title: 'HR Specialist', location: 'Phoenix', type: 'Full Time', department: 'Human Resources' },
]

export const metadata: Metadata = {
  title: siteConfig.seo.titleTemplate('Careers'),
  description: 'Join our team',
}

export default async function CareersPage({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  
  return (
    <>
      <PageHeader
        title="Careers"
        breadcrumbs={[{ label: dict('home'), href: '/' }, { label: 'Careers' }]}
      />

      <section className="careers-page">
        <div className="container">
          <SectionTitle
            tagline="join our team"
            title="Current Job Openings"
            highlight="Openings"
            align="center"
          />
          <div className="careers-page__table-box">
            <table className="careers-page__table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Location</th>
                  <th>Job Type</th>
                  <th>Department</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, index) => (
                  <tr key={index}>
                    <td>{job.title}</td>
                    <td>{job.location}</td>
                    <td>{job.type}</td>
                    <td>{job.department}</td>
                    <td>
                      <Link href="/contact" className="thm-btn careers-page__btn">
                        Apply Now
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="why-join-us">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              <div className="why-join-us__left">
                <SectionTitle
                  tagline="why join us"
                  title="Benefits of Working With Us"
                  highlight="Us"
                />
                <p className="why-join-us__text">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua.
                </p>
                <ul className="why-join-us__list list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Competitive salary and benefits</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Flexible working hours</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Professional development opportunities</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>Health insurance coverage</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="why-join-us__right">
                <div className="why-join-us__img">
                  <img src="/assets/images/resources/why-join-us-img.jpg" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
