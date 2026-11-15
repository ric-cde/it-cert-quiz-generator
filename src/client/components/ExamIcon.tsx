import clsx from 'clsx'
import { Award } from 'lucide-react'
import { examIconFor } from '@shared/exam-icons'
import { EXAM_ICON_ART } from '../icons/exam-icon-art.generated'
import { useFeature } from '@/lib/features'

const urls = new Map<string, string>()

/** The artwork as an image, not inline SVG: the logos use gradients with their own ids, which would clash. */
function artUrl(key: string) {
  const art = EXAM_ICON_ART[key]
  if (!art) return undefined
  if (!urls.has(key)) urls.set(key, `data:image/svg+xml,${encodeURIComponent(art)}`)
  return urls.get(key)
}

/**
 * The logo of what an exam is about, chosen from its subject so a subject's exams all match.
 * Decorative: the exam's name is always beside it. An exam nothing matches shows a rosette.
 * Shows nothing when Settings turns exam icons off. `icon` shows one logo by its key instead.
 */
export function ExamIcon({
  subject = '',
  name = '',
  icon,
  className = 'size-9',
}: {
  subject?: string
  name?: string
  icon?: string
  className?: string
}) {
  const enabled = useFeature('examIcons')
  if (!enabled) return null
  const key = icon ?? examIconFor(subject, name)
  const url = key ? artUrl(key) : undefined
  if (!url) return <Award className={clsx(className, 'flex-none text-ink-soft')} aria-hidden="true" />
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      data-exam-icon={key}
      className={clsx(className, 'flex-none object-contain select-none')}
    />
  )
}
