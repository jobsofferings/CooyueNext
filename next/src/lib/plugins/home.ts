import { loadScript } from './load-script'

interface PluginElement {
  data: (name: string) => unknown
  owlCarousel: (options: Record<string, unknown>) => void
  trigger: (name: string) => void
  magnificPopup: (options: Record<string, unknown>) => void
  circleType: () => void
  off: (namespace: string) => void
  removeData: (name: string) => void
  validate: (options: Record<string, unknown>) => { destroy: () => void }
}

interface LegacyJQuery {
  (element: Element): PluginElement
  magnificPopup: { close: () => void }
  post: (url: string, data: string) => void
}

export async function initialize(signal: AbortSignal) {
  const cleanups: Array<() => void> = []
  const dispose = () => cleanups.splice(0).reverse().forEach((cleanup) => cleanup())
  signal.addEventListener('abort', dispose, { once: true })
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const element = entry.target as HTMLElement
      if (element.matches('.wow') && !reducedMotion) {
        element.style.animationDelay = element.dataset.wowDelay || '0ms'
        element.style.animationDuration = element.dataset.wowDuration || '1s'
        element.classList.add('animated')
      }
      if (element.dataset.percent) { element.style.width = element.dataset.percent; element.classList.add('counted') }
      if (element.dataset.stop) element.textContent = element.dataset.stop
      observer.unobserve(element)
    })
  })
  document.querySelectorAll('.wow, .count-bar[data-percent], .count-text[data-stop]').forEach((element) => observer.observe(element))
  cleanups.push(() => observer.disconnect())

  try {
    await loadScript('/assets/vendors/jquery/jquery-3.6.4.min.js')
    if (signal.aborted) return dispose
    const jquery = (window as unknown as { jQuery: LegacyJQuery }).jQuery
    await Promise.all([
      loadScript('/assets/vendors/owl-carousel/owl.carousel.min.js'),
      loadScript('/assets/vendors/jquery-magnific-popup/jquery.magnific-popup.min.js'),
      loadScript('/assets/vendors/circleType/jquery.lettering.min.js'),
      loadScript('/assets/vendors/jquery-validate/jquery.validate.min.js'),
    ])
    if (signal.aborted) return dispose
    document.querySelectorAll('.thm-owl__carousel').forEach((element) => {
      const carousel = jquery(element)
      const options = (carousel.data('owl-options') || {}) as Record<string, unknown>
      carousel.owlCarousel({ ...options, autoplay: reducedMotion ? false : options.autoplay, animateIn: reducedMotion ? false : options.animateIn, animateOut: reducedMotion ? false : options.animateOut })
      cleanups.push(() => carousel.trigger('destroy.owl.carousel'))
    })
    document.querySelectorAll('.video-popup').forEach((element) => {
      const popup = jquery(element)
      popup.magnificPopup({ type: 'iframe', mainClass: 'mfp-fade', removalDelay: 160, fixedContentPos: false })
      cleanups.push(() => { jquery.magnificPopup.close(); popup.off('.magnificPopup'); popup.removeData('magnificPopup') })
    })
    document.querySelectorAll<HTMLFormElement>('.contact-form-validated').forEach((form) => {
      const validator = jquery(form).validate({
        rules: { name: { required: true }, email: { required: true, email: true }, message: { required: true }, subject: { required: true } },
        submitHandler: (element: HTMLFormElement) => {
          const data = new URLSearchParams()
          new FormData(element).forEach((value, name) => { if (typeof value === 'string') data.append(name, value) })
          jquery.post(element.action, data.toString())
          return false
        },
      })
      cleanups.push(() => validator.destroy())
    })
    await loadScript('/assets/vendors/circleType/jquery.circleType.js')
    if (signal.aborted) return dispose
    const curveText = () => {
      if (signal.aborted) return
      document.querySelectorAll<HTMLElement>('.curved-circle--item').forEach((element) => {
        const original = element.textContent
        jquery(element).circleType()
        cleanups.push(() => { element.textContent = original; element.removeAttribute('style') })
      })
    }
    if (document.readyState === 'complete') curveText()
    else {
      window.addEventListener('load', curveText, { once: true })
      cleanups.push(() => window.removeEventListener('load', curveText))
    }
    return dispose
  } catch (error) {
    dispose()
    throw error
  }
}
