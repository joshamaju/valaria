// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createButton,
  createExampleShell,
  createMediaCard,
  mountHost,
} from './shared.js'

const context = createExampleShell(
  'Media Gallery',
  'A media-heavy vertical example with responsive images, captions, and variable card heights.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '340')

const status = document.createElement('output')
status.textContent = '24 media cards'

const addButton = createButton('Add Item', () => {
  const index = context.host.childNodes.length
  context.host.append(createMediaCard(index))
  status.textContent = `${context.host.childNodes.length} media cards`
})

const trimButton = createButton(
  'Trim Last',
  () => {
    const last = context.host.lastChild
    if (last) {
      last.remove()
    }
    status.textContent = `${context.host.childNodes.length} media cards`
  },
  'alt',
)

context.controls.append(addButton, trimButton, status)

appendMany(context.host, Array.from({ length: 24 }, (_, index) => createMediaCard(index)))
mountHost(context, context.host)
