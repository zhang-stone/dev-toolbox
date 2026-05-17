import { readdirSync, readFileSync } from 'fs'
import { describe, test, expect } from 'vitest'
import { formatMarkdown } from '../src/utils/formatter'

const dir = 'tests/fixtures'
const inputs = readdirSync(dir).filter(f => f.endsWith('.txt')).sort()

describe('formatMarkdown - fixture pairs', () => {
  for (const file of inputs) {
    const name = file.replace('.txt', '')
    test(name, () => {
      const input = readFileSync(`${dir}/${file}`, 'utf-8')
      const expected = readFileSync(`${dir}/${name}.md`, 'utf-8')
      expect(formatMarkdown(input)).toBe(expected)
    })
  }
})

describe('formatMarkdown - edge cases', () => {
  test('empty string', () => {
    expect(formatMarkdown('')).toBe('')
  })

  test('whitespace only', () => {
    expect(formatMarkdown('   ')).toBe('')
  })
})
