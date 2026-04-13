// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createButton,
  createExampleShell,
} from './shared.js'

const ROWS = 120

const context = createExampleShell(
  'Faux Table',
  'A table-like layout built from direct child row wrappers instead of native table sections.',
)

const shell = document.createElement('section')
shell.className = 'table-shell'

const header = document.createElement('div')
header.className = 'table-head'
header.innerHTML = `
  <div>Name</div>
  <div>Status</div>
  <div>Updated</div>
  <div>Owner</div>
`

applyVerticalHostStyles(context.host)
context.host.classList.add('table-body')
context.host.setAttribute('overscan', '220')

/**
 * @param {number} index
 * @returns {HTMLElement}
 */
function createRow(index) {
  const row = document.createElement('article')
  row.className = 'table-row'
  row.innerHTML = `
    <div class="table-cell table-primary">Dataset ${index + 1}</div>
    <div class="table-cell">${index % 3 === 0 ? 'Ready' : index % 3 === 1 ? 'Running' : 'Queued'}</div>
    <div class="table-cell">${index % 2 === 0 ? 'Today' : 'Yesterday'}</div>
    <div class="table-cell">${['Ada', 'Grace', 'Linus', 'Margaret'][index % 4]}</div>
  `
  return row
}

appendMany(context.host, Array.from({ length: ROWS }, (_, index) => createRow(index)))

context.controls.append(
  createButton('Scroll Top', () => {
    context.host.scrollTo({ top: 0, behavior: 'smooth' })
  }),
  createButton('Scroll Down 1200', () => {
    context.host.scrollBy({ top: 1200, behavior: 'smooth' })
  }),
  createButton(
    'Last Row Into View',
    () => {
      context.host.lastElementChild?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    'alt',
  ),
)

context.outlet.append(shell)
shell.append(header, context.host)
