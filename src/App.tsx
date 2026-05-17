import { useCallback, useEffect, useState } from 'react'
import { CurlPage } from './pages/CurlPage'
import { MarkdownPage } from './pages/MarkdownPage'
import 'github-markdown-css/github-markdown.css'
import './App.css'

type Route = '/md' | '/curl'

const ROUTES: Array<{ path: Route, label: string }> = [
  { path: '/md', label: 'Markdown' },
  { path: '/curl', label: 'curl' },
]

function getRoute(): Route {
  return window.location.pathname === '/curl' ? '/curl' : '/md'
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute)

  useEffect(() => {
    if (window.location.pathname !== route) {
      window.history.replaceState(null, '', route)
    }

    const handlePopState = () => setRoute(getRoute())
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [route])

  const navigate = useCallback((nextRoute: Route) => {
    if (nextRoute === route) return

    window.history.pushState(null, '', nextRoute)
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
