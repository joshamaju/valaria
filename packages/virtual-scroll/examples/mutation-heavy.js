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
  'Mutation Heavy',
  'Append, prepend, replace, and remove direct children while the host stays virtualized.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '180')
appendMany(context.host, Array.from({ length: 16 }, (_, index) => createCard(index)))

let nextIndex = 17

context.controls.append(
  createButton('Append', () => {
    context.host.append(createCard(nextIndex, 'Appended during runtime reconciliation.'))
    nextIndex += 1
  }),
  createButton('Prepend', () => {
    context.host.prepend(createCard(nextIndex, 'Prepended before the current logical first child.'))
    nextIndex += 1
  }),
  createButton(
    'Remove First',
    () => {
      if (context.host.firstChild) {
        context.host.removeChild(context.host.firstChild)
      }
    },
    'alt',
  ),
  createButton(
    'Replace Third',
    () => {
      const target = context.host.childNodes.item(2)
      if (target) {
        context.host.replaceChild(createCard(nextIndex, 'This node replaced the prior third logical child.'), target)
        nextIndex += 1
      }
    },
    'alt',
  ),
)

mountHost(context, context.host)
