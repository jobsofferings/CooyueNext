'use client'

import { useEffect } from 'react'

const stylesheets = {
  home: [
    '/assets/vendors/animate/animate.min.css',
    '/assets/vendors/animate/custom-animate.css',
    '/assets/vendors/owl-carousel/owl.carousel.min.css',
    '/assets/vendors/owl-carousel/owl.theme.default.min.css',
    '/assets/vendors/jquery-magnific-popup/jquery.magnific-popup.css',
  ],
  about: ['/assets/vendors/jarallax/jarallax.css'],
}

export default function PagePlugins({ page }: { page: keyof typeof stylesheets }) {
  useEffect(() => {
    const controller = new AbortController()
    let dispose: (() => void) | undefined
    async function initialize() {
      const plugins = page === 'home' ? await import('@/lib/plugins/home') : await import('@/lib/plugins/about')
      if (controller.signal.aborted) return
      dispose = await plugins.initialize(controller.signal)
      if (controller.signal.aborted) dispose?.()
    }
    initialize().catch((error) => {
      if (!controller.signal.aborted) console.warn(`[Page plugins] ${page} enhancement unavailable.`, error)
    })
    return () => { controller.abort(); dispose?.() }
  }, [page])

  return <>{stylesheets[page].map((href) => <link key={href} rel="stylesheet" href={href} />)}</>
}
