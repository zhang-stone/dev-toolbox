export interface AxiosRequestShape {
  method: string
  url: string
  headers?: Record<string, string>
  params?: Record<string, unknown>
  data?: unknown
  auth?: {
    username: string
    password: string
  }
}

export interface CurlToAxiosResult {
  code: string
  errors: string[]
  warnings: string[]
  request?: AxiosRequestShape
}

export type CurlToFetchResult = CurlToAxiosResult

interface ParsedCurlResult {
  errors: string[]
  warnings: string[]
  request?: AxiosRequestShape
}

const OPTIONS_WITH_VALUE = new Set([
  '-X',
  '--request',
  '-H',
  '--header',
  '-d',
  '--data',
  '--data-raw',
  '--data-binary',
  '--data-urlencode',
  '--json',
  '--url',
  '-u',
  '--user',
  '-A',
  '--user-agent',
  '-b',
  '--cookie',
])

export function convertCurlToAxios(raw: string): CurlToAxiosResult {
  const result = parseCurlRequest(raw)

  return {
    code: result.request ? toAxiosCode(result.request) : '',
    errors: result.errors,
    warnings: result.warnings,
    request: result.request,
  }
}

export function convertCurlToFetch(raw: string): CurlToFetchResult {
  const result = parseCurlRequest(raw)
  const warnings = [...result.warnings]

  if (result.request?.auth) {
    warnings.push('Fetch 请求已将 basic auth 转为 Authorization header，浏览器环境请确认 btoa 可用')
  }

  return {
    code: result.request ? toFetchCode(result.request) : '',
    errors: result.errors,
    warnings,
    request: result.request,
  }
}

function parseCurlRequest(raw: string): ParsedCurlResult {
  const input = raw.trim()

  if (!input) {
    return {
      errors: ['请输入 curl 命令'],
      warnings: [],
    }
  }

  const tokensResult = tokenizeCurl(input)
  if (tokensResult.errors.length > 0) {
    return {
      errors: tokensResult.errors,
      warnings: tokensResult.warnings,
    }
  }

  const tokens = tokensResult.tokens[0] === 'curl'
    ? tokensResult.tokens.slice(1)
    : tokensResult.tokens
  const errors: string[] = tokensResult.tokens[0] === 'curl'
    ? []
    : ['命令需要以 curl 开头']
  const warnings = [...tokensResult.warnings]
  const headers: Record<string, string> = {}
  const dataParts: string[] = []
  let method = ''
  let url = ''
  let useGetParams = false
  let auth: AxiosRequestShape['auth']

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const inline = splitInlineOption(token)
    const option = inline?.option ?? token
    const inlineValue = inline?.value

    if (option === '-X' || option === '--request') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value) method = value.value.toUpperCase()
      else errors.push(`${option} 缺少请求方法`)
      continue
    }

    if (option === '-H' || option === '--header') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value) addHeader(headers, value.value, warnings)
      else errors.push(`${option} 缺少 header 内容`)
      continue
    }

    if (
      option === '-d'
      || option === '--data'
      || option === '--data-raw'
      || option === '--data-binary'
      || option === '--data-urlencode'
    ) {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value !== undefined) dataParts.push(value.value)
      else errors.push(`${option} 缺少请求体内容`)
      if (!method) method = 'POST'
      continue
    }

    if (option === '--json') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value !== undefined) dataParts.push(value.value)
      else errors.push('--json 缺少 JSON 内容')
      headers['Content-Type'] ??= 'application/json'
      headers.Accept ??= 'application/json'
      if (!method) method = 'POST'
      continue
    }

    if (option === '--url') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value) url = value.value
      else errors.push('--url 缺少 URL')
      continue
    }

    if (option === '-u' || option === '--user') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value !== undefined) auth = parseAuth(value.value)
      else errors.push(`${option} 缺少认证信息`)
      continue
    }

    if (option === '-A' || option === '--user-agent') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value) headers['User-Agent'] = value.value
      else errors.push(`${option} 缺少 User-Agent`)
      continue
    }

    if (option === '-b' || option === '--cookie') {
      const value = readOptionValue(tokens, i, inlineValue)
      if (value.nextIndex !== i) i = value.nextIndex
      if (value.value) {
        headers.Cookie = headers.Cookie
          ? `${headers.Cookie}; ${value.value}`
          : value.value
      } else {
        errors.push(`${option} 缺少 Cookie`)
      }
      continue
    }

    if (option === '-I' || option === '--head') {
      method = 'HEAD'
      continue
    }

    if (option === '-G' || option === '--get') {
      useGetParams = true
      if (!method) method = 'GET'
      continue
    }

    if (token.startsWith('-')) {
      warnings.push(`暂未支持参数：${token}`)
      if (OPTIONS_WITH_VALUE.has(option) && inlineValue === undefined && tokens[i + 1]) {
        i += 1
      }
      continue
    }

    if (!url) {
      url = token
    } else {
      warnings.push(`忽略多余参数：${token}`)
    }
  }

  if (!url) errors.push('未找到请求 URL')

  const normalizedUrl = normalizeUrl(url)
  const dataParams = useGetParams ? parseParams(dataParts.join('&')) : undefined
  const params = mergeParams(normalizedUrl.params, dataParams)
  const data = !useGetParams && dataParts.length > 0
    ? parseData(dataParts.join('&'), headers)
    : undefined

  if (!method) method = data === undefined ? 'GET' : 'POST'

  if (errors.length > 0) {
    return {
      errors,
      warnings,
    }
  }

  const request: AxiosRequestShape = {
    method: method.toLowerCase(),
    url: normalizedUrl.url,
  }

  if (Object.keys(headers).length > 0) request.headers = headers
  if (params && Object.keys(params).length > 0) request.params = params
  if (data !== undefined) request.data = data
  if (auth) request.auth = auth

  return {
    errors: [],
    warnings,
    request,
  }
}

