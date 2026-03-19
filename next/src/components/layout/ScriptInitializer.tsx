'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function ScriptInitializer() {
  const pathname = usePathname()
  const initialized = useRef(false)

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
        if (jq('.curved-circle--item').circleType) {
          jq('.curved-circle--item').circleType()
        }
      }

      if ($('.search-toggler').length) {
        $('.search-toggler').off('click').on('click', (e: Event) => {
          e.preventDefault()
          $('.search-popup').addClass('active')
          $('.mobile-nav__wrapper').removeClass('expanded')
          document.body.classList.add('locked')
        })
      }

      const searchOverlay = document.querySelector('.search-popup__overlay')
      if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
          e.preventDefault()
          $('.search-popup').removeClass('active')
          document.body.classList.remove('locked')
        })
      }

      const mobileTogglers = document.querySelectorAll('.mobile-nav__toggler')
      mobileTogglers.forEach((toggler) => {
        toggler.addEventListener('click', (e) => {
          e.preventDefault()
          document.querySelector('.mobile-nav__wrapper')?.classList.toggle('expanded')
          document.body.classList.toggle('locked')
        })
      })

      const scrollTargets = document.querySelectorAll('.scroll-to-target')
      scrollTargets.forEach((target) => {
        target.removeEventListener('click', handleScrollToTarget)
        target.addEventListener('click', handleScrollToTarget)
      })

      function handleScrollToTarget(this: Element, e: Event) {
        e.preventDefault()
        const targetAttr = this.getAttribute('data-target')
        if (targetAttr === 'html' || targetAttr === 'body') {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
        } else if (targetAttr) {
          const targetEl = document.querySelector(targetAttr)
          if (targetEl) {
            window.scrollTo({
              top: (targetEl as HTMLElement).offsetTop,
              behavior: 'smooth'
            })
          }
        }
      }

      const handleScroll = () => {
        const stickyHeader = document.querySelector('.stricky-header')
        const scrollToTop = document.querySelector('.scroll-to-top')
        if (stickyHeader) {
          if (window.scrollY > 100) {
            stickyHeader.classList.add('stricky-fixed')
            scrollToTop?.classList.add('show')
          } else {
            stickyHeader.classList.remove('stricky-fixed')
            scrollToTop?.classList.remove('show')
          }
        }
      }

      window.removeEventListener('scroll', handleScroll)
      window.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    const initCustomCursor = () => {
      if (typeof window === 'undefined' || !document.querySelector('.custom-cursor')) {
        return
      }

      const cursor = document.querySelector('.custom-cursor__cursor') as HTMLElement
      const cursorinner = document.querySelector('.custom-cursor__cursor-two') as HTMLElement
      const anchors = document.querySelectorAll('a')

      if (!cursor || !cursorinner) return

      const handleMouseMove = (e: MouseEvent) => {
        cursor.style.transform = `translate3d(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%), 0)`
        cursorinner.style.left = e.clientX + 'px'
        cursorinner.style.top = e.clientY + 'px'
      }

      const handleMouseDown = () => {
        cursor.classList.add('click')
        cursorinner.classList.add('custom-cursor__innerhover')
      }

      const handleMouseUp = () => {
        cursor.classList.remove('click')
        cursorinner.classList.remove('custom-cursor__innerhover')
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mouseup', handleMouseUp)

      anchors.forEach(item => {
        item.addEventListener('mouseover', () => {
          cursor.classList.add('custom-cursor__hover')
        })
        item.addEventListener('mouseleave', () => {
          cursor.classList.remove('custom-cursor__hover')
        })
      })
    }

    const timer = setTimeout(() => {
      initPlugins()
      if (!initialized.current) {
        initCustomCursor()
        initialized.current = true
      }
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname])

  return null
}
