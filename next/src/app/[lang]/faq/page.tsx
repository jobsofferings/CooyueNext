'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout'
import { SectionTitle } from '@/components/ui'
import { useDictionary } from '@/hooks/useDictionary'

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const dict = useDictionary()
  
  const faqs = [
    {
      question: dict('How can I get started with your consulting services?'),
      answer: dict('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'),
    },
    {
      question: dict('What industries do you specialize in?'),
      answer: dict('We specialize in various industries including finance, healthcare, technology, manufacturing, and retail. Our team of experts has extensive experience across multiple sectors.'),
    },
    {
      question: dict('How long does a typical consulting engagement last?'),
      answer: dict('The duration of our consulting engagements varies depending on the scope and complexity of the project. Most projects range from 3 months to 1 year.'),
    },
    {
      question: dict('What is your pricing model?'),
      answer: dict('We offer flexible pricing models including hourly rates, project-based fees, and retainer agreements. We work with you to find the best arrangement for your needs and budget.'),
    },
    {
      question: dict('Do you offer remote consulting services?'),
      answer: dict('Yes, we offer both on-site and remote consulting services. Our team is equipped to work effectively with clients regardless of location.'),
    },
    {
      question: dict('How do you ensure confidentiality?'),
      answer: dict('We take confidentiality very seriously. All our consultants sign strict NDAs, and we have robust data security measures in place to protect your sensitive information.'),
    },
  ]

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <>
      <PageHeader
        title={dict('FAQs')}
        breadcrumbs={[{ label: dict('Home'), href: '/' }, { label: dict('FAQs') }]}
      />

      <section className="faq-page">
        <div className="container">
          <SectionTitle
            tagline={dict('frequently asked questions')}
            title={dict('Have Any Questions?')}
            highlight={dict('Questions')}
            align="center"
          />
          <div className="faq-page__inner">
            <div className="accrodion-grp" data-grp-name="faq-one-accrodion">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`accrodion ${openIndex === index ? 'active' : ''}`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="accrodion-title">
                    <h4>
                      {faq.question}
                      <span className={`accrodion-icon ${openIndex === index ? 'active' : ''}`}></span>
                    </h4>
                  </div>
                  {openIndex === index && (
                    <div className="accrodion-content">
                      <div className="inner">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
