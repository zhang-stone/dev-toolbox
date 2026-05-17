import { useCallback, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { formatMarkdown } from '../utils/formatter'

const EXAMPLE_MARKDOWN = `### 全文总结概括： 颜婷回复秦琴：判责单490770325，轻微损包裹JDVG05211429686-1-2-责任已确认为白银平川站，请秦琴审核。 ### 全文重点： 1. 判责单号：490770325，责任方锁定白银平川站 2. 包裹号：JDVG05211429686-1-2-，轻微损防御性上报已生成理赔订单 3. 审核请求：秦琴需完成最终审核 ### 待处理事项： 无待处理事项`

export function MarkdownPage() {
  const [input, setInput] = useState(EXAMPLE_MARKDOWN)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(true)

  const formatted = formatMarkdown(input)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [formatted])

  return (
    <main className="panels">
      <section className="panel">
        <div className="panel-header">
          <h2>原始文本</h2>
        </div>
        <textarea
          className="input-area"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="在此粘贴需要格式化的文本..."
          spellCheck={false}
        />
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>格式化结果</h2>
          <div className="btn-group">
            <button
              className={`toggle-btn ${!preview ? 'btn-active' : ''}`}
              onClick={() => setPreview(false)}
            >
              源码
            </button>
            <button
              className={`toggle-btn ${preview ? 'btn-active' : ''}`}
              onClick={() => setPreview(true)}
            >
              预览
            </button>
            <button
              className="copy-btn"
              onClick={handleCopy}
              disabled={!formatted}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
        {preview ? (
          <div className="preview-area markdown-body">
            {formatted ? (
              <ReactMarkdown>{formatted}</ReactMarkdown>
            ) : (
              <p className="placeholder">预览将显示在这里...</p>
            )}
          </div>
        ) : (
          <pre className="output-area">
            <code>{formatted || '格式化后的 Markdown 将显示在这里...'}</code>
          </pre>
        )}
      </section>
    </main>
  )
}
