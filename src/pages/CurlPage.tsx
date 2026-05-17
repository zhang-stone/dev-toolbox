import { useCallback, useMemo, useState } from 'react'
import { convertCurlToAxios, convertCurlToFetch } from '../utils/curlToAxios'

type OutputMode = 'axios' | 'fetch'

const EXAMPLE_CURL = `curl 'https://api.example.com/users?active=true' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  --data-raw '{"name":"Ada","role":"admin"}'`

export function CurlPage() {
  const [input, setInput] = useState(EXAMPLE_CURL)
  const [copied, setCopied] = useState(false)
  const [outputMode, setOutputMode] = useState<OutputMode>('axios')
  const result = useMemo(
    () => outputMode === 'axios'
      ? convertCurlToAxios(input)
      : convertCurlToFetch(input),
    [input, outputMode],
  )

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(result.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result.code])

  return (
    <main className="panels">
      <section className="panel">
        <div className="panel-header">
          <h2>cURL 命令</h2>
        </div>
        <textarea
          className="input-area"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="在此粘贴 cURL 命令..."
          spellCheck={false}
        />
      </section>
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <div className="btn-group">
              <button
                className={`toggle-btn ${outputMode === 'axios' ? 'btn-active' : ''}`}
                onClick={() => setOutputMode('axios')}
              >
                Axios
              </button>
              <button
                className={`toggle-btn ${outputMode === 'fetch' ? 'btn-active' : ''}`}
                onClick={() => setOutputMode('fetch')}
              >
                Fetch
              </button>
            </div>
          </div>
          <button
            className="copy-btn"
            onClick={handleCopy}
            disabled={!result.code}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        <div className="result-stack">
          {(result.errors.length > 0 || result.warnings.length > 0) && (
            <div className="messages">
              {result.errors.map(message => (
                <p className="message message-error" key={message}>
                  {message}
                </p>
              ))}
              {result.warnings.map(message => (
                <p className="message message-warning" key={message}>
                  {message}
                </p>
              ))}
            </div>
          )}
          <pre className="output-area">
            <code>{result.code || `转换后的 ${outputMode === 'axios' ? 'Axios' : 'Fetch'} 请求将显示在这里...`}</code>
          </pre>
        </div>
      </section>
    </main>
  )
}
