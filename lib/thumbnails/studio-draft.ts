import type { StudioDesign } from './studio-art-direction'

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not prepare this video frame.'))
    image.src = dataUrl
  })
}

/** A truthful frame-based layout preview. Nano Banana performs the final subject isolation and relighting. */
export async function renderStudioDraft(dataUrl: string, headline: string, emphasis: string, design: StudioDesign, width: number, height: number): Promise<string> {
  const image = await loadImage(dataUrl)
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Thumbnail preview is unavailable in this browser.')
  const portrait = height > width
  const light = design.background === 'light'
  ctx.fillStyle = light ? '#e8e6df' : '#07111f'
  ctx.fillRect(0, 0, width, height)
  const cover = Math.max(width / image.width, height / image.height) * (design.layout === 'reaction' ? 1.22 : 1.04)
  const sw = width / cover
  const sh = height / cover
  const focusX = design.layout === 'badge' ? 0.42 : 0.6
  const sx = Math.max(0, Math.min(image.width - sw, image.width * focusX - sw / 2))
  const sy = Math.max(0, Math.min(image.height - sh, image.height * 0.46 - sh / 2))
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)

  const rightText = design.layout === 'badge'
  const clean = design.layout === 'clean'
  const concept = design.layout === 'split'
  const gradient = portrait ? ctx.createLinearGradient(0, height * 0.35, 0, height) : ctx.createLinearGradient(rightText ? width : 0, 0, rightText ? 0 : width, 0)
  const surface = light ? '232,230,223' : '5,13,24'
  const original = design.background === 'original'
  gradient.addColorStop(0, 'rgba(' + surface + ',' + (portrait ? '0' : original ? '0.7' : '0.96') + ')')
  gradient.addColorStop(portrait ? 0.7 : 0.52, 'rgba(' + surface + ',' + (original ? '0.36' : '0.78') + ')')
  gradient.addColorStop(1, 'rgba(' + surface + ',' + (portrait ? original ? '0.78' : '0.98' : original ? '0' : '0.05') + ')')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  if (design.background === 'contrast') {
    ctx.globalAlpha = 0.18
    ctx.fillStyle = design.accent
    ctx.fillRect(0, 0, width / 2, height)
    ctx.fillStyle = '#d04750'
    ctx.fillRect(width / 2, 0, width / 2, height)
    ctx.globalAlpha = 1
  }
  if (concept) {
    ctx.save()
    ctx.strokeStyle = light ? 'rgba(18,29,38,.14)' : 'rgba(225,239,245,.14)'
    ctx.lineWidth = Math.max(1, width / 600)
    const step = Math.max(14, width / 20)
    for (let x = 0; x < width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
    for (let y = 0; y < height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
    ctx.restore()
    const glow = ctx.createRadialGradient(width * 0.77, height * 0.48, 1, width * 0.77, height * 0.48, width * 0.28)
    glow.addColorStop(0, design.accent + '58')
    glow.addColorStop(1, design.accent + '00')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
  }
  const pad = width * 0.065
  const maxWidth = portrait ? width - pad * 2 : width * (clean ? 0.43 : design.layout === 'reaction' ? 0.4 : 0.46)
  const text = headline.trim().toLocaleUpperCase()
  if (!text) return canvas.toDataURL('image/jpeg', 0.92)
  const words = text.split(/\s+/)
  const accentChannels = [1, 3, 5].map(index => parseInt(design.accent.slice(index, index + 2), 16) / 255)
  const luminance = accentChannels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const accentInk = luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722 > 0.179 ? '#07111f' : '#f6f7f5'
  const blocks = [text]
  for (const [blockIndex, block] of blocks.entries()) {
  let fontSize = (portrait ? width * 0.14 : height * (design.layout === 'reaction' ? 0.19 : 0.16)) * design.textScale * (clean ? 0.78 : 1)
  const face = clean ? '"Segoe UI", Arial, sans-serif' : 'Impact, "Arial Narrow", "Arial Black", sans-serif'
  let lines: string[] = []
  for (let attempt = 0; attempt < 24; attempt++) {
    ctx.font = '900 ' + fontSize + 'px ' + face
    lines = []
    for (const word of block.split(/\s+/)) {
      const current = lines[lines.length - 1]
      if (!current || ctx.measureText(current + ' ' + word).width > maxWidth) lines.push(word)
      else lines[lines.length - 1] += ' ' + word
    }
    const longest = Math.max(...lines.map(line => ctx.measureText(line).width))
    if (longest <= maxWidth - 10 && lines.length * fontSize * 1.13 < height * (portrait ? 0.39 : 0.73)) break
    fontSize *= 0.9
  }
  const lineHeight = fontSize * 1.13
  const total = lines.length * lineHeight
  const startY = portrait ? height * 0.91 - total : (height - total) / 2
  const startX = !portrait && rightText ? width - maxWidth - pad : pad
  ctx.textBaseline = 'top'
  const emphasized = emphasis.toLocaleUpperCase()
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const y = startY + index * lineHeight
    let x = startX
    for (const word of line.split(' ')) {
      const wordWidth = ctx.measureText(word).width
      const isEmphasized = Boolean(emphasized) && (word === emphasized || emphasized.split(/\s+/).includes(word))
      if ((isEmphasized && !clean) || design.layout === 'badge') {
        ctx.fillStyle = design.accent
        ctx.beginPath()
        ctx.moveTo(x - fontSize * 0.06, y - fontSize * 0.01)
        ctx.lineTo(x + wordWidth + fontSize * 0.07, y - fontSize * 0.06)
        ctx.lineTo(x + wordWidth + fontSize * 0.02, y + fontSize * 1.02)
        ctx.lineTo(x - fontSize * 0.1, y + fontSize * 1.06)
        ctx.closePath()
        ctx.fill()
      }
      ctx.fillStyle = (isEmphasized && !clean) || design.layout === 'badge' ? accentInk : isEmphasized && clean ? design.accent : light ? '#111d28' : '#f6f7f5'
      ctx.shadowColor = light ? 'transparent' : 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = fontSize * 0.06
      ctx.shadowOffsetY = fontSize * 0.025
      ctx.fillText(word, x, y)
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      x += wordWidth + ctx.measureText(' ').width
    }
  }
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}
