// @ts-check

import { appendMany, applyHorizontalHostStyles, createChip, createExampleShell, mountHost } from './shared.js'

const context = createExampleShell(
  'Basic Horizontal',
  'A horizontally virtualized strip with authored widths and native inline layout.',
)

applyHorizontalHostStyles(context.host)
context.host.setAttribute('overscan', '320')

appendMany(context.host, Array.from({ length: 24 }, (_, index) => createChip(index)))

mountHost(context, context.host)
