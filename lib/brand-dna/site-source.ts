import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { request as httpRequest, type ClientRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { JSDOM } from 'jsdom'

const MAX_HTML_BYTES = 1_500_000
const MAX_CSS_BYTES = 250_000
const MAX_SITE_PAGES = 3
const MAX_SITE_STYLESHEETS = 3
const MAX_REDIRECTS = 4
const REQUEST_TIMEOUT_MS = 8_000

export type BrandSiteEvidence = {
  requestedUrl: string
  canonicalUrl: string
  pages: Array<{
    url: string
    title: string
    description: string
    headings: string[]
    text: string
    imageDescriptions: string[]
  }>
  observedColors: string[]
  observedFonts: string[]
  logoText: string
}


type PublicAddress = { address: string; family: 4 | 6 }
type HttpTextResponse = { status: number; location: string | null; contentType: string; text: string }

function isPrivateOrReservedIpv4(address: string) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  )
}

function isPublicAddress(address: string) {
  const unbracketed = address.replace(/^\[|\]$/g, '').split('%')[0]
  const family = isIP(unbracketed)
  if (family === 4) return !isPrivateOrReservedIpv4(unbracketed)
  if (family !== 6) return false

  const groups = unbracketed.toLowerCase().split(':')
  const firstGroup = Number.parseInt(groups[0] || '0', 16)
  // Only global unicast (2000::/3) is accepted; documentation and transition
  // blocks are excluded. This rejects loopback, unique-local, and link-local.
  return firstGroup >= 0x2000 && firstGroup <= 0x3fff && !/^2001:db8:/i.test(unbracketed) && !/^2001:0:/i.test(unbracketed)
}

export function normalizeWebsiteUrl(input: string) {
  const trimmed = input.trim()
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('Enter a valid website address, such as danmartell.com.')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only public HTTP or HTTPS websites can be analyzed.')
  if (url.username || url.password) throw new Error('Website addresses cannot contain login credentials.')
  if (url.port && url.port !== '80' && url.port !== '443') throw new Error('Use a website on the standard HTTP or HTTPS port.')

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Enter a publicly reachable website address.')
  }
  url.hash = ''
  return url
}

async function resolvePublicAddresses(hostname: string): Promise<PublicAddress[]> {
  const unbracketed = hostname.replace(/^\[|\]$/g, '')
  if (isIP(unbracketed)) {
    if (!isPublicAddress(unbracketed)) throw new Error('That address does not point to a public website.')
    return [{ address: unbracketed, family: isIP(unbracketed) as 4 | 6 }]
  }

  let records: Array<{ address: string; family: number }>
  try {
    records = await lookup(unbracketed, { all: true, verbatim: true })
  } catch {
    throw new Error('We could not find a public website at that address.')
  }
  if (records.length === 0 || records.some((record) => !isPublicAddress(record.address))) {
    throw new Error('That address does not resolve exclusively to public website servers.')
  }
  return records
    .sort((left, right) => left.family - right.family)
    .map((record) => ({ address: record.address, family: record.family as 4 | 6 }))
}

function pinnedLookup(address: PublicAddress): NonNullable<import('node:http').RequestOptions['lookup']> {
  return ((_hostname, _options, callback) => callback(null, address.address, address.family)) as NonNullable<import('node:http').RequestOptions['lookup']>
}

