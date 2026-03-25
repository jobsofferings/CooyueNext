export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

export const navigationConfig: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    children: [
      { label: 'Home One', href: '/' },
      { label: 'Home Two', href: '/home-2' },
      { label: 'Home Three', href: '/home-3' },
    ],
  },
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'Pages',
    href: '#',
    children: [
      { label: 'Our Team', href: '/team' },
      { label: 'Team Details', href: '/team/1' },
      { label: 'Testimonials', href: '/testimonials' },
      { label: 'Careers', href: '/careers' },
      { label: 'Faqs', href: '/faq' },
    ],
  },
  {
    label: 'News',
    href: '/news',
    children: [
      { label: 'News', href: '/news' },
      { label: 'News Details', href: '/news/1' },
    ],
  },
  {
    label: 'Contact',
    href: '/contact',
  },
]
