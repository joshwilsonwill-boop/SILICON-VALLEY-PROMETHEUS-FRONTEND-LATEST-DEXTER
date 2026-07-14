const FOOTER_ROUTES = new Set(['/signup', '/signin', '/terms', '/privacy', '/refund', '/cookie-policy', '/contact'])

export function shouldShowGlobalFooter(pathname: string | null | undefined) {
  if (!pathname) return false
  const normalizedPath = normalizePath(pathname)
  return FOOTER_ROUTES.has(normalizedPath)
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

export { FOOTER_ROUTES }
