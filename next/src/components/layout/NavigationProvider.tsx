'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useDictionary } from '@/hooks/useDictionary'

interface CategoryItem { slug: string; name: string }
interface NavItem { label: string; href: string; children?: NavItem[] }
interface NavigationState {
  navItems: NavItem[]
  mobileOpen: boolean
  searchOpen: boolean
  setMobileOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
}

const NavigationContext = createContext<NavigationState | null>(null)

export function NavigationProvider({ categories, children }: { categories: CategoryItem[]; children: ReactNode }) {
  const dict = useDictionary()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navItems = useMemo(() => [
    { label: dict('Home'), href: '/' },
    { label: dict('Products'), href: '/products', children: categories.map((category) => ({ label: category.name, href: `/products#${category.slug}` })) },
    { label: dict('News'), href: '/news', children: [{ label: dict('News'), href: '/news' }, { label: dict('News Details'), href: '/news/1' }] },
    { label: dict('About'), href: '/about' },
    { label: dict('Contact'), href: '/contact' },
  ], [categories, dict])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.classList.toggle('locked', mobileOpen || searchOpen)
    return () => document.body.classList.remove('locked')
  }, [mobileOpen, searchOpen])

  return <NavigationContext.Provider value={{ navItems, mobileOpen, searchOpen, setMobileOpen, setSearchOpen }}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('NavigationProvider is required')
  return navigation
}
