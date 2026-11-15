import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// The first render in a file loads React, the query client and the icons, which on a busy laptop
// can take longer than Testing Library's default one second for `findBy` and `waitFor`.
configure({ asyncUtilTimeout: 4000 })

afterEach(cleanup)
