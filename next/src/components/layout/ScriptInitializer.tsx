'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScriptInitializer() {
  const pathname = usePathname()

  useEffect(() => {
    const initPlugins = () => {
      const win = window as unknown as {
        $?: (selector: string) => {
          length: number
          each: (fn: (index: number, el: Element) => void) => void
          data: (key: string) => unknown
          hasClass: (className: string) => boolean
          addClass: (className: string) => void
          removeClass: (className: string) => void
          toggleClass: (className: string) => void
          fadeOut: (duration: number) => void
          slideToggle: () => void
          off: (event: string) => { on: (event: string, handler: (e: Event) => void) => void }
          on: (event: string, handler: (e: Event) => void) => void
          owlCarousel?: (options: unknown) => void
        }
        WOW?: new () => { init: () => void }
      }

      if (typeof window === 'undefined' || !win.$) {
        setTimeout(initPlugins, 100)
        return
      }

      const $ = win.$

      if ($('.main-menu__list').length && $('.mobile-nav__container').length) {
        const navContent = document.querySelector('.main-menu__list')?.outerHTML
        const mobileNavContainer = document.querySelector('.mobile-nav__container')
        if (navContent && mobileNavContainer && !mobileNavContainer.innerHTML.trim()) {
          mobileNavContainer.innerHTML = navContent
        }
      }

      if ($('.sticky-header__content').length) {
        const stickyContent = document.querySelector('.sticky-header__content')
        const mainMenuContent = document.querySelector('.main-menu')?.innerHTML
        if (mainMenuContent && stickyContent && !stickyContent.innerHTML.trim()) {
          stickyContent.innerHTML = mainMenuContent
        }
      }

      const dropdownAnchors = document.querySelectorAll('.mobile-nav__container .main-menu__list .dropdown > a')
      dropdownAnchors.forEach((anchor) => {
        if (!anchor.nextElementSibling?.matches('button')) {
          const toggleBtn = document.createElement('BUTTON')
          toggleBtn.setAttribute('aria-label', 'dropdown toggler')
          toggleBtn.innerHTML = '<i class="fa fa-angle-down"></i>'
          anchor.after(toggleBtn)
          toggleBtn.addEventListener('click', (e) => {
            e.preventDefault()
            anchor.parentElement?.classList.toggle('expanded')
            const ul = anchor.parentElement?.querySelector('ul')
            if (ul) {
              ul.style.display = ul.style.display === 'none' ? 'block' : 'none'
            }
          })
        }
      })

      if ($('.thm-owl__carousel').length) {
        $('.thm-owl__carousel').each((_index: number, el: Element) => {
          const elm = $(el as unknown as string)
          const options = elm.data('owl-options')
          if (!elm.hasClass('owl-loaded') && elm.owlCarousel) {
            elm.owlCarousel(options)
          }
        })
      }

      if (win.WOW) {
        new win.WOW().init()
      }

      if ($('.preloader').length) {
        setTimeout(() => {
          $('.preloader').fadeOut(500)
        }, 500)
      }

      const curvedItems = document.querySelectorAll('.curved-circle--item')
      if (curvedItems.length > 0) {
        const jq = win.$ as unknown as {
          (selector: string): { circleType?: () => void }
        }
        const circleEl = jq('.curved-circle--item')
        if (circleEl.circleType) {
          circleEl.circleType()
        }
      }

      const mobileTogglers = document.querySelectorAll('.mobile-nav__toggler')
      mobileTogglers.forEach((toggler) => {
        toggler.addEventListener('click', (e) => {
          e.preventDefault()
          document.querySelector('.mobile-nav__wrapper')?.classList.toggle('expanded')
          document.body.classList.toggle('locked')
        })
      })

      const handleScroll = () => {
        const stickyHeader = document.querySelector('.stricky-header')
        if (stickyHeader) {
          if (window.scrollY > 100) {
            stickyHeader.classList.add('stricky-fixed')
          } else {
            stickyHeader.classList.remove('stricky-fixed')
          }
        }
      }

      window.removeEventListener('scroll', handleScroll)
      window.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    const timer = setTimeout(() => {
      initPlugins()
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname])

  return null
}
