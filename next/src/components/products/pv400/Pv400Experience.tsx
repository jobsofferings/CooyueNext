'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Locale } from '@/i18n-config'
import { experienceCopy, productModules } from './pv400-data'
import type { ImagingMode, ModuleId } from './pv400-data'
import type { Pv400SceneController, SceneState } from './pv400-scene'
import { drawThermalFrame } from './pv400-thermal'
import styles from './pv400.module.css'

type IconName = 'arrow' | 'back' | 'rotate' | 'pause' | 'reset' | 'plus' | 'minus' | 'expand' | 'cube' | 'layers' | 'crosshair' | 'external'

function Icon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    back: <path d="M20 12H5m6-6-6 6 6 6" />,
    rotate: <><path d="M20 8a8 8 0 1 0 .3 7M20 3v5h-5" /><path d="m10 8 5 4-5 4Z" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    reset: <><path d="M4 10a8 8 0 1 1 .6 6M4 4v6h6" /></>,
    plus: <path d="M5 12h14M12 5v14" />,
    minus: <path d="M5 12h14" />,
    expand: <path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" />,
    cube: <><path d="m12 3 9 5v9l-9 5-9-5V8Zm0 10v9M3 8l9 5 9-5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
    crosshair: <><circle cx="12" cy="12" r="6" /><path d="M12 2v5m0 10v5M2 12h5m10 0h5" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" /></>,
  }
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function ThermalPreview({ mode, reducedMotion, label }: { mode: ImagingMode; reducedMotion: boolean; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let animationId = 0
    let lastFrame = 0
    let elapsed = 0
    let visible = true
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false })
    observer.observe(canvas)
    drawThermalFrame(context, mode, 0)
    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate)
      if (!visible || document.hidden || time - lastFrame < 1000 / 12) return
      elapsed += Math.min((time - lastFrame) / 1000, 0.12)
      lastFrame = time
      drawThermalFrame(context, mode, elapsed)
    }
    if (!reducedMotion) animationId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animationId)
      observer.disconnect()
    }
  }, [mode, reducedMotion])

  return <canvas ref={canvasRef} width="800" height="480" className={styles.thermalCanvas} role="img" aria-label={label} />
}

interface Pv400ExperienceProps {
  locale: Locale
  image: string
}

