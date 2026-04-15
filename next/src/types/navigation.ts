export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

export const getNavigationConfig = (dict: (key: string) => string): NavItem[] => [
  {
    label: dict('Home'),
    href: '/',
  },
  {
    label: dict('About'),
    href: '/about',
  },
  // {
  //   label: dict('Pages'),
  //   href: '#',
  //   children: [
  //     { label: dict('Our Team'), href: '/team' },
  //     { label: dict('Team Details'), href: '/team/1' },
  //     { label: dict('Testimonials'), href: '/testimonials' },
  //     { label: dict('Careers'), href: '/careers' },
  //     { label: dict('FAQs'), href: '/faq' },
  //   ],
  // },
  {
    label: dict('News'),
    href: '/news',
    children: [
      { label: dict('News'), href: '/news' },
      { label: dict('News Details'), href: '/news/1' },
    ],
  },
  {
    label: dict('Contact'),
    href: '/contact',
  },
]
