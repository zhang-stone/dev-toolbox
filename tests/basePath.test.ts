import { describe, expect, test } from 'vitest'
import {
  getRouteFromPathname,
  stripBase,
  withBase,
} from '../src/utils/basePath'

describe('stripBase', () => {
  test('strips the GitHub Pages project base', () => {
    expect(stripBase('/dev-toolbox', '/dev-toolbox/')).toBe('/')
    expect(stripBase('/dev-toolbox/', '/dev-toolbox/')).toBe('/')
    expect(stripBase('/dev-toolbox/md', '/dev-toolbox/')).toBe('/md')
    expect(stripBase('/dev-toolbox/curl', '/dev-toolbox/')).toBe('/curl')
  })

  test('keeps root paths when base is /', () => {
    expect(stripBase('/md', '/')).toBe('/md')
    expect(stripBase('/curl', '/')).toBe('/curl')
  })
})

describe('withBase', () => {
  test('prefixes the GitHub Pages project base', () => {
    expect(withBase('/md', '/dev-toolbox/')).toBe('/dev-toolbox/md')
    expect(withBase('/curl', '/dev-toolbox/')).toBe('/dev-toolbox/curl')
  })

  test('keeps root paths when base is /', () => {
    expect(withBase('/md', '/')).toBe('/md')
  })
})

describe('getRouteFromPathname', () => {
  test('resolves routes under the project base', () => {
    expect(getRouteFromPathname('/dev-toolbox/', '/dev-toolbox/')).toBe('/md')
    expect(getRouteFromPathname('/dev-toolbox/md', '/dev-toolbox/')).toBe('/md')
    expect(getRouteFromPathname('/dev-toolbox/curl', '/dev-toolbox/')).toBe(
      '/curl',
    )
  })
})
