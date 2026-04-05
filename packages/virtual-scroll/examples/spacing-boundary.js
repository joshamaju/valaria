// @ts-check

import { createExampleShell } from './shared.js'

const context = createExampleShell(
  'Spacing Boundary',
  'Compares recommended non-collapsing spacing with collapsing-margin behavior that is only best-effort.',
)

const notice = document.createElement('div')
notice.className = 'notice warning'
notice.textContent =
  'Exact reconstruction of adjacency-sensitive spacing, such as collapsing margins, is documented as best-effort.'
context.outlet.append(notice)

const supported = document.createElement('virtual-scroll')
supported.setAttribute('axis', 'vertical')
supported.className = 'vertical-host'
supported.style.gap = '0'
supported.setAttribute('overscan', '180')

for (let index = 0; index < 10; index += 1) {
  const item = document.createElement('article')
  item.className = 'stack-card'
  item.style.margin = '0 0 14px'
  item.innerHTML = `<h3>Supported spacing ${index + 1}</h3><p>Non-collapsing spacing via explicit margins on each item.</p>`
  supported.append(item)
}

const bestEffort = document.createElement('virtual-scroll')
bestEffort.setAttribute('axis', 'vertical')
bestEffort.className = 'vertical-host'
bestEffort.setAttribute('overscan', '180')

for (let index = 0; index < 10; index += 1) {
  const item = document.createElement('article')
  item.className = 'stack-card'
  item.style.marginTop = '18px'
  item.style.marginBottom = '18px'
  item.innerHTML = `<h3>Best-effort spacing ${index + 1}</h3><p>Collapsing-style adjacency is intentionally documented as out of exact scope.</p>`
  bestEffort.append(item)
}

const grid = document.createElement('div')
grid.className = 'layout'
grid.append(supported, bestEffort)

context.outlet.append(grid)
