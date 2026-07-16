export async function downloadMedia(url: string, filename: string, fetcher = fetch) {
  const response = await fetcher(url)
  if (!response.ok) throw new Error('Unable to download the video.')

  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
