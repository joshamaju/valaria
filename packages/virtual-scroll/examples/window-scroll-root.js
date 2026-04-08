// @ts-check

import { appendMany, createCard, createExampleShell } from './shared.js'

const context = createExampleShell(
  'Window Scroll Root',
  'The host uses the page viewport as its scroll root via scroll-root="window".',
)

const topSpacer = document.createElement('div')
topSpacer.className = 'window-spacer notice'
topSpacer.textContent = 'Scroll the page until the virtual-scroll host enters and leaves the viewport.'

context.outlet.append(topSpacer)

context.host.setAttribute('axis', 'vertical')
context.host.setAttribute('scroll-root', 'window')
context.host.setAttribute('overscan', '300')
context.host.style.display = 'block'
context.host.style.padding = '12px'

appendMany(
  context.host,
  Array.from({ length: 30 }, (_, index) => createCard(index, 'Visibility is computed against the window viewport.')),
)

context.outlet.append(context.host)

const bottomSpacer = document.createElement('div')
bottomSpacer.className = 'window-spacer notice'
bottomSpacer.textContent = 'More page content below the virtualized host.'
context.outlet.append(bottomSpacer)
