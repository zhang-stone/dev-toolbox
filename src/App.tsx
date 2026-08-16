import { useCallback, useEffect, useState } from 'react'
import { CurlPage } from './pages/CurlPage'
import { MarkdownPage } from './pages/MarkdownPage'
import {
  getRouteFromPathname,
  withBase,
  type AppRoute,
} from './utils/basePath'
import 'github-markdown-css/github-markdown.css'
import './App.css'

const BASE = import.meta.env.BASE_URL

const ROUTES: Array<{ path: AppRoute, label: string }> = [
  { path: '/md', label: 'Markdown' },
  { path: '/curl', label: 'curl' },
]

function getRoute(): AppRoute {
  return getRouteFromPathname(window.location.pathname, BASE)
}

function App() {
  const [route, setRoute] = useState<AppRoute>(getRoute)

  useEffect(() => {
    const nextUrl = withBase(route, BASE)
    if (window.location.pathname !== nextUrl) {
      window.history.replaceState(null, '', nextUrl)
    }

    const handlePopState = () => setRoute(getRoute())
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [route])

  const navigate = useCallback((nextRoute: AppRoute) => {
    if (nextRoute === route) return

    window.history.pushState(null, '', withBase(nextRoute, BASE))
    setRoute(nextRoute)
  }, [route])

  return (
    <div className="container">
      <header className="header">
        <div className="brand" aria-label="DevTools">
          <span className="brand-icon" aria-hidden="true">
            <span className="brand-chevron" />
            <span className="brand-cursor" />
          </span>
          <h1>DevTools</h1>
        </div>
        <nav className="nav" aria-label="工具导航">
          {ROUTES.map(item => (
            <button
              className={`nav-link ${route === item.path ? 'nav-link-active' : ''}`}
              key={item.path}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      {route === '/curl' ? <CurlPage /> : <MarkdownPage />}
    </div>
  )
}

export default App
