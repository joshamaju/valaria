// @ts-check

import { appendMany, createButton, createExampleShell, mountHost } from './shared.js'

const ROWS = 24
const COLUMNS = 18

const context = createExampleShell(
  'Spreadsheet Grid',
  'Nested composition with an outer vertical virtual scroller and inner horizontal virtual scrollers rendered as CSS grids.',
)

context.host.setAttribute('axis', 'vertical')
context.host.setAttribute('overscan', '260')
context.host.className = 'sheet-host'
context.host.id = 'sheet-host'

/**
 * @param {number} rowIndex
 * @returns {HTMLElement}
 */
function createSheetRow(rowIndex) {
  const row = document.createElement('section')
  row.className = 'sheet-row'

  const rowLabel = document.createElement('div')
  rowLabel.className = 'sheet-row-label'
  rowLabel.textContent = `Row ${rowIndex + 1}`

  const strip = /** @type {HTMLElement & {
   *   axis: 'vertical' | 'horizontal'
   *   overscan: number
   *   scrollRoot: Window | Element
   *   keepAlive: ((child: Node) => boolean) | null
   * }} */ (
    /** @type {unknown} */ (document.createElement('virtual-scroll'))
  )
  strip.className = 'sheet-strip'
  strip.setAttribute('axis', 'horizontal')
  strip.setAttribute('scroll-root', '#sheet-host')
  strip.setAttribute('overscan', '420')

  appendMany(
    strip,
    Array.from({ length: COLUMNS }, (_, columnIndex) => {
      const cell = document.createElement('div')
      cell.className = 'sheet-cell'
      cell.style.width = `${140 + (columnIndex % 4) * 24}px`
      cell.innerHTML = `
        <strong>${String.fromCharCode(65 + (columnIndex % 26))}${rowIndex + 1}</strong>
        <span>${(rowIndex + 1) * (columnIndex + 3)}</span>
      `
      return cell
    }),
  )

  row.append(rowLabel, strip)
  return row
}

appendMany(context.host, Array.from({ length: ROWS }, (_, rowIndex) => createSheetRow(rowIndex)))

context.controls.append(
  createButton('Scroll Rows Down', () => {
    context.host.scrollBy({ top: 900, behavior: 'smooth' })
  }),
  createButton('Scroll Columns Right', () => {
    context.host.scrollBy({ left: 960, behavior: 'smooth' })
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
