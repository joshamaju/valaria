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
  'Basic Vertical',
  'A host-scrolled vertical list with variable child heights and authored spacing.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '260')

const items = Array.from({ length: 36 }, (_, index) =>
  createCard(index, 'This example is the baseline for host-owned vertical scrolling.'),
)

appendMany(context.host, items)

context.controls.append(
  createButton('Scroll To Top', () => {
    context.host.scrollTo({ top: 0, behavior: 'smooth' })
  }),
  createButton('Scroll Down 600', () => {
    context.host.scrollBy({ top: 600, behavior: 'smooth' })
  }),
  createButton(
    'Scroll Last Into View',
    () => {
      const target = context.host.lastElementChild
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    },
    'alt',
  ),
)

mountHost(context, context.host)
