// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createButton,
  createExampleShell,
  createRemoteMediaCard,
  mountHost,
} from './shared.js'

const context = createExampleShell(
  'Remote Media Gallery',
  'A vertical gallery that uses remote images so image loading and direct-child resize observation happen under real network conditions.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '360')

const status = document.createElement('output')
status.textContent = '18 remote media cards'

const addButton = createButton('Add Item', () => {
  const index = context.host.childNodes.length
  context.host.append(createRemoteMediaCard(index))
  status.textContent = `${context.host.childNodes.length} remote media cards`
})

const shuffleButton = createButton(
  'Move First To End',
  () => {
    const first = context.host.firstChild
    if (first) {
      context.host.append(first)
    }
  },
  'alt',
)

context.controls.append(addButton, shuffleButton, status)

appendMany(context.host, Array.from({ length: 18 }, (_, index) => createRemoteMediaCard(index)))
mountHost(context, context.host)
