// @ts-check

import { appendMany, applyVerticalHostStyles, createButton, createCard, createExampleShell } from './shared.js'

const context = createExampleShell(
  'External Scroll Root',
  'The host is observed from an outer scrolling panel instead of scrolling itself.',
)

const scrollRoot = document.createElement('section')
scrollRoot.className = 'external-scroll-root'
scrollRoot.id = 'external-root'

const lead = document.createElement('div')
lead.className = 'notice'
lead.textContent = 'Scroll this panel. The virtual-scroll host itself is not the scroll root.'

const spacer = document.createElement('div')
spacer.style.height = '280px'

applyVerticalHostStyles(context.host)
context.host.removeAttribute('class')
context.host.style.display = 'block'
context.host.style.padding = '12px'
context.host.style.margin = '0'
context.host.setAttribute('scroll-root', '#external-root')
context.host.setAttribute('overscan', '220')

appendMany(
  context.host,
  Array.from({ length: 26 }, (_, index) => createCard(index, 'Observed through a different scrolling container.')),
)

context.controls.append(
  createButton('Proxy To Top', () => {
    context.host.scrollTo({ top: 0, behavior: 'smooth' })
  }),
  createButton('Proxy Down 600', () => {
    context.host.scrollBy({ top: 600, behavior: 'smooth' })
  }),
  createButton(
    'Proxy Last Into View',
    () => {
      const target = context.host.lastElementChild
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    'alt',
  ),
)

scrollRoot.append(lead, spacer, context.host)
context.outlet.append(scrollRoot)
