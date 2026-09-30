import sharp from 'sharp'

// Leave room for the surrounding JSON fields under Vercel's 4.5 MB response limit.
export const MAX_THUMBNAIL_DATA_URL_BYTES = 3_500_000

export async function compactGeneratedThumbnail(dataUrl: string): Promise<string> {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) throw new Error('Nano Banana returned an unsupported image format.')

  const source = Buffer.from(match[2], 'base64')
  const sizes = [1920, 1600, 1280, 1024]
  const qualities = [84, 78, 72, 66]

  for (const width of sizes) {
    for (const quality of qualities) {
      const output = await sharp(source, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer()
      const result = `data:image/webp;base64,${output.toString('base64')}`
      if (Buffer.byteLength(result, 'utf8') <= MAX_THUMBNAIL_DATA_URL_BYTES) return result
    }
  }

  throw new Error('Generated thumbnail could not be reduced below the response size limit.')
}
