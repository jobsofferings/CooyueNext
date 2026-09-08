export const ASSEMBLED_SECONDS: number
export const TRANSITION_SECONDS: number
export const MODULE_SECONDS: number
export function getCarouselFrame(elapsedSeconds: number, moduleCount: number): {
  moduleIndex: number
  explosion: number
  duration: number
}
