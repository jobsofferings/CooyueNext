'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Locale } from '@/i18n-config'
import { experienceCopy, posterUrl, productModules } from './imaging-kit-data'
import type { ModuleId } from './imaging-kit-data'
import type { ImagingKitSceneController, SceneState } from './imaging-kit-scene'
import styles from '../pv400/pv400.module.css'
import kitStyles from './imaging-kit.module.css'

export default function ImagingKitExperience({ locale }: { locale: Locale }) {
  const copy = experienceCopy[locale]
  const modules = productModules[locale]
  const [selected, setSelected] = useState<ModuleId>('lens')
  const [explosion, setExplosion] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [retry, setRetry] = useState(0)
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<ImagingKitSceneController | null>(null)
  const hotspotRefs = useRef<Partial<Record<ModuleId, HTMLButtonElement | null>>>({})
  const stateRef = useRef<SceneState>({ selected, explosion, autoPlay, reducedMotion })
  const activeModule = modules.find(module => module.id === selected) || modules[0]

  function selectModule(moduleId: ModuleId) {
    setSelected(moduleId)
    setAutoPlay(false)
    if (moduleId !== 'lens') setExplosion(current => Math.max(current, 85))
  }

  function changeView(amount: number) {
    setExplosion(amount)
    setAutoPlay(false)
  }

  function resetView() {
    setExplosion(0)
    controllerRef.current?.reset()
    setAutoPlay(!stateRef.current.reducedMotion)
  }

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => {
      setReducedMotion(preference.matches)
      if (preference.matches) setAutoPlay(false)
    }
    updatePreference()
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    stateRef.current = { selected, explosion, autoPlay, reducedMotion }
    controllerRef.current?.update(stateRef.current)
  }, [selected, explosion, autoPlay, reducedMotion])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const abortController = new AbortController()
    let starting = false
    let controller: ImagingKitSceneController | null = null
    setStatus('loading')
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || starting) return
      starting = true
      observer.disconnect()
      import('./imaging-kit-scene').then(async ({ createImagingKitScene }) => {
        if (abortController.signal.aborted) return
        controller = await createImagingKitScene(host, stateRef.current, {
          onSelect: selectModule,
          onInteraction: () => setAutoPlay(false),
          onExplosion: setExplosion,
          onProject: (moduleId, left, top, visible) => {
            const button = hotspotRefs.current[moduleId]
            if (!button) return
            button.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`
            button.style.visibility = visible ? 'visible' : 'hidden'
          },
          onError: () => { if (!abortController.signal.aborted) setStatus('unavailable') },
        }, abortController.signal)
        if (abortController.signal.aborted) { controller.destroy(); return }
        controllerRef.current = controller
        controller.update(stateRef.current)
        setAutoPlay(!stateRef.current.reducedMotion)
        setStatus('ready')
      }).catch(() => {
        if (!abortController.signal.aborted) {
          host.replaceChildren()
          setStatus('unavailable')
        }
      })
    }, { rootMargin: '250px' })
    observer.observe(host)
    return () => {
      abortController.abort()
      observer.disconnect()
      controller?.destroy()
      controllerRef.current = null
    }
  }, [retry])

  function handleModelKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || status !== 'ready') return
    const controller = controllerRef.current
    if (!controller) return
    const actions: Record<string, () => void> = {
      ArrowLeft: () => controller.rotate(0.15, 0), ArrowRight: () => controller.rotate(-0.15, 0),
      ArrowUp: () => controller.rotate(0, -0.12), ArrowDown: () => controller.rotate(0, 0.12),
      '+': () => controller.zoom(1), '=': () => controller.zoom(1), '-': () => controller.zoom(-1), '0': resetView,
    }
    if (!actions[event.key]) return
    event.preventDefault()
    setAutoPlay(false)
    actions[event.key]()
  }

  return (
    <section className={`${styles.experience} ${kitStyles.experience}`} data-imaging-kit-experience aria-labelledby="imaging-kit-model-title">
      <div className="container">
        <div className={styles.heading}>
          <div><h2 id="imaging-kit-model-title">{copy.title}</h2><p>{copy.intro}</p></div>
          <span className={styles.badge}>CAD / 3D</span>
        </div>
        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.viewToggle} role="group" aria-label={copy.viewLabel}>
              <button type="button" aria-pressed={!autoPlay && explosion === 0} onClick={() => changeView(0)}>{copy.assembled}</button>
              <button type="button" aria-pressed={!autoPlay && explosion > 0} onClick={() => changeView(100)}>{copy.exploded}</button>
            </div>
            <div className={styles.playControls}>
              <button type="button" className={styles.playButton} aria-pressed={autoPlay} disabled={status !== 'ready' || reducedMotion} onClick={() => setAutoPlay(current => !current)}><span aria-hidden="true" className={`fa ${autoPlay ? 'fa-pause' : 'fa-play'}`} />{autoPlay ? copy.pause : copy.play}</button>
              <button type="button" title={copy.reset} aria-label={copy.reset} disabled={status !== 'ready'} onClick={resetView}><span className="fa fa-undo" aria-hidden="true" /></button>
            </div>
          </div>
          <div className={`${styles.viewer} ${kitStyles.viewer}`} data-scene-status={status}>
            <div className={kitStyles.viewerLabel} aria-hidden="true">OPEN-FRAME / IMAGING SYSTEM</div>
            <div ref={hostRef} className={styles.canvasHost} tabIndex={status === 'ready' ? 0 : -1} role="group" aria-label={copy.modelLabel} onKeyDown={handleModelKey} />
            {status === 'ready' && <div className={styles.hotspots}>{modules.map(module => (
              <button key={module.id} type="button" ref={element => { hotspotRefs.current[module.id] = element }} className={styles.hotspot} aria-label={`${module.number} ${module.label}`} aria-pressed={selected === module.id} title={module.label} onClick={() => selectModule(module.id)}><span>{module.number}</span></button>
            ))}</div>}
            {status !== 'ready' && <div className={styles.fallback} role="status">
              <Image src={posterUrl} alt={copy.poster} width={1200} height={900} unoptimized />
              <p>{status === 'loading' ? copy.loading : copy.fallback}</p>
              {status === 'unavailable' && <button type="button" onClick={() => setRetry(current => current + 1)}>{copy.retry}</button>}
            </div>}
            <div className={styles.viewerFooter}>
              <span>{copy.gesture}</span>
              <div className={styles.zoomControls}>
                <button type="button" title={copy.zoomOut} aria-label={copy.zoomOut} disabled={status !== 'ready'} onClick={() => { setAutoPlay(false); controllerRef.current?.zoom(-1) }}>−</button>
                <button type="button" title={copy.zoomIn} aria-label={copy.zoomIn} disabled={status !== 'ready'} onClick={() => { setAutoPlay(false); controllerRef.current?.zoom(1) }}>+</button>
              </div>
            </div>
          </div>
          <div className={styles.explodeControl}>
            <label htmlFor="imaging-kit-explosion">{copy.separation}</label>
            <input id="imaging-kit-explosion" type="range" min="0" max="100" step="1" value={explosion} onPointerDown={() => setAutoPlay(false)} onKeyDown={() => setAutoPlay(false)} onChange={event => changeView(Number(event.target.value))} aria-valuetext={`${explosion}%`} />
            <output htmlFor="imaging-kit-explosion">{explosion}%</output>
          </div>
          <nav className={`${styles.moduleNav} ${kitStyles.moduleNav}`} aria-label={copy.modules}>
            {modules.map(module => <button type="button" key={module.id} aria-pressed={selected === module.id} onClick={() => selectModule(module.id)}><span>{module.number}</span>{module.label}</button>)}
          </nav>
          <div className={styles.moduleDescription} aria-live="polite" aria-atomic="true"><h3>{activeModule.label}</h3><p>{activeModule.description}</p></div>
          <div className={kitStyles.signalChain}>
            <h3>{copy.chainTitle}</h3>
            <ol>{copy.chain.map((label, index) => <li key={label}>{index > 0 && <span aria-hidden="true">→</span>}{label}</li>)}</ol>
          </div>
        </div>
        <div className={kitStyles.integration}><h3>{copy.integrationTitle}</h3><p>{copy.integration}</p></div>
        <p className={styles.modelNote}>{copy.note}</p>
      </div>
    </section>
  )
}