async function requestText(url: URL, byteLimit: number): Promise<HttpTextResponse> {
  const addresses = await resolvePublicAddresses(url.hostname)
  const address = addresses[0]

  return new Promise((resolve, reject) => {
    let settled = false
    let req: ClientRequest
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    const requestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'PrometheusBrandResearch/1.0 (+https://prometheus.app; public brand profile analysis)',
        Accept: 'text/html,application/xhtml+xml,text/css;q=0.9,*/*;q=0.2',
        'Accept-Encoding': 'identity',
      },
      lookup: pinnedLookup(address),
      timeout: REQUEST_TIMEOUT_MS,
      maxHeaderSize: 16_000,
    }
    const handleResponse = (response: IncomingMessage) => {
      const status = response.statusCode ?? 0
      const location = response.headers.location ?? null
      const contentType = response.headers['content-type'] ?? ''
      if (status >= 300 && status < 400 && location) {
        response.resume()
        settled = true
        resolve({ status, location, contentType, text: '' })
        return
      }
      if (status < 200 || status >= 300) {
        response.resume()
        fail(new Error(`The website returned HTTP ${status || 'an error'}.`))
        return
      }
      let totalBytes = 0
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        totalBytes += buffer.length
        if (totalBytes > byteLimit) {
          req.destroy(new Error('The website response exceeded the analysis size limit.'))
          return
        }
        chunks.push(buffer)
      })
      response.on('end', () => {
        if (settled) return
        settled = true
        resolve({ status, location: null, contentType, text: Buffer.concat(chunks).toString('utf8') })
      })
      response.on('error', fail)
    }
    req = url.protocol === 'https:'
      ? httpsRequest(url, requestOptions, handleResponse)
      : httpRequest(url, requestOptions, handleResponse)
    req.on('timeout', () => req.destroy(new Error('The website took too long to respond.')))
    req.on('error', fail)
    req.end()
  })
}

async function fetchPublicText(input: URL, byteLimit: number, allowCss = false): Promise<{ url: URL; contentType: string; text: string }> {
  let current = new URL(input.href)
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    current = normalizeWebsiteUrl(current.href)
    const response = await requestText(current, byteLimit)
    if (response.location) {
      if (redirects === MAX_REDIRECTS) throw new Error('The website redirected too many times.')
      current = new URL(response.location, current)
      continue
    }
    const validType = allowCss
      ? response.contentType.toLowerCase().includes('text/css')
      : /text\/html|application\/xhtml\+xml/i.test(response.contentType)
    if (!validType) throw new Error(allowCss ? 'A linked stylesheet was not CSS.' : 'That address did not return a web page.')
    return { url: current, contentType: response.contentType, text: response.text }
  }
  throw new Error('The website could not be reached safely.')
}

export function parsePageMarkup(html: string, pageUrl: URL) {
  const dom = new JSDOM(html, { url: pageUrl.href })
  const { document } = dom.window
  const styleText = `${Array.from(document.querySelectorAll('style')).map((node) => node.textContent ?? '').join('\n')} ${Array.from(document.querySelectorAll('[style]')).map((node) => node.getAttribute('style') ?? '').join('\n')}`
  for (const node of document.querySelectorAll('script,noscript,svg,iframe,canvas,template')) node.remove()

  const title = document.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) ?? ''
  const description = document.querySelector('meta[name="description" i]')?.getAttribute('content')?.trim() ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || ''
  const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim().slice(0, 220) ?? '')
    .filter(Boolean)
    .slice(0, 24)
  const imageDescriptions = Array.from(document.querySelectorAll('header img[alt],main img[alt],img[alt]'))
    .map((node) => node.getAttribute('alt')?.trim().slice(0, 180) ?? '')
    .filter(Boolean)
    .slice(0, 16)
  const text = (document.querySelector('main') ?? document.body).textContent?.replace(/\s+/g, ' ').trim().slice(0, 6_000) ?? ''
  const logoText = document.querySelector('[itemprop="name"],header [class*="logo" i],header a[aria-label]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? ''
  const stylesheets = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]'))
    .map((node) => new URL(node.getAttribute('href')!, pageUrl))
    .filter((url) => url.origin === pageUrl.origin)
    .slice(0, MAX_SITE_STYLESHEETS)
  dom.window.close()
  return { title, description, headings, imageDescriptions, text, logoText, stylesheets, styleText }
}

