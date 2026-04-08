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
  'Sticky Sections',
  'Section headers are authored direct children with data-keep-alive and native CSS position: sticky.',
)

applyVerticalHostStyles(context.host)
context.host.classList.add('sticky-host')
context.host.setAttribute('overscan', '180')

const notice = document.createElement('div')
notice.className = 'notice'
notice.textContent =
  'Sticky headers remain normal direct children. data-keep-alive keeps them mounted so native position: sticky can work while rows virtualize.'
context.outlet.append(notice)

/**
 * @param {string} label
 * @param {number} index
 * @returns {HTMLElement}
 */
function createStickyHeader(label, index) {
  const header = document.createElement('section')
  header.className = 'sticky-section-header'
  header.setAttribute('data-keep-alive', '')
  header.innerHTML = `
    <span>Section ${index + 1}</span>
    <strong>${label}</strong>
  `
  return header
}

const sections = ['Morning Queue', 'Afternoon Workbench', 'Evening Dispatch', 'Night Watch']
const children = sections.flatMap((section, sectionIndex) => {
  const header = createStickyHeader(section, sectionIndex)
  const rows = Array.from({ length: 12 }, (_, rowIndex) => {
    const itemIndex = sectionIndex * 12 + rowIndex
    const card = createCard(
      itemIndex,
      rowIndex % 3 === 0
        ? 'This row has extra copy to vary the distance between sticky headers.'
        : 'The section header above is retained and sticky.',
    )
    card.classList.add('sticky-section-row')
    return card
  })
  return [header, ...rows]
})

appendMany(context.host, children)

context.controls.append(
  createButton('Scroll Top', () => {
    context.host.scrollTo({ top: 0, behavior: 'smooth' })
  }),
  createButton('Scroll Down 900', () => {
    context.host.scrollBy({ top: 900, behavior: 'smooth' })
  }),
  createButton(
    'Scroll Last Section Into View',
    () => {
      const headers = context.host.querySelectorAll('.sticky-section-header')
      headers.item(headers.length - 1)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    'alt',
  ),
)

mountHost(context, context.host)
