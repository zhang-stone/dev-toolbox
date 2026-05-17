import { describe, expect, test } from 'vitest'
import { convertCurlToAxios, convertCurlToFetch, tokenizeCurl } from '../src/utils/curlToAxios'

describe('convertCurlToAxios', () => {
  test('converts a basic GET url', () => {
    const result = convertCurlToAxios('curl https://api.example.com/users')

    expect(result.errors).toEqual([])
    expect(result.request).toEqual({
      method: 'get',
      url: 'https://api.example.com/users',
    })
    expect(result.code).toContain("axios({")
    expect(result.code).not.toContain("import axios from 'axios'")
    expect(result.code).toContain("method: 'get'")
  })

  test('converts POST json body and headers', () => {
    const result = convertCurlToAxios(
      `curl 'https://api.example.com/users' -X POST -H 'Content-Type: application/json' -d '{"a":1}'`,
    )

    expect(result.errors).toEqual([])
    expect(result.request).toEqual({
      method: 'post',
      url: 'https://api.example.com/users',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        a: 1,
      },
    })
    expect(result.code).toContain("'Content-Type': 'application/json'")
    expect(result.code).toContain('data: {')
  })

  test('converts multiple headers, cookie, and user agent', () => {
    const result = convertCurlToAxios(
      `curl https://api.example.com -H 'Accept: application/json' -A 'Demo Client' -b 'sid=1' -b 'theme=dark'`,
    )

    expect(result.request?.headers).toEqual({
      Accept: 'application/json',
      'User-Agent': 'Demo Client',
      Cookie: 'sid=1; theme=dark',
    })
  })

  test('converts --json with default json headers', () => {
    const result = convertCurlToAxios(
      `curl --json '{"name":"Ada"}' https://api.example.com/users`,
    )

    expect(result.request).toEqual({
      method: 'post',
      url: 'https://api.example.com/users',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: {
        name: 'Ada',
      },
    })
  })

  test('moves data into params for -G requests', () => {
    const result = convertCurlToAxios(
      `curl -G https://api.example.com/search --data-urlencode 'q=hello+world' -d 'tag=one' -d 'tag=two'`,
    )

    expect(result.request).toEqual({
      method: 'get',
      url: 'https://api.example.com/search',
      params: {
        q: 'hello world',
        tag: ['one', 'two'],
      },
    })
  })

  test('decodes encoded query params and parses json values', () => {
    const result = convertCurlToAxios(
      `curl 'https://api.example.com/api?functionId=test&request=%7B%22label%22%3A%22%E8%AF%B7%E5%B8%AE%E6%88%91%22%7D'`,
    )

    expect(result.request).toEqual({
      method: 'get',
      url: 'https://api.example.com/api',
      params: {
        functionId: 'test',
        request: {
          label: '请帮我',
        },
      },
    })
    expect(result.code).toContain("label: '请帮我'")
  })

  test('keeps partially encoded query params readable when decoding is lossy', () => {
    const result = convertCurlToAxios(
      `curl 'api?functionId=joymail.searchAiRequest&agentId=94126&request=%7B%22dynamicVariable%22%3A%7B%22command%22%3A%22contractTemplate%22%2C%22label%22%3A%22%E8%AF%B7%E5%B8%AE%E6%88'`,
    )

    expect(result.errors).toEqual([])
    expect(result.request).toEqual({
      method: 'get',
      url: '/api',
      params: {
        functionId: 'joymail.searchAiRequest',
        agentId: '94126',
        request: '{"dynamicVariable":{"command":"contractTemplate","label":"请帮�',
      },
    })
    expect(result.code).toContain("request: '{\"dynamicVariable\":{\"command\":\"contractTemplate\",\"label\":\"请帮�',")
    expect(result.code).not.toContain('%7B%22dynamicVariable%22')
  })

  test('decodes form data and parses encoded json fields', () => {
    const result = convertCurlToAxios(
      `curl -X POST https://api.example.com/api -H 'content-type: application/x-www-form-urlencoded' -d 'functionId=test&body=%7B%22keyword%22%3A%22%E5%B7%A5%E4%BD%9C%E6%B2%9F%E9%80%9A%22%7D'`,
    )

    expect(result.request).toEqual({
      method: 'post',
      url: 'https://api.example.com/api',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: {
        functionId: 'test',
        body: {
          keyword: '工作沟通',
        },
      },
    })
  })

  test('converts basic auth', () => {
    const result = convertCurlToAxios(
      `curl -u user:pass https://api.example.com/private`,
    )

    expect(result.request?.auth).toEqual({
      username: 'user',
      password: 'pass',
    })
  })

  test('tokenizes quotes, spaces, and line continuations', () => {
    const result = tokenizeCurl(`curl 'https://api.example.com/a b' \\
      -H "X-Name: Ada Lovelace"`)

    expect(result).toEqual({
      tokens: [
        'curl',
        'https://api.example.com/a b',
        '-H',
        'X-Name: Ada Lovelace',
      ],
      errors: [],
      warnings: [],
    })
  })

  test('warns for unsupported options', () => {
    const result = convertCurlToAxios(
      `curl --location https://api.example.com/users`,
    )

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual(['暂未支持参数：--location'])
  })
})