export function tokenizeCurl(raw: string): {
  tokens: string[]
  errors: string[]
  warnings: string[]
} {
  const text = raw.replace(/\\\r?\n/g, ' ')
  const tokens: string[] = []
  const errors: string[] = []
  const warnings: string[] = []
  let current = ''
  let quote: '"' | "'" | '' = ''

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (quote === "'") {
      if (char === "'") quote = ''
      else current += char
      continue
    }

    if (quote === '"') {
      if (char === '"') {
        quote = ''
      } else if (char === '\\') {
        i += 1
        current += text[i] ?? ''
      } else {
        current += char
      }
      continue
    }

    if (char === "'" || char === '"') {
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    if (char === '\\') {
      i += 1
      current += text[i] ?? ''
      continue
    }

    current += char
  }

  if (quote) errors.push('引号没有闭合')
  if (current) tokens.push(current)

  return { tokens, errors, warnings }
}

function splitInlineOption(token: string): { option: string, value: string } | undefined {
  if (!token.startsWith('--')) return undefined

  const index = token.indexOf('=')
  if (index === -1) return undefined

  return {
    option: token.slice(0, index),
    value: token.slice(index + 1),
  }
}

function readOptionValue(
  tokens: string[],
  index: number,
  inlineValue: string | undefined,
): { value: string | undefined, nextIndex: number } {
  if (inlineValue !== undefined) {
    return { value: inlineValue, nextIndex: index }
  }

  return {
    value: tokens[index + 1],
    nextIndex: index + 1,
  }
}

function addHeader(
  headers: Record<string, string>,
  header: string,
  warnings: string[],
): void {
  const index = header.indexOf(':')

  if (index === -1) {
    warnings.push(`忽略非法 header：${header}`)
    return
  }

  const key = header.slice(0, index).trim()
  const value = header.slice(index + 1).trim()

  if (!key) {
    warnings.push(`忽略非法 header：${header}`)
    return
  }

  headers[key] = value
}

function parseAuth(value: string): NonNullable<AxiosRequestShape['auth']> {
  const index = value.indexOf(':')

  if (index === -1) {
    return {
      username: value,
      password: '',
    }
  }

  return {
    username: value.slice(0, index),
    password: value.slice(index + 1),
  }
}

function parseData(value: string, headers: Record<string, string>): unknown {
  const contentType = findHeader(headers, 'content-type')

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    return parseParams(value)
  }

  if (contentType?.includes('application/json') || looksLikeJson(value)) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value
}

function normalizeUrl(url: string): { url: string, params?: Record<string, unknown> } {
  if (!url.includes('?')) return { url }

  try {
    const parsed = new URL(url, 'http://curl.local')
    const normalizedUrl = url.startsWith('http')
      ? `${parsed.origin}${parsed.pathname}${parsed.hash}`
      : `${parsed.pathname}${parsed.hash}`
    const params: Record<string, unknown> = {}

    parsed.searchParams.forEach((value, key) => {
      appendParam(params, key, parseParamValue(value))
    })

    return {
      url: normalizedUrl,
      params,
    }
  } catch {
    const [baseUrl, query = ''] = url.split('?')

    return {
      url: baseUrl,
      params: parseParams(query),
    }
  }
}

function mergeParams(
  first: Record<string, unknown> | undefined,
  second: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!first && !second) return undefined

  const params: Record<string, unknown> = {}

  for (const source of [first, second]) {
    if (!source) continue

    for (const [key, value] of Object.entries(source)) {
      appendParam(params, key, value)
    }
  }

  return params
}

function parseParams(value: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  for (const pair of value.split('&')) {
    if (!pair) continue

    const index = pair.indexOf('=')
    const key = decodeParam(index === -1 ? pair : pair.slice(0, index))
    const paramValue = parseParamValue(index === -1 ? '' : pair.slice(index + 1))

    appendParam(params, key, paramValue)
  }

  return params
}

