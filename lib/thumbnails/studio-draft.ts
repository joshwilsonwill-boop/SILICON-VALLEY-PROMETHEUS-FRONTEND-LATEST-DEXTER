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
  const cover = Math.max(width / image.width, height / image.height) * (design.layout === 'reaction' ? 1.16 : 1)
  const iw = image.width * cover
  const ih = image.height * cover
  ctx.drawImage(image, (width - iw) / 2, (height - ih) / 2, iw, ih)

  const rightText = design.layout === 'badge'
  const clean = design.layout === 'clean'
  const split = design.layout === 'split'
  const gradient = portrait ? ctx.createLinearGradient(0, height * 0.35, 0, height) : ctx.createLinearGradient(rightText ? width : 0, 0, rightText ? 0 : width, 0)
  const surface = light ? '232,230,223' : '5,13,24'
  const original = design.background === 'original'
  gradient.addColorStop(0, 'rgba(' + surface + ',' + (portrait ? '0' : original ? '0.7' : '0.96') + ')')
  gradient.addColorStop(portrait ? 0.7 : 0.52, 'rgba(' + surface + ',' + (original ? '0.36' : '0.78') + ')')
  gradient.addColorStop(1, 'rgba(' + surface + ',' + (portrait ? original ? '0.78' : '0.98' : original ? '0' : '0.05') + ')')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  if (design.background === 'contrast' || split) {
    ctx.globalAlpha = 0.18
    ctx.fillStyle = design.accent
    ctx.fillRect(0, 0, width / 2, height)
    ctx.fillStyle = '#d04750'
    ctx.fillRect(width / 2, 0, width / 2, height)
    ctx.globalAlpha = 1
  }
  const pad = width * 0.065
  const maxWidth = portrait ? width - pad * 2 : width * (split ? 0.31 : clean ? 0.43 : 0.44)
  const text = headline.trim().toLocaleUpperCase()
  if (!text) return canvas.toDataURL('image/jpeg', 0.92)
  const words = text.split(/\s+/)
  const accentChannels = [1, 3, 5].map(index => parseInt(design.accent.slice(index, index + 2), 16) / 255)
  const luminance = accentChannels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const accentInk = luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722 > 0.179 ? '#07111f' : '#f6f7f5'
  const blocks = split && !portrait && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [text]
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
  const startX = !portrait && (rightText || (split && blockIndex === 1)) ? width - maxWidth - pad : pad
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
