# PV400 embedded 3D demonstration

The existing product detail page inserts this component directly after `product-detail-top`, only for the `guide-sensmart-pv400` slug in Chinese and English. The page header, original product photo, description, specifications, related products, inquiry links and SEO metadata retain their original structure. No product records are changed.

## Behavior

- On entering the viewport, the model automatically rotates and loops through assembled, separated and reassembled views. The loop takes approximately 16 seconds.
- Pause/play controls the demonstration. Dragging, keyboard controls, selecting a module or using the separation slider pauses playback for manual inspection.
- Six module buttons and projected hotspots show functional descriptions. Selecting the detector separates the model to expose the normally hidden module.
- Arrow keys rotate, `+`/`-` zoom and `0` resets the view when the canvas container is focused.
- Reduced-motion preferences disable autoplay. Offscreen or hidden-tab scenes pause animation. Devices without WebGL retain the reference image and functional descriptions, with a retry button.

## Implementation

`Pv400Experience.tsx` provides the embedded controls and fallback. `pv400-scene.ts` is dynamically imported near the viewport and owns geometry, animation, picking and resource disposal. `pv400-thermal.ts` generates the illustrative screen texture. Text is localized in `pv400-data.ts`; visual styles are scoped in `pv400.module.css`.

The scene limits rendering to 30 FPS and device pixel ratio to 1.6. It disposes geometry, materials, textures, controls, observers and the renderer on unmount. It never changes the rest of the page’s styles or hides global navigation controls.

## Accuracy

The geometry is a functional illustration reconstructed from product imagery, not manufacturer CAD, a dimensional drawing or a service guide. Internal assemblies and separation paths are conceptual. The screen imagery is simulated and must not be used for safety decisions or measurements.

Function descriptions are based on the Guide Sensmart PV Series product page. Do not add unverified specifications or quantitative readings to the illustration.

## Validation

Run `yarn tsc --noEmit` and `yarn build` from `next`. Verify the original page sections remain, the 3D section appears immediately after `product-detail-top`, autoplay separates and reassembles, manual interaction pauses playback, and both locales, mobile layout, reduced motion and WebGL fallback work. Other product routes must not render this component.