function appendParam(
  params: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const existing = params[key]

  if (existing === undefined) {
    params[key] = value
  } else if (Array.isArray(existing)) {
    existing.push(value)
  } else {
    params[key] = [existing, value]
  }
}

function decodeParam(value: string): string {
  const normalized = value.replace(/\+/g, ' ')

  try {
    return decodeURIComponent(normalized)
  } catch {
    return new URLSearchParams(`value=${value}`).get('value') ?? normalized
  }
}

function parseParamValue(value: string): unknown {
  const decoded = decodeParam(value)

  if (looksLikeJson(decoded)) {
    try {
      return JSON.parse(decoded)
    } catch {
      return decoded
    }
  }

  return decoded
}

function findHeader(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase()
  const key = Object.keys(headers).find(item => item.toLowerCase() === target)

  return key ? headers[key] : undefined
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim()

  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

function toAxiosCode(request: AxiosRequestShape): string {
  const lines = [
    'axios({',
    `  method: ${toCodeValue(request.method)},`,
    `  url: ${toCodeValue(request.url)},`,
  ]

  if (request.headers) lines.push(`  headers: ${toCodeValue(request.headers, 2)},`)
  if (request.params) lines.push(`  params: ${toCodeValue(request.params, 2)},`)
  if (request.data !== undefined) lines.push(`  data: ${toCodeValue(request.data, 2)},`)
  if (request.auth) lines.push(`  auth: ${toCodeValue(request.auth, 2)},`)

  lines.push('})')

  return lines.join('\n')
}

function toFetchCode(request: AxiosRequestShape): string {
  const lines: string[] = []
  const urlValue = toFetchUrlCode(request)

  lines.push(`fetch(${urlValue}, {`)
  lines.push(`  method: ${toCodeValue(request.method.toUpperCase())},`)

  const headersCode = toFetchHeadersCode(request)
  if (headersCode) lines.push(`  headers: ${headersCode},`)

  const bodyCode = toFetchBodyCode(request)
  if (bodyCode) lines.push(`  body: ${bodyCode},`)

  lines.push('})')

  return lines.join('\n')
}

function toFetchUrlCode(request: AxiosRequestShape): string {
  if (!request.params || Object.keys(request.params).length === 0) {
    return toCodeValue(request.url)
  }

  const queryParts: string[] = []

  for (const [key, value] of Object.entries(request.params)) {
    const values = Array.isArray(value) ? value : [value]

    for (const item of values) {
      queryParts.push(`${key}=${toQueryText(item)}`)
    }
  }

  const separator = request.url.includes('?') ? '&' : '?'
  const url = `${request.url}${separator}${queryParts.join('&')}`

  return `\`${escapeTemplateString(url)}\``
}

function toQueryText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  return JSON.stringify(value)
}

function toFetchHeadersCode(request: AxiosRequestShape): string | undefined {
  const headers = request.headers ?? {}
  const entries = Object.entries(headers)

  if (entries.length === 0 && !request.auth) return undefined

  const lines = ['{']

  for (const [key, value] of entries) {
    lines.push(`    ${quoteObjectKey(key)}: ${toCodeValue(value)},`)
  }

  if (request.auth) {
    const authValue = `${request.auth.username}:${request.auth.password}`
    lines.push(`    Authorization: 'Basic ' + btoa(${toCodeValue(authValue)}),`)
  }

  lines.push('  }')

  return lines.join('\n')
}

function toFetchBodyCode(request: AxiosRequestShape): string | undefined {
  if (request.data === undefined) return undefined

  const contentType = request.headers
    ? findHeader(request.headers, 'content-type')
    : undefined

  if (
    contentType?.includes('application/x-www-form-urlencoded')
    && isPlainRecord(request.data)
  ) {
    return [
      'new URLSearchParams(',
      `    Object.entries(${toCodeValue(request.data, 4)}).map(([key, value]) => [`,
      '      key,',
      "      typeof value === 'string' ? value : JSON.stringify(value),",
      '    ]),',
      '  )',
    ].join('\n')
  }

  if (typeof request.data === 'string') {
    return toCodeValue(request.data)
  }

  return `JSON.stringify(${toCodeValue(request.data, 2)})`
}

function toCodeValue(value: unknown, indent = 0): string {
  if (typeof value === 'string') return quoteString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'

  if (Array.isArray(value)) {
    return `[${value.map(item => toCodeValue(item, indent)).join(', ')}]`
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const entries = Object.entries(record)

    if (entries.length === 0) return '{}'

    const padding = ' '.repeat(indent)
    const childPadding = ' '.repeat(indent + 2)
    const body = entries
      .map(([key, item]) => `${childPadding}${quoteObjectKey(key)}: ${toCodeValue(item, indent + 2)},`)
      .join('\n')

    return `{\n${body}\n${padding}}`
  }

  return 'undefined'
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function quoteString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function escapeTemplateString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}

function quoteObjectKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : quoteString(key)
}
