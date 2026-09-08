import { loadScript } from './load-script'

export async function initialize(signal: AbortSignal) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  await loadScript('/assets/vendors/jarallax/jarallax.min.js')
  if (signal.aborted) return () => {}
  const elements = Array.from(document.querySelectorAll<HTMLElement>('.expectation-one__bg.jarallax'))
  const { jarallax } = window as unknown as { jarallax: (elements: HTMLElement[], options: { speed: number } | 'destroy') => void }
  jarallax(elements, { speed: 0.2 })
  return () => jarallax(elements, 'destroy')
}
