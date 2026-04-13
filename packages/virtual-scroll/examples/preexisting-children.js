// @ts-check

import { applyVerticalHostStyles, createCard, createExampleShell, mountHost } from './shared.js'

const context = createExampleShell(
  'Preexisting Children',
  'Children are authored before the host is connected, then virtualized during upgrade and connection.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '160')

for (let index = 0; index < 20; index += 1) {
  context.host.append(createCard(index, 'This child existed before the host entered the document.'))
}

mountHost(context, context.host)
