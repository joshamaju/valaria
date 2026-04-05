// @ts-check

import {
  appendMany,
  createButton,
  createChip,
  createExampleShell,
  mountHost,
} from './shared.js'

const ROWS = 18
const CELLS_PER_ROW = 28

const context = createExampleShell(
  'Nested 2D Composition',
  'An outer vertical virtual scroller owns row virtualization while inner horizontal virtual scrollers share the outer host as their horizontal scroll root.',
)

context.host.setAttribute('axis', 'vertical')
context.host.setAttribute('overscan', '280')
context.host.className = 'matrix-host'
context.host.id = 'matrix-host'

/**
 * @param {number} rowIndex
 * @returns {HTMLElement}
 */
function createRow(rowIndex) {
  const row = document.createElement('section')
  row.className = 'matrix-row'

  const header = document.createElement('header')
  header.className = 'matrix-row__header'
  header.innerHTML = `
    <h3>Row ${rowIndex + 1}</h3>
    <p>
      Inner horizontal virtualization shares the outer host as the horizontal scroll root.
    </p>
  `

  const strip = /** @type {HTMLElement & {
   *   axis: 'vertical' | 'horizontal'
   *   overscan: number
   *   scrollRoot: Window | Element
   *   keepAlive: ((child: Node) => boolean) | null
   * }} */ (
    /** @type {unknown} */ (document.createElement('virtual-scroll'))
  )
  strip.className = 'matrix-strip'
  strip.setAttribute('axis', 'horizontal')
  strip.setAttribute('scroll-root', '#matrix-host')
  strip.setAttribute('overscan', '420')

  appendMany(
    strip,
    Array.from({ length: CELLS_PER_ROW }, (_, cellIndex) => {
      const chip = createChip(rowIndex * CELLS_PER_ROW + cellIndex)
      chip.style.width = `${180 + (cellIndex % 4) * 40}px`

      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = cellIndex % 3 === 0 ? 'Pin' : 'Inspect'
      button.addEventListener('click', () => {
        chip.classList.toggle('chip-active')
      })
      chip.append(button)
      return chip
    }),
  )

  row.append(header, strip)
  return row
}

appendMany(context.host, Array.from({ length: ROWS }, (_, rowIndex) => createRow(rowIndex)))

context.controls.append(
  createButton('Scroll Rows Down', () => {
    context.host.scrollBy({ top: 700, behavior: 'smooth' })
  }),
  createButton('Scroll Right', () => {
    context.host.scrollBy({ left: 900, behavior: 'smooth' })
  }),
  createButton(
    'Last Row Into View',
    () => {
      context.host.lastElementChild?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    'alt',
  ),
)

mountHost(context, context.host)