describe('convertCurlToFetch', () => {
  test('converts a basic GET url', () => {
    const result = convertCurlToFetch('curl https://api.example.com/users')

    expect(result.errors).toEqual([])
    expect(result.code).toContain("fetch('https://api.example.com/users', {")
    expect(result.code).toContain("method: 'GET'")
  })

  test('converts POST json body and headers', () => {
    const result = convertCurlToFetch(
      `curl 'https://api.example.com/users' -X POST -H 'Content-Type: application/json' -d '{"a":1}'`,
    )

    expect(result.errors).toEqual([])
    expect(result.code).toContain("'Content-Type': 'application/json'")
    expect(result.code).toContain('body: JSON.stringify({')
    expect(result.code).toContain('a: 1')
  })

  test('keeps formatted params directly in the fetch url', () => {
    const result = convertCurlToFetch(
      `curl -G https://api.example.com/search --data-urlencode 'q=hello+world' -d 'tag=one' -d 'tag=two'`,
    )

    expect(result.errors).toEqual([])
    expect(result.code).toContain('fetch(`https://api.example.com/search?q=hello world&tag=one&tag=two`, {')
    expect(result.code).not.toContain('const params = new URLSearchParams()')
    expect(result.code).not.toContain('params.append')
  })

  test('formats query params from the original url', () => {
    const result = convertCurlToFetch(
      `curl 'https://api.example.com/api?functionId=test&request=%7B%22label%22%3A%22%E8%AF%B7%E5%B8%AE%E6%88%91%22%7D'`,
    )

    expect(result.errors).toEqual([])
    expect(result.code).toContain('fetch(`https://api.example.com/api?functionId=test&request={"label":"请帮我"}`, {')
    expect(result.code).not.toContain('const params = new URLSearchParams()')
    expect(result.code).not.toContain('params.append')
    expect(result.code).not.toContain('%7B%22label%22')
  })

  test('converts form data into URLSearchParams body', () => {
    const result = convertCurlToFetch(
      `curl -X POST https://api.example.com/api -H 'content-type: application/x-www-form-urlencoded' -d 'functionId=test&body=%7B%22keyword%22%3A%22%E5%B7%A5%E4%BD%9C%E6%B2%9F%E9%80%9A%22%7D'`,
    )

    expect(result.errors).toEqual([])
    expect(result.code).toContain('body: new URLSearchParams(')
    expect(result.code).toContain("keyword: '工作沟通'")
  })

  test('converts basic auth into Authorization header warning', () => {
    const result = convertCurlToFetch(
      `curl -u user:pass https://api.example.com/private`,
    )

    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Fetch 请求已将 basic auth 转为 Authorization header，浏览器环境请确认 btoa 可用')
    expect(result.code).toContain("Authorization: 'Basic ' + btoa('user:pass')")
  })
})
