import { describe, expect, it } from 'vitest'
import { listenOptions } from './listen'

describe('listenOptions', () => {
  it('listens on every interface when HOST is not set', () => {
    expect(listenOptions(3000, {})).toEqual({ port: 3000, hostname: undefined, url: 'http://localhost:3000' })
  })

  it('treats a blank HOST as not set', () => {
    expect(listenOptions(3000, { HOST: '  ' }).hostname).toBeUndefined()
  })

  it('listens only on the address HOST names', () => {
    expect(listenOptions(3000, { HOST: '127.0.0.1' })).toEqual({
      port: 3000,
      hostname: '127.0.0.1',
      url: 'http://127.0.0.1:3000',
    })
  })
})
