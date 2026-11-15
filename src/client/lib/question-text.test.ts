import { describe, expect, it } from 'vitest'
import { questionAsText } from './question-text'

describe('questionAsText', () => {
  it('gives the question and its options while it is still being answered, with nothing that gives it away', () => {
    expect(
      questionAsText({
        bodyMd: 'What does this print?\n\n```java\nSystem.out.println(1 + 2);\n```',
        multi: false,
        options: [
          { label: 'A', bodyMd: '3', state: 'selected', explanationMd: 'Because 1 + 2 is 3.' },
          { label: 'B', bodyMd: '12', state: 'idle' },
        ],
        explanationMd: 'Not shown yet.',
      }),
    ).toBe('What does this print?\n\n```java\nSystem.out.println(1 + 2);\n```\n\n(Choose one.)\n\nA. 3\nB. 12\n')
  })

  it('adds what shows once answered: the tags, the verdict and every explanation', () => {
    expect(
      questionAsText({
        bodyMd: 'Choose two.',
        multi: true,
        options: [
          { label: 'A', bodyMd: 'alpha', state: 'correct-chosen', explanationMd: 'Right.' },
          { label: 'B', bodyMd: 'beta', state: 'wrong-chosen', explanationMd: 'Wrong,\nbecause.' },
          { label: 'C', bodyMd: 'gamma', state: 'correct-missed' },
          { label: 'D', bodyMd: 'delta', state: 'neutral' },
        ],
        verdict: 'incorrect',
        explanationMd: 'A and C.',
      }),
    ).toBe(
      [
        'Choose two.',
        '',
        '(Choose all that apply.)',
        '',
        'A. alpha [Your answer, correct]',
        '   Right.',
        'B. beta [Your answer, wrong]',
        '   Wrong,',
        '   because.',
        'C. gamma [Missed answer, correct]',
        'D. delta',
        '',
        'Result: Incorrect',
        '',
        'Explanation:',
        'A and C.',
        '',
      ].join('\n'),
    )
  })

  it('marks options with no letter with a dash, and keeps a long option together', () => {
    expect(
      questionAsText({
        bodyMd: 'Which?',
        multi: false,
        options: [{ bodyMd: 'line one\nline two', state: 'correct-missed' }],
        verdict: 'revealed',
      }),
    ).toBe(
      'Which?\n\n(Choose one.)\n\n- line one\n   line two [Missed answer, correct]\n\nResult: Revealed without answering\n',
    )
  })
})
