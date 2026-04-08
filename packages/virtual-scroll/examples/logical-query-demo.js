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
  'Logical Query Demo',
  'Host-scoped DOM APIs reflect logical direct children even when some are parked.',
)

const output = document.createElement('output')
output.className = 'caption'

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '0')

appendMany(
  context.host,
  Array.from({ length: 18 }, (_, index) => {
    const card = createCard(index)
    if (index === 15) {
      const marker = document.createElement('strong')
      marker.className = 'query-target'
      marker.textContent = ' logical target '
      card.append(marker)
    }
    return card
  }),
)

context.controls.append(
  createButton('children.length', () => {
    output.value = `children.length = ${context.host.children.length}`
  }),
  createButton('childNodes.length', () => {
    output.value = `childNodes.length = ${context.host.childNodes.length}`
  }),
  createButton(
    'querySelector',
    () => {
      const result = context.host.querySelector('.query-target')
      output.value = `querySelector('.query-target') => ${result?.textContent?.trim() ?? 'null'}`
    },
    'alt',
  ),
)

context.outlet.append(output)
mountHost(context, context.host)
