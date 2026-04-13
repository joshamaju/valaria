// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createButton,
  createCard,
  createExampleShell,
  mountHost,
} from './shared.js'

const context = createExampleShell(
  'Intersection Observer',
  'Observed logical children resume normal IntersectionObserver behavior when they are remounted from the parking fragment.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '120')

const note = document.createElement('div')
note.className = 'notice'
note.textContent =
  'Every direct child is observed once. Parked children keep node identity, but only mounted children have meaningful intersection state.'
context.outlet.append(note)

const log = document.createElement('div')
log.className = 'observer-log'

/** @type {Map<Element, { seen: number, intersecting: boolean, ratio: number }>} */
const observations = new Map()

const items = Array.from({ length: 28 }, (_, index) => {
  const card = createCard(index, 'Scroll away and back; observer reports resume on the same node when it remounts.')
  card.classList.add('observer-card')
  card.dataset.observerIndex = String(index + 1)
  const status = document.createElement('p')
  status.className = 'child-state-note observer-card__status'
  status.textContent = 'observer: waiting'
  card.append(status)
  observations.set(card, { seen: 0, intersecting: false, ratio: 0 })
  return card
})

appendMany(context.host, items)

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const current = observations.get(entry.target)
      if (!current) {
        continue
      }

      observations.set(entry.target, {
        seen: current.seen + 1,
        intersecting: entry.isIntersecting,
        ratio: entry.intersectionRatio,
      })
    }

    renderLog()
  },
  {
    root: context.host,
    threshold: [0, 0.25, 0.75, 1],
  },
)

for (const item of items) {
  observer.observe(item)
}

function renderLog() {
  log.innerHTML = ''

  const visibleRows = items
    .filter((item) => item.parentNode === context.host)
    .slice(0, 10)

  for (const item of visibleRows) {
    const observation = observations.get(item)
    const status = item.querySelector('.observer-card__status')
    const state = observation?.intersecting ? 'intersecting' : 'not intersecting'
    const mounted = item.parentNode === context.host ? 'mounted' : 'parked'
    const ratio = observation?.ratio.toFixed(2) ?? '0.00'
    const seen = observation?.seen ?? 0
    const text = `child ${item.dataset.observerIndex}: ${mounted}, ${state}, ratio ${ratio}, callbacks ${seen}`

    if (status) {
      status.textContent = `observer: ${state}, ratio ${ratio}, callbacks ${seen}`
    }

    const line = document.createElement('div')
    line.textContent = text
    log.append(line)
  }
}

context.controls.append(
  createButton('Scroll Top', () => {
    context.host.scrollTo({ top: 0, behavior: 'smooth' })
  }),
  createButton('Scroll Down 900', () => {
    context.host.scrollBy({ top: 900, behavior: 'smooth' })
  }),
  createButton(
    'Scroll Child 24 Into View',
    () => {
      items[23]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    'alt',
  ),
)

mountHost(context, context.host)
context.outlet.append(log)

context.host.addEventListener('rangechange', renderLog)
context.host.addEventListener('scroll', renderLog, { passive: true })
renderLog()