function cssColorToHex(value: string) {
  const normalized = value.trim().toLowerCase()
  const short = normalized.match(/^#([\da-f]{3})$/i)
  if (short) return `#${short[1].split('').map((digit) => digit + digit).join('')}`
  const hex = normalized.match(/^#([\da-f]{6})(?:[\da-f]{2})?$/i)
  if (hex) return `#${hex[1]}`

  const rgb = normalized.match(/^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (rgb) {
    if (rgb[4] && Number.parseFloat(rgb[4]) < 0.2) return null
    const channel = (raw: string) => Math.max(0, Math.min(255, Math.round(raw.endsWith('%') ? Number.parseFloat(raw) * 2.55 : Number.parseFloat(raw))))
    return `#${[rgb[1], rgb[2], rgb[3]].map((raw) => channel(raw).toString(16).padStart(2, '0')).join('')}`
  }

  const hsl = normalized.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (!hsl || (hsl[4] && Number.parseFloat(hsl[4]) < 0.2)) return null
  const hue = ((Number.parseFloat(hsl[1]) % 360) + 360) % 360 / 360
  const saturation = Math.max(0, Math.min(1, Number.parseFloat(hsl[2]) / 100))
  const lightness = Math.max(0, Math.min(1, Number.parseFloat(hsl[3]) / 100))
  const channel = (offset: number) => {
    const k = (offset + hue * 12) % 12
    const a = saturation * Math.min(lightness, 1 - lightness)
    const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * value).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

function extractColors(css: string) {
  const counts = new Map<string, number>()
  const matches = css.match(/#[\da-f]{3,8}\b|\brgba?\([^)]{1,80}\)|\bhsla?\([^)]{1,80}\)/gi) ?? []
  for (const match of matches) {
    const normalized = cssColorToHex(match)
    if (!normalized) continue
    if (/^#(?:fff|ffffff|000|000000|333|666|999|ccc)$/.test(normalized)) continue
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([color]) => color)
}

function extractFonts(css: string) {
  const families = new Map<string, number>()
  const matches = css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)
  for (const match of matches) {
    const family = match[1]?.split(',')[0]?.replace(/["']/g, '').trim()
    if (family && family.length < 80 && !/^(inherit|initial|unset|sans-serif|serif|monospace)$/i.test(family)) {
      families.set(family, (families.get(family) ?? 0) + 1)
    }
  }
  return [...families.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([family]) => family)
}

export function extractSiteStyleSignals(css: string) {
  return { colors: extractColors(css), fonts: extractFonts(css) }
}

export async function inspectPublicBrandSite(input: string): Promise<BrandSiteEvidence> {
  const requestedUrl = normalizeWebsiteUrl(input)
  await resolvePublicAddresses(requestedUrl.hostname)
  const firstPage = await fetchPublicText(requestedUrl, MAX_HTML_BYTES)
  const firstMarkup = parsePageMarkup(firstPage.text, firstPage.url)
  const pages = [{ url: firstPage.url, markup: firstMarkup }]

  const candidateDom = new JSDOM(firstPage.text, { url: firstPage.url.href })
  const candidatePages = Array.from(candidateDom.window.document.querySelectorAll('a[href]'))
    .map((node) => {
      try { return new URL(node.getAttribute('href')!, firstPage.url) } catch { return null }
    })
    .filter((url): url is URL => Boolean(url && url.origin === firstPage.url.origin && /about|story|founder|mission|services|what-we-do|company|brand/i.test(url.pathname)))
    .filter((url, index, all) => all.findIndex((candidate) => candidate.href === url.href) === index)
    .slice(0, MAX_SITE_PAGES - 1)
  candidateDom.window.close()
  const extraPages = await Promise.allSettled(candidatePages.map((candidate) => fetchPublicText(candidate, MAX_HTML_BYTES)))
  for (const result of extraPages) {
    if (result.status !== 'fulfilled') continue
    pages.push({ url: result.value.url, markup: parsePageMarkup(result.value.text, result.value.url) })
  }

  const cssParts = pages.map((page) => page.markup.styleText)
  const stylesheetResults = await Promise.allSettled(pages[0].markup.stylesheets.map((stylesheet) => fetchPublicText(stylesheet, MAX_CSS_BYTES, true)))
  cssParts.push(...stylesheetResults.flatMap((result) => result.status === 'fulfilled' ? [result.value.text] : []))
  const css = cssParts.join('\n')

  const styleSignals = extractSiteStyleSignals(css)
  return {
    requestedUrl: requestedUrl.href,
    canonicalUrl: firstPage.url.href,
    pages: pages.map((page) => ({
      url: page.url.href,
      title: page.markup.title,
      description: page.markup.description,
      headings: page.markup.headings,
      text: page.markup.text,
      imageDescriptions: page.markup.imageDescriptions,
    })),
    observedColors: styleSignals.colors,
    observedFonts: styleSignals.fonts,
    logoText: pages.find((page) => page.markup.logoText)?.markup.logoText ?? '',
  }
}
