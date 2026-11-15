import { describe, expect, it } from 'vitest'
import { isForShortcuts } from './shortcuts'

function press(key: string, target: HTMLElement) {
  document.body.append(target)
  const event = new KeyboardEvent('keydown', { key })
  Object.defineProperty(event, 'target', { value: target })
  target.remove()
  return isForShortcuts(event)
}

describe('isForShortcuts', () => {
  it('takes keys pressed on the page', () => {
    expect(press('1', document.createElement('div'))).toBe(true)
  })

  it('leaves keys alone inside a dialog or a menu, such as a code block shown full screen', () => {
    for (const role of ['dialog', 'menu']) {
      const box = document.createElement('div')
      box.setAttribute('role', role)
      const inside = document.createElement('div')
      box.append(inside)
      document.body.append(box)
      const event = new KeyboardEvent('keydown', { key: '1' })
      Object.defineProperty(event, 'target', { value: inside })
      expect(isForShortcuts(event)).toBe(false)
      box.remove()
    }
  })
})
