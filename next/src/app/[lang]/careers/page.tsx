import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { getDictionary } from '@/get-dictionary'
import { Locale } from '@/i18n-config'

const getJobs = (dict: (key: string) => string) => [
  { title: dict('Senior Business Analyst'), location: dict('New York'), type: dict('Full Time'), department: dict('Business') },
  { title: dict('Financial Consultant'), location: dict('Los Angeles'), type: dict('Full Time'), department: dict('Finance') },
  { title: dict('Marketing Manager'), location: dict('Chicago'), type: dict('Full Time'), department: dict('Marketing') },
  { title: dict('Investment Advisor'), location: dict('Houston'), type: dict('Part Time'), department: dict('Investment') },
  { title: dict('HR Specialist'), location: dict('Phoenix'), type: dict('Full Time'), department: dict('Human Resources') },
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
  const jobs = getJobs(dict)
  
  return (
    <>
      <PageHeader
        title={dict('Careers')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('Careers') }]}
      />

      <section className="careers-page">
        <div className="container">
          <SectionTitle
            tagline={dict('join our team')}
            title={dict('Current Job Openings')}
            highlight={dict('Openings')}
            align="center"
          />
          <div className="careers-page__table-box">
            <table className="careers-page__table">
              <thead>
                <tr>
                  <th>{dict('Job Title')}</th>
                  <th>{dict('Location')}</th>
                  <th>{dict('Job Type')}</th>
                  <th>{dict('Department')}</th>
                  <th>{dict('Action')}</th>
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
                      <Link href={`/${lang}/contact`} className="thm-btn careers-page__btn">
                        {dict('Apply Now')}
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
                  tagline={dict('why join us')}
                  title={dict('Benefits of Working With Us')}
                  highlight={dict('Us')}
                />
                <p className="why-join-us__text">
                  {dict('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.')}
                </p>
                <ul className="why-join-us__list list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Competitive salary and benefits')}</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Flexible working hours')}</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Professional development opportunities')}</p>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="fa fa-check"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Health insurance coverage')}</p>
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
