// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createCard,
  createExampleShell,
  mountHost,
  setDebugMirror,
} from './shared.js'

const context = createExampleShell(
  'Debug Introspection',
  'Mirrors host debug attributes so mounted range and anchor state are visible during scrolling.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '220')
appendMany(
  context.host,
  Array.from({ length: 28 }, (_, index) =>
    createCard(index, 'Scroll this host and watch the debug attributes update.'),
  ),
)

const debugPanel = document.createElement('div')
debugPanel.className = 'chrome debug-panel'
context.outlet.append(debugPanel)

mountHost(context, context.host)
setDebugMirror(context.host, debugPanel)
