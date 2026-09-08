'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Locale } from '@/i18n-config'
import { experienceCopy, productModules } from './pv400-data'
import type { ModuleId } from './pv400-data'
import type { Pv400SceneController, SceneState } from './pv400-scene'
import styles from './pv400.module.css'

interface Pv400ExperienceProps {
  locale: Locale
  image: string
}

export default function Pv400Experience({ locale, image }: Pv400ExperienceProps) {
  const copy = experienceCopy[locale]
  const modules = productModules[locale]
  const [selected, setSelected] = useState<ModuleId>('optics')
  const [explosion, setExplosion] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [retry, setRetry] = useState(0)
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<Pv400SceneController | null>(null)
  const hotspotRefs = useRef<Partial<Record<ModuleId, HTMLButtonElement | null>>>({})
  const stateRef = useRef<SceneState>({ selected, explosion, autoPlay, mode: 'thermal', reducedMotion })
  const activeModule = modules.find(module => module.id === selected) || modules[0]

  function selectModule(moduleId: ModuleId) {
    setSelected(moduleId)
    setAutoPlay(false)
    if (moduleId === 'detector') setExplosion(current => Math.max(current, 80))
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
    stateRef.current = { selected, explosion, autoPlay, mode: 'thermal', reducedMotion }
    controllerRef.current?.update(stateRef.current)
  }, [selected, explosion, autoPlay, reducedMotion])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let starting = false
    let controller: Pv400SceneController | null = null
    setStatus('loading')
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || starting) return
      starting = true
      observer.disconnect()
      import('./pv400-scene').then(({ createPv400Scene }) => {
        if (cancelled) return
        controller = createPv400Scene(host, stateRef.current, {
          onSelect: moduleId => {
            setSelected(moduleId)
            setAutoPlay(false)
            if (moduleId === 'detector') setExplosion(current => Math.max(current, 80))
          },
          onInteraction: () => setAutoPlay(false),
          onExplosion: amount => setExplosion(amount),
          onProject: (moduleId, left, top, visible) => {
            const button = hotspotRefs.current[moduleId]
            if (!button) return
            button.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`
            button.style.visibility = visible ? 'visible' : 'hidden'
          },
          onError: () => { if (!cancelled) setStatus('unavailable') },
        })
        controllerRef.current = controller
        setStatus('ready')
      }).catch(() => {
        if (!cancelled) {
          host.replaceChildren()
          setStatus('unavailable')
        }
      })
    }, { rootMargin: '250px' })
    observer.observe(host)
    return () => {
      cancelled = true
      observer.disconnect()
      controller?.destroy()
      controllerRef.current = null
    }
  }, [retry])

  function changeView(amount: number) {
    setExplosion(amount)
    setAutoPlay(false)
  }

  function handleModelKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || status !== 'ready') return
    const controller = controllerRef.current
    if (!controller) return
    const actions: Record<string, () => void> = {
      ArrowLeft: () => controller.rotate(0.15, 0),
      ArrowRight: () => controller.rotate(-0.15, 0),
      ArrowUp: () => controller.rotate(0, -0.12),
      ArrowDown: () => controller.rotate(0, 0.12),
      '+': () => controller.zoom(1),
      '=': () => controller.zoom(1),
      '-': () => controller.zoom(-1),
      '0': () => controller.reset(),
    }
    if (actions[event.key]) {
      event.preventDefault()
      setAutoPlay(false)
      actions[event.key]()
    }
  }

  return (
    <section className={styles.experience} data-pv400-experience aria-labelledby="pv400-model-title">
      <div className="container">
        <div className={styles.heading}>
          <div>
            <h2 id="pv400-model-title">{copy.embeddedTitle}</h2>
            <p>{copy.embeddedIntro}</p>
          </div>
          <span className={styles.badge}>PV400 / 3D</span>
        </div>

        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.viewToggle} role="group" aria-label={copy.viewLabel}>
              <button type="button" aria-pressed={!autoPlay && explosion === 0} onClick={() => changeView(0)}>{copy.assembled}</button>
              <button type="button" aria-pressed={!autoPlay && explosion > 0} onClick={() => changeView(100)}>{copy.exploded}</button>
            </div>
            <div className={styles.playControls}>
              <button type="button" className={styles.playButton} aria-pressed={autoPlay} disabled={status !== 'ready' || reducedMotion} onClick={() => setAutoPlay(current => !current)}>
                <span aria-hidden="true" className={`fa ${autoPlay ? 'fa-pause' : 'fa-play'}`} />
                {autoPlay ? copy.pauseDemo : copy.playDemo}
              </button>
              <button type="button" title={copy.reset} aria-label={copy.reset} disabled={status !== 'ready'} onClick={() => { setAutoPlay(false); controllerRef.current?.reset() }}><span className="fa fa-undo" aria-hidden="true" /></button>
            </div>
          </div>

          <div className={styles.viewer} data-scene-status={status}>
            <div className={styles.wordmark} aria-hidden="true">PV400</div>
            <div ref={hostRef} className={styles.canvasHost} tabIndex={status === 'ready' ? 0 : -1} role="group" aria-label={copy.modelLabel} onKeyDown={handleModelKey} />
            {status === 'ready' && (
              <div className={styles.hotspots}>
                {modules.map(module => (
                  <button key={module.id} type="button" ref={element => { hotspotRefs.current[module.id] = element }} className={styles.hotspot} aria-label={`${module.number} ${module.label}`} aria-pressed={selected === module.id} title={module.label} onClick={() => selectModule(module.id)}>
                    <span>{module.number}</span>
                  </button>
                ))}
              </div>
            )}
            {status !== 'ready' && (
              <div className={styles.fallback} role="status">
                <Image src={image} alt={copy.referenceImage} width={521} height={521} unoptimized />
                <p>{status === 'loading' ? copy.loading : copy.fallback}</p>
                {status === 'unavailable' && <button type="button" onClick={() => setRetry(current => current + 1)}>{copy.retry}</button>}
              </div>
            )}
            <div className={styles.viewerFooter}>
              <span>{copy.gestureHint}</span>
              <div className={styles.zoomControls}>
                <button type="button" title={copy.zoomOut} aria-label={copy.zoomOut} disabled={status !== 'ready'} onClick={() => { setAutoPlay(false); controllerRef.current?.zoom(-1) }}>−</button>
                <button type="button" title={copy.zoomIn} aria-label={copy.zoomIn} disabled={status !== 'ready'} onClick={() => { setAutoPlay(false); controllerRef.current?.zoom(1) }}>+</button>
              </div>
            </div>
          </div>

          <div className={styles.explodeControl}>
            <label htmlFor="pv400-explosion">{copy.explodeLabel}</label>
            <input id="pv400-explosion" type="range" min="0" max="100" step="1" value={explosion} onPointerDown={() => setAutoPlay(false)} onKeyDown={() => setAutoPlay(false)} onChange={event => changeView(Number(event.target.value))} aria-valuetext={`${explosion}%`} />
            <output htmlFor="pv400-explosion">{explosion}%</output>
          </div>

          <nav className={styles.moduleNav} aria-label={copy.moduleLabel}>
            {modules.map(module => (
              <button type="button" key={module.id} aria-pressed={selected === module.id} onClick={() => selectModule(module.id)}><span>{module.number}</span>{module.label}</button>
            ))}
          </nav>
          <div className={styles.moduleDescription} aria-live="polite" aria-atomic="true">
            <h3>{activeModule.label}</h3>
            <p>{activeModule.description}</p>
          </div>
        </div>
        <p className={styles.modelNote}>{copy.modelNote} {copy.screenNote}</p>
      </div>
    </section>
  )
}
