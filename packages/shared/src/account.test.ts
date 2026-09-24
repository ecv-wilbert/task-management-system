import { describe, expect, it } from 'vitest'
import { isValidEmail, meetsPasswordRules, normalizeEmail, passwordChecks, passwordStrength } from './account.ts'

describe('email', () => {
  it('normalizes case and spaces', () => {
    expect(normalizeEmail('  Sam@Example.COM ')).toBe('sam@example.com')
  })

  it('accepts ordinary addresses', () => {
    for (const e of ['sam@example.com', 'first.last+tag@sub.example.co.uk', ' Sam@Example.com ']) {
      expect(isValidEmail(e), e).toBe(true)
    }
  })

  it('rejects typos', () => {
    for (const e of ['', 'sam', 'sam@', '@example.com', 'sam@example', 'sam@@example.com', 'sam @example.com', 'sam@example..com', 'sam@.com']) {
      expect(isValidEmail(e), e).toBe(false)
    }
  })
})

describe('password rules', () => {
  it('lists each rule with whether it is met', () => {
    expect(passwordChecks('abc').map((c) => [c.id, c.met])).toEqual([
      ['length', false],
      ['lower', true],
      ['upper', false],
      ['digit', false],
    ])
    expect(meetsPasswordRules('Tasklist9')).toBe(true)
    expect(meetsPasswordRules('tasklist9')).toBe(false)
  })
})

describe('passwordStrength', () => {
  it('scores empty and rule-breaking passwords as too weak or weak', () => {
    expect(passwordStrength('').label).toBe('Too weak')
    expect(passwordStrength('abc').label).toBe('Too weak')
    expect(passwordStrength('abcdefgh').label).toBe('Weak')
  })

  it('treats common passwords as weak even when they meet the rules', () => {
    expect(passwordStrength('Password1').label).toBe('Weak')
    expect(passwordStrength('Punchlist2026!').label).toBe('Weak')
    expect(passwordStrength('Aaaaaaaa').label).toBe('Weak')
  })

  it('rewards length and symbols', () => {
    expect(passwordStrength('Tasklist9').label).toBe('Fair')
    expect(passwordStrength('Tasklist9zebra').label).toBe('Good')
    expect(passwordStrength('Tasklist9zebra!').label).toBe('Strong')
    expect(passwordStrength('Tk9!').label).toBe('Weak')
  })
})
