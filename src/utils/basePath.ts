export type AppRoute = '/md' | '/curl'

export function normalizeBase(base: string): string {
  return base.replace(/\/+$/, '')
}

export function stripBase(pathname: string, base: string): string {
  const basePath = normalizeBase(base)

  if (!basePath) {
    return pathname || '/'
  }

  if (pathname === basePath || pathname === `${basePath}/`) {
    return '/'
  }

  if (pathname.startsWith(`${basePath}/`)) {
    const stripped = pathname.slice(basePath.length)
    return stripped === '' ? '/' : stripped
  }

  return pathname
}

export function withBase(path: string, base: string): string {
  const basePath = normalizeBase(base)
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${basePath}${normalized}`
}

export function getRouteFromPathname(pathname: string, base: string): AppRoute {
  return stripBase(pathname, base) === '/curl' ? '/curl' : '/md'
}