export default function Pv400Experience({ locale, image }: Pv400ExperienceProps) {
  const copy = experienceCopy[locale]
  const modules = productModules[locale]
  const [selected, setSelected] = useState<ModuleId>('optics')
  const [explosion, setExplosion] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [mode, setMode] = useState<ImagingMode>('thermal')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [retry, setRetry] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<Pv400SceneController | null>(null)
  const hotspotRefs = useRef<Partial<Record<ModuleId, HTMLButtonElement | null>>>({})
  const stateRef = useRef<SceneState>({ selected, explosion, autoRotate, mode, reducedMotion })
  const activeIndex = modules.findIndex(module => module.id === selected)
  const activeModule = modules[activeIndex]

  function selectModule(moduleId: ModuleId) {
    setSelected(moduleId)
    setAutoRotate(false)
    if (moduleId === 'detector') setExplosion(current => Math.max(current, 80))
  }

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => {
      setReducedMotion(preference.matches)
      if (preference.matches) setAutoRotate(false)
    }
    updatePreference()
    preference.addEventListener('change', updatePreference)
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === viewerRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      preference.removeEventListener('change', updatePreference)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    stateRef.current = { selected, explosion, autoRotate, mode, reducedMotion }
    controllerRef.current?.update(stateRef.current)
  }, [selected, explosion, autoRotate, mode, reducedMotion])

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
            setAutoRotate(false)
            if (moduleId === 'detector') setExplosion(current => Math.max(current, 80))
          },
          onInteraction: () => setAutoRotate(false),
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
    setAutoRotate(false)
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
      setAutoRotate(false)
      actions[event.key]()
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (viewerRef.current?.requestFullscreen) {
        await Promise.race([
          viewerRef.current.requestFullscreen(),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Fullscreen request timed out')), 800)),
        ])
      }
    } catch {
      setFullscreen(document.fullscreenElement === viewerRef.current)
    }
  }

  return (
    <main className={styles.experience} data-pv400-experience>
      <div className={styles.shell}>
        <div className={styles.breadcrumb}>
          <Link href={`/${locale}/products#gas-imaging-cameras`}><Icon name="back" />{copy.back}</Link>
          <span>COOYUE <span className={styles.muted}>/</span> PRODUCT EXPERIENCE <span className={styles.muted}>/</span> 001</span>
        </div>

        <header className={styles.intro}>
          <div>
            <p className={styles.eyebrow}><span className={styles.statusDot} />{copy.category}</p>
            <h1 className={styles.productName}>PV400<span className={styles.productMark}>OGI</span></h1>
            <h2 className={styles.headline}>{copy.title}</h2>
          </div>
          <div className={styles.introRight}>
            <span className={styles.brand}>GUIDE <span>SENSMART</span></span>
            <p>{copy.intro}</p>
            <div className={styles.introRule}><span>ENGINEERED TO REVEAL</span><Icon name="crosshair" /></div>
          </div>
        </header>

        <section className={styles.labSection} aria-labelledby="pv400-lab-title">
          <div className={styles.labToolbar}>
            <h2 id="pv400-lab-title"><span>01</span>{copy.lab}<span className={styles.liveBadge}>3D</span></h2>
            <div className={styles.viewToggle} role="group" aria-label={copy.viewLabel}>
              <button type="button" aria-pressed={explosion === 0} onClick={() => changeView(0)}><Icon name="cube" />{copy.assembled}</button>
              <button type="button" aria-pressed={explosion > 0} onClick={() => changeView(100)}><Icon name="layers" />{copy.exploded}</button>
            </div>
          </div>

          <div className={styles.lab}>
            <aside className={styles.inspector} aria-live="polite" aria-atomic="true">
              <div className={styles.inspectorTop}><span>{copy.selected}</span><span>{activeModule.number} <span className={styles.muted}>/ 06</span></span></div>
              <div key={activeModule.id} className={styles.moduleInfo}>
                <span className={styles.moduleNumber}>{activeModule.number}</span>
                <p className={styles.moduleEnglish}>{activeModule.english}</p>
                <h3>{activeModule.label}</h3>
                <p className={styles.moduleTitle}>{activeModule.title}</p>
                <p className={styles.moduleDescription}>{activeModule.description}</p>
                <div className={styles.tags}>{activeModule.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              </div>
              <div className={styles.inspectorBottom}>
                <p>{activeModule.detail}</p>
                <div className={styles.modulePager}>
                  <span>{activeModule.english.split(' ')[0]} <span className={styles.muted}>/ MODULE</span></span>
                  <button type="button" aria-label={copy.previous} onClick={() => selectModule(modules[(activeIndex + 5) % modules.length].id)}><Icon name="back" /></button>
                  <button type="button" aria-label={copy.next} onClick={() => selectModule(modules[(activeIndex + 1) % modules.length].id)}><Icon name="arrow" /></button>
                </div>
              </div>
            </aside>

            <div className={styles.viewer} ref={viewerRef} data-scene-status={status}>
              <div className={styles.viewerGrid} aria-hidden="true" />
              <div className={styles.viewerWordmark} aria-hidden="true">PV<span>400</span></div>
              <div className={styles.viewerHeading}><span className={styles.statusDot} /><span>THREE.JS <span className={styles.muted}>/</span> REAL-TIME 3D</span></div>
              <div className={styles.viewerControls}>
                <button type="button" title={autoRotate ? copy.pause : copy.auto} aria-label={autoRotate ? copy.pause : copy.auto} aria-pressed={autoRotate} disabled={status !== 'ready' || reducedMotion} onClick={() => setAutoRotate(current => !current)}><Icon name={autoRotate ? 'pause' : 'rotate'} /></button>
                <button type="button" title={copy.reset} aria-label={copy.reset} disabled={status !== 'ready'} onClick={() => { setAutoRotate(false); controllerRef.current?.reset() }}><Icon name="reset" /></button>
                <button type="button" className={styles.fullscreenButton} title={fullscreen ? copy.exitFullscreen : copy.fullscreen} aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen} onClick={toggleFullscreen}><Icon name="expand" /></button>
              </div>
              <div ref={hostRef} className={styles.canvasHost} tabIndex={status === 'ready' ? 0 : -1} role="group" aria-label={copy.modelLabel} onKeyDown={handleModelKey} />
              {status === 'ready' && (
                <div className={styles.hotspots}>
                  {modules.map(module => (
                    <button
                      key={module.id}
                      type="button"
                      ref={element => { hotspotRefs.current[module.id] = element }}
                      className={styles.hotspot}
                      aria-label={`${module.number} ${module.label}`}
                      aria-pressed={selected === module.id}
                      onClick={() => selectModule(module.id)}
                      title={module.label}
                    ><span>{module.number}</span></button>
                  ))}
                </div>
              )}
              {status !== 'ready' && (
                <div className={styles.fallback} role="status">
                  <Image src={image} alt={copy.referenceImage} width={521} height={521} unoptimized />
                  <div>{status === 'loading' && <span className={styles.loader} />}<p>{status === 'loading' ? copy.loading : copy.fallback}</p>{status === 'unavailable' && <button type="button" onClick={() => setRetry(current => current + 1)}>{copy.retry}<Icon name="reset" /></button>}</div>
                </div>
              )}
              <div className={styles.viewerFooter}>
                <span className={styles.desktopHint}><Icon name="rotate" />{copy.drag}<span>·</span>{copy.scroll}</span>
                <span className={styles.mobileHint}>{copy.touch}</span>
                <div className={styles.zoomControls}>
                  <button type="button" aria-label={copy.zoomOut} title={copy.zoomOut} disabled={status !== 'ready'} onClick={() => controllerRef.current?.zoom(-1)}><Icon name="minus" /></button>
                  <span>3D</span>
                  <button type="button" aria-label={copy.zoomIn} title={copy.zoomIn} disabled={status !== 'ready'} onClick={() => controllerRef.current?.zoom(1)}><Icon name="plus" /></button>
                </div>
              </div>
              <div className={styles.axis} aria-hidden="true"><span>Y</span><span>Z</span><span>X</span></div>
            </div>
          </div>

          <div className={styles.explodeControl}>
            <label htmlFor="pv400-explosion"><Icon name="layers" />{copy.explodeLabel}</label>
            <span className={styles.rangeEndpoint}>0</span>
            <input id="pv400-explosion" type="range" min="0" max="100" step="1" value={explosion} onChange={event => changeView(Number(event.target.value))} aria-valuetext={`${explosion}%`} style={{ background: `linear-gradient(to right, #c3ed9b ${explosion}%, #344440 ${explosion}%)` }} />
            <output htmlFor="pv400-explosion">{explosion}<span>%</span></output>
          </div>

          <nav className={styles.moduleNav} aria-label={copy.moduleLabel}>
            {modules.map(module => (
              <button type="button" key={module.id} aria-pressed={selected === module.id} onClick={() => selectModule(module.id)}>
                <span className={styles.navNumber}>{module.number}</span><span>{module.label}</span><Icon name="arrow" />
              </button>
            ))}
          </nav>
          <div className={styles.modelNote}><span><Icon name="crosshair" />{copy.explore}</span><p>{copy.modelNote}</p></div>
        </section>

        <section className={styles.specBar} aria-label={locale === 'zh' ? '原厂关键规格' : 'Manufacturer specifications'}>
          <div><span>{copy.resolution}</span><strong>320 <span>×</span> 256</strong><small>INFRARED RESOLUTION</small></div>
          <div><span>{copy.frameRate}</span><strong>50 <span>Hz</span></strong><small>FRAME RATE</small></div>
          <div><span>{copy.detector}</span><strong>{copy.cooled}<span className={styles.specDot} /></strong><small>COOLED IR DETECTOR</small></div>
          <div className={styles.specSource}><Icon name="crosshair" /><p>{copy.verified}</p><a href="https://www.guideir.com/products/gas-detection/pv-series" target="_blank" rel="noopener noreferrer">GUIDE SENSMART<Icon name="external" /></a></div>
        </section>

        <section className={styles.imagingSection} aria-labelledby="pv400-imaging-title">
          <div className={styles.imagingCopy}>
            <p className={styles.sectionEyebrow}>{copy.previewTag}</p>
            <h2 id="pv400-imaging-title">{copy.previewTitle}<br /><span>{copy.previewAccent}</span></h2>
            <p className={styles.sectionDescription}>{copy.previewDescription}</p>
            <div className={styles.paletteOptions} role="group" aria-label={copy.paletteLabel}>
              {(['thermal', 'gas', 'mono'] as const).map(palette => (
                <button type="button" key={palette} aria-pressed={mode === palette} onClick={() => setMode(palette)}><span className={`${styles.paletteSwatch} ${styles[palette]}`} />{copy[palette]}<span className={styles.radioIndicator} /></button>
              ))}
            </div>
            <p className={styles.previewNote}>{copy.previewNote}</p>
          </div>
          <div className={styles.monitor}>
            <div className={styles.monitorHeader}><span><span className={styles.statusDot} />PV400 <span className={styles.muted}>/ IMAGING EXPLORER</span></span><Icon name="crosshair" /></div>
            <div className={styles.monitorImage}><ThermalPreview mode={mode} reducedMotion={reducedMotion} label={`${copy[mode]} — ${copy.simulated}`} /><span className={styles.simulatedBadge}>{copy.simulated}</span></div>
            <div className={styles.monitorFooter}><span>{copy[mode]}</span><div className={`${styles.heatScale} ${styles[mode]}`} /><span>DEMO ONLY</span></div>
          </div>
        </section>

        <section className={styles.signalSection} aria-label={copy.signal}>
          <p>{copy.signal}</p>
          <div>{copy.signalSteps.map((step, index) => <div key={step}><span>0{index + 1}</span><strong>{step}</strong>{index < 3 && <Icon name="arrow" />}</div>)}</div>
        </section>

        <section className={styles.referenceSection} aria-labelledby="pv400-reference-title">
          <div className={styles.referenceImage}>
            <span>GUIDE SENSMART<span>PV400</span></span>
            <Image src={image} alt={copy.referenceImage} width={521} height={521} loading="lazy" unoptimized />
            <p>PRODUCT REFERENCE <span>FIG. 01</span></p>
          </div>
          <div className={styles.referenceCopy}>
            <p className={styles.sectionEyebrow}>{copy.referenceTag}</p>
            <h2 id="pv400-reference-title">{copy.referenceTitle}</h2>
            <p>{copy.referenceText}</p>
            <div className={styles.referenceActions}>
              <Link href={`/${locale}/contact?product=guide-sensmart-pv400`} className={styles.inquiryButton}>{copy.inquire}<Icon name="arrow" /></Link>
              <a href="https://www.guideir.com/products/gas-detection/pv-series" target="_blank" rel="noopener noreferrer">{copy.source}<Icon name="external" /></a>
            </div>
          </div>
        </section>
        <div className={styles.endnote}><span>COOYUE / INTERACTIVE PRODUCT SERIES</span><span>PV400 — EXPERIENCE 001</span></div>
      </div>
    </main>
  )
}
