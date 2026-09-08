const ASSEMBLED_SECONDS = 2;
const TRANSITION_SECONDS = 2;
const MODULE_SECONDS = 4;

function getCarouselFrame(elapsedSeconds, moduleCount) {
  const count = Math.max(1, Math.floor(moduleCount));
  const presentationStart = ASSEMBLED_SECONDS + TRANSITION_SECONDS;
  const presentationEnd = presentationStart + count * MODULE_SECONDS;
  const duration = presentationEnd + TRANSITION_SECONDS;
  const phase = Math.max(0, elapsedSeconds) % duration;
  const moduleIndex = Math.max(0, Math.min(count - 1, Math.floor((phase - presentationStart) / MODULE_SECONDS)));
  const explosion = phase < ASSEMBLED_SECONDS ? 0
    : phase < presentationStart ? (phase - ASSEMBLED_SECONDS) / TRANSITION_SECONDS
      : phase < presentationEnd ? 1 : 1 - (phase - presentationEnd) / TRANSITION_SECONDS;
  return { moduleIndex, explosion, duration };
}

module.exports = { ASSEMBLED_SECONDS, TRANSITION_SECONDS, MODULE_SECONDS, getCarouselFrame };
