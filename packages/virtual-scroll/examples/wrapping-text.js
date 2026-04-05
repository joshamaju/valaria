// @ts-check

import { applyVerticalHostStyles, createExampleShell, mountHost } from './shared.js'

const context = createExampleShell(
  'Wrapping Text',
  'Variable-height children driven by container width and line wrapping.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '260')

for (let index = 0; index < 22; index += 1) {
  const block = document.createElement('article')
  block.className = 'stack-card'
  block.innerHTML = `
    <h3>Paragraph ${index + 1}</h3>
    <p>
      This example intentionally varies line length so the premeasurement path has to respect
      container width. Item ${index + 1} contains repeated prose:
      ${'Long-form content changes measured height. '.repeat((index % 5) + 2)}
    </p>
  `
  context.host.append(block)
}

mountHost(context, context.host)
