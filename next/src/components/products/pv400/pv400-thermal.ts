import type { ImagingMode } from './pv400-data'

export function drawThermalFrame(context: CanvasRenderingContext2D, mode: ImagingMode, time: number) {
  const { width, height } = context.canvas
  const thermal = mode === 'thermal'
  const gas = mode === 'gas'
  const background = context.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, thermal ? '#200547' : '#101a21')
  background.addColorStop(1, thermal ? '#080b29' : '#28383d')
  context.fillStyle = background
  context.fillRect(0, 0, width, height)

  context.strokeStyle = thermal ? '#442061' : '#3a494e'
  context.lineWidth = 1
  for (let column = 0; column < 12; column += 1) {
    context.beginPath()
    context.moveTo(column * width / 11, height * 0.65)
    context.lineTo(width * 0.5 + (column - 5.5) * width * 0.21, height)
    context.stroke()
  }
  for (let row = 0; row < 4; row += 1) {
    context.fillStyle = thermal ? '#322042' : '#37454a'
    context.fillRect(width * 0.07, height * (0.2 + row * 0.09), width * 0.83, height * 0.016)
  }

  const drawPipe = (left: number, top: number, pipeWidth: number, pipeHeight: number) => {
    const gradient = context.createLinearGradient(left, top, left + pipeWidth, top)
    gradient.addColorStop(0, thermal ? '#972857' : '#44545a')
    gradient.addColorStop(0.48, thermal ? '#ffbc46' : '#adbdbe')
    gradient.addColorStop(1, thermal ? '#cc3e62' : '#42565b')
    context.fillStyle = gradient
    context.fillRect(left, top, pipeWidth, pipeHeight)
    context.fillStyle = thermal ? '#ed6a34' : '#76898c'
    context.fillRect(left - pipeWidth * 0.15, top + pipeHeight * 0.65, pipeWidth * 1.3, height * 0.035)
  }

  drawPipe(width * 0.13, height * 0.18, width * 0.16, height * 0.7)
  drawPipe(width * 0.66, height * 0.12, width * 0.075, height * 0.72)
  drawPipe(width * 0.79, height * 0.23, width * 0.055, height * 0.66)
  const pipeGradient = context.createLinearGradient(0, height * 0.52, 0, height * 0.65)
  pipeGradient.addColorStop(0, thermal ? '#dd5361' : '#647c81')
  pipeGradient.addColorStop(0.5, thermal ? '#ffec8d' : '#d1d9d5')
  pipeGradient.addColorStop(1, thermal ? '#e9873d' : '#7e9292')
  context.fillStyle = pipeGradient
  context.fillRect(width * 0.2, height * 0.52, width * 0.63, height * 0.13)
  context.fillStyle = thermal ? '#ffcf5a' : '#c3d0cb'
  context.fillRect(width * 0.46, height * 0.49, width * 0.045, height * 0.19)
  context.fillRect(width * 0.43, height * 0.44, width * 0.1, height * 0.025)
  context.fillRect(width * 0.474, height * 0.44, width * 0.017, height * 0.12)

  context.save()
  context.globalCompositeOperation = 'screen'
  for (let puff = 0; puff < 15; puff += 1) {
    const phase = (puff / 15 + time * 0.14) % 1
    const centerX = width * (0.49 + phase * 0.17 + Math.sin(phase * 10 + time) * 0.021)
    const centerY = height * (0.48 - phase * 0.36)
    const radius = width * (0.018 + phase * 0.066)
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    const color = gas ? '134, 255, 167' : thermal ? '250, 77, 144' : '221, 235, 224'
    gradient.addColorStop(0, `rgba(${color}, ${0.27 * (1 - phase)})`)
    gradient.addColorStop(0.55, `rgba(${color}, ${0.13 * (1 - phase)})`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)
    context.fillStyle = gradient
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
  }
  context.restore()

  context.strokeStyle = gas ? '#baf6bb' : '#eee6c9'
  context.lineWidth = Math.max(1, width / 600)
  const centerX = width * 0.49
  const centerY = height * 0.5
  const markSize = width * 0.025
  context.beginPath()
  context.moveTo(centerX - markSize, centerY)
  context.lineTo(centerX + markSize, centerY)
  context.moveTo(centerX, centerY - markSize)
  context.lineTo(centerX, centerY + markSize)
  context.stroke()

  const scale = context.createLinearGradient(0, height * 0.24, 0, height * 0.78)
  scale.addColorStop(0, thermal ? '#ffeda4' : gas ? '#d7ffbc' : '#f4f8f5')
  scale.addColorStop(0.5, thermal ? '#e53a83' : gas ? '#56b57d' : '#8b9c9e')
  scale.addColorStop(1, thermal ? '#391475' : '#233439')
  context.fillStyle = scale
  context.fillRect(width * 0.943, height * 0.24, width * 0.009, height * 0.54)
  context.fillStyle = '#e3ebe4'
  context.font = `${Math.max(10, width * 0.019)}px monospace`
  context.fillText('PV400 / DEMO', width * 0.038, height * 0.083)
  context.fillText(gas ? 'GAS ENHANCEMENT' : thermal ? 'IRON PALETTE' : 'WHITE HOT', width * 0.038, height * 0.94)
  context.font = `${Math.max(9, width * 0.015)}px monospace`
  context.textAlign = 'right'
  context.fillText('SIMULATED', width * 0.95, height * 0.083)
  context.textAlign = 'left'
}
