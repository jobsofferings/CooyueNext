# PV400 interactive product experience

The product detail route mounts this experience only for the `guide-sensmart-pv400` slug, in both `zh` and `en`. Other products retain their existing detail pages. Product lookup and SEO metadata remain server-rendered; no database records are changed.

## Files

- `Pv400Experience.tsx`: accessible controls, loading/fallback states, module descriptions, synchronized palette selection and reference section.
- `pv400-scene.ts`: lazily imported Three.js scene, procedural assemblies, raycast selection, projected hotspots, orbit controls and GPU resource disposal.
- `pv400-thermal.ts`: generated demonstration imagery used by the model display and the larger preview.
- `pv400-data.ts`: Chinese and English interface text and module descriptions.
- `pv400.module.css`: locally scoped desktop/mobile styling and reduced-motion behavior.

## Interaction

Drag to rotate, pinch or scroll to zoom, or use the on-screen controls. With keyboard focus on the viewer, arrow keys rotate, `+`/`-` zoom and `0` restores the default view. The assembled/exploded buttons and percentage slider control separation. Selecting the normally hidden detector opens the model automatically. Module navigation remains available when WebGL is unavailable.

The Three.js chunk loads near the viewport. Rendering is capped at 30 FPS and device pixel ratio at 1.6; hidden/offscreen scenes skip rendering. The display texture refreshes at 12 FPS. Reduced-motion preferences disable automatic rotation and plume animation and make separation changes immediate. Unmounting disposes geometries, materials, textures, controls, observers and the renderer.

## Accuracy boundaries

This is a functional illustration reconstructed from the supplied product image, not an official CAD model, dimensional drawing or service guide. The internal detector, battery placement and separation paths are conceptual. The three palette previews are procedurally generated, not measurements or a complete list of device modes.

The published resolution (320 × 256), frame rate (50 Hz), cooled detector, flip-out LCD and rotating OLED viewfinder are sourced from the Guide Sensmart PV Series product page. Manufacturer reference links and the original product image are available in the experience. Do not add unverified spectral bands, battery capacity, gas sensitivity or quantitative readouts to the simulation.

## Validation

From `next`, run `yarn tsc --noEmit` and `yarn build`. Browser checks should cover both locales, desktop/mobile widths, all six module selectors, continuous separation, drag and keyboard controls, palette synchronization, fullscreen, reduced motion, no-WebGL fallback/retry, and navigation to another product and back.
