/**
 * A direct-child virtual scroller that presents a logical host DOM while maintaining
 * a smaller physical DOM made of spacers plus currently mounted authored children.
 *
 * The implementation is intentionally host-boundary scoped:
 * - only direct children are virtualized
 * - parked children live in a detached fragment
 * - host child/query/mutation APIs are patched to reflect logical children
 * - broader descendant DOM semantics stay native unless a direct-child feature
 *   requires minimal interception (for example `closest()` and `scrollIntoView()`)
 */
const DEFAULT_AXIS = 'vertical'
const DEFAULT_OVERSCAN = 400
const SPACER_ATTRIBUTE = 'data-virtual-scroll-spacer'
const HOST_TAG_NAME = 'virtual-scroll'

type Axis = 'vertical' | 'horizontal'
type ScrollRootLike = Window | Element
type ScrollRootMode = 'host' | 'external' | 'window'

interface NodeCollectionView<T extends Node> extends Iterable<T> {
  readonly length: number
  item(index: number): T | null
}

interface ElementCollectionView<T extends Element> extends Iterable<T> {
  readonly length: number
  item(index: number): T | null
  namedItem(name: string): T | null
}

interface VirtualChildRecord {
  /** Cached main-axis contribution for a logical child. */
  extent: number | null
}

interface MountedSegment {
  /** Inclusive logical start index. */
  start: number
  /** Exclusive logical end index. */
  endExclusive: number
}

interface VirtualScrollState {
  initialized: boolean
  scheduled: boolean
  isReconciling: boolean
  axis: Axis
  overscan: number
  propertyAxis: Axis | null
  propertyOverscan: number | null
  propertyScrollRoot: ScrollRootLike | null
  keepAlive: ((child: Node) => boolean) | null
  scrollRoot: ScrollRootLike
  logicalChildren: Node[]
  records: WeakMap<Node, VirtualChildRecord>
  parkingFragment: DocumentFragment
  spacers: HTMLElement[]
  measureRoot: HTMLElement
  mountedStart: number
  mountedEndExclusive: number
  anchorIndex: number
  anchorOffset: number
  focusedRetainedChild: Element | null
  focusedElement: Element | null
  focusRefreshTimer: number | null
  scrollRevision: number
  restoreScrollFrame: number | null
  cleanupScrollListener: (() => void) | null
  resizeObserver: ResizeObserver | null
  mutationObserver: MutationObserver | null
  observedElements: Set<Element>
}

/** Per-host runtime state. */
const states = new WeakMap<VirtualScrollElement, VirtualScrollState>()
/** Reverse lookup from a logical node/descendant back to its owning host. */
const logicalHostRoots = new WeakMap<Node, VirtualScrollElement>()

/**
 * Snapshot of native DOM methods/getters before any prototype patching.
 * The runtime calls back into these when it needs physical DOM behavior.
 */
const native = {
  appendChild: HTMLElement.prototype.appendChild,
  insertBefore: HTMLElement.prototype.insertBefore,
  removeChild: HTMLElement.prototype.removeChild,
  replaceChild: HTMLElement.prototype.replaceChild,
  append: HTMLElement.prototype.append,
  prepend: HTMLElement.prototype.prepend,
  replaceChildren: HTMLElement.prototype.replaceChildren,
  querySelector: HTMLElement.prototype.querySelector,
  querySelectorAll: HTMLElement.prototype.querySelectorAll,
  hasChildNodes: HTMLElement.prototype.hasChildNodes,
  getChildNodes: Object.getOwnPropertyDescriptor(Node.prototype, 'childNodes')?.get,
  getChildren: Object.getOwnPropertyDescriptor(Element.prototype, 'children')?.get,
  getFirstChild: Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild')?.get,
  getLastChild: Object.getOwnPropertyDescriptor(Node.prototype, 'lastChild')?.get,
  getFirstElementChild: Object.getOwnPropertyDescriptor(Element.prototype, 'firstElementChild')?.get,
  getLastElementChild: Object.getOwnPropertyDescriptor(Element.prototype, 'lastElementChild')?.get,
  getChildElementCount: Object.getOwnPropertyDescriptor(Element.prototype, 'childElementCount')?.get,
  getInnerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.get,
  setInnerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.set,
  getScrollTop: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')?.get,
  setScrollTop: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')?.set,
  getScrollLeft: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft')?.get,
  setScrollLeft: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft')?.set,
  scroll: Element.prototype.scroll as (...args: unknown[]) => void,
  scrollTo: Element.prototype.scrollTo as (...args: unknown[]) => void,
  scrollBy: Element.prototype.scrollBy as (...args: unknown[]) => void,
  closest: Element.prototype.closest,
  matches: Element.prototype.matches,
  setAttribute: Element.prototype.setAttribute,
  removeAttribute: Element.prototype.removeAttribute,
  toggleAttribute: Element.prototype.toggleAttribute,
  elementScrollIntoView: Element.prototype.scrollIntoView,
  elementRemove: Element.prototype.remove,
  elementBefore: Element.prototype.before,
  elementAfter: Element.prototype.after,
  elementReplaceWith: Element.prototype.replaceWith,
  characterDataRemove: CharacterData.prototype.remove,
  characterDataBefore: CharacterData.prototype.before,
  characterDataAfter: CharacterData.prototype.after,
  characterDataReplaceWith: CharacterData.prototype.replaceWith,
}

function assertDefined<T>(value: T | undefined | null, message: string): T {
  if (value == null) {
    throw new Error(message)
  }
  return value
}

function createNodeCollectionView<T extends Node>(getter: () => readonly T[]): NodeCollectionView<T> {
  return {
    get length() {
      return getter().length
    },
    item(index: number) {
      return getter()[index] ?? null
    },
    [Symbol.iterator]() {
      return getter()[Symbol.iterator]()
    },
  }
}

/** Logical `children`/`querySelectorAll(':scope > *')` views hide runtime spacers. */
function createElementCollectionView<T extends Element>(getter: () => readonly T[]): ElementCollectionView<T> {
  return {
    get length() {
      return getter().length
    },
    item(index: number) {
      return getter()[index] ?? null
    },
    namedItem(name: string) {
      return getter().find((element) => element.id === name || element.getAttribute('name') === name) ?? null
    },
    [Symbol.iterator]() {
      return getter()[Symbol.iterator]()
    },
  }
}

function isAxis(value: string | null): value is Axis {
  return value === 'vertical' || value === 'horizontal'
}

function isSpacer(node: Node): boolean {
  return node instanceof HTMLElement && node.hasAttribute(SPACER_ATTRIBUTE)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getState(host: VirtualScrollElement): VirtualScrollState {
  return assertDefined(states.get(host), 'VirtualScrollElement state was not initialized')
}

function getNodeRecord(state: VirtualScrollState, node: Node): VirtualChildRecord {
  const existing = state.records.get(node)
  if (existing) {
    return existing
  }

  const record: VirtualChildRecord = { extent: null }
  state.records.set(node, record)
  return record
}

/** Marks a logical direct child and its descendants as belonging to a host. */
function markLogicalOwnership(host: VirtualScrollElement, node: Node | null | undefined): void {
  if (!(node instanceof Node)) {
    return
  }

  logicalHostRoots.set(node, host)

  if (!(node instanceof Element)) {
    return
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
  let current: Node | null = walker.currentNode

  while (current) {
    logicalHostRoots.set(current, host)
    current = walker.nextNode()
  }
}

/** Clears logical ownership when a child leaves the host's logical child list. */
function unmarkLogicalOwnership(node: Node | null | undefined): void {
  if (!(node instanceof Node)) {
    return
  }

  logicalHostRoots.delete(node)

  if (!(node instanceof Element)) {
    return
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
  let current: Node | null = walker.currentNode

  while (current) {
    logicalHostRoots.delete(current)
    current = walker.nextNode()
  }
}

function createSpacer(position: string): HTMLElement {
  const spacer = document.createElement('virtual-scroll-spacer')
  spacer.setAttribute(SPACER_ATTRIBUTE, position)
  spacer.setAttribute('aria-hidden', 'true')
  spacer.style.pointerEvents = 'none'
  spacer.style.setProperty('overflow-anchor', 'none')
  spacer.style.flex = '0 0 auto'
  spacer.style.padding = '0'
  spacer.style.margin = '0'
  spacer.style.border = '0'
  return spacer
}

function applySpacerStyles(state: VirtualScrollState): void {
  const isVertical = state.axis === 'vertical'
  const otherExtentStyle = isVertical ? 'width' : 'height'
  const display = isVertical ? 'block' : 'inline-block'

  for (const spacer of state.spacers) {
    spacer.style.display = display
    spacer.style.setProperty(otherExtentStyle, isVertical ? '1px' : '1px')
  }
}

function ensureSpacerCount(state: VirtualScrollState, count: number): void {
  while (state.spacers.length < count) {
    state.spacers.push(createSpacer(`gap-${state.spacers.length}`))
  }
}

function resolveAxis(host: VirtualScrollElement, state: VirtualScrollState): Axis {
  if (state.propertyAxis) {
    return state.propertyAxis
  }

  const attributeValue = host.getAttribute('axis')
  return isAxis(attributeValue) ? attributeValue : DEFAULT_AXIS
}

function resolveOverscan(host: VirtualScrollElement, state: VirtualScrollState): number {
  if (state.propertyOverscan != null) {
    return Math.max(0, state.propertyOverscan)
  }

  const fromAttribute = parseFiniteNumber(host.getAttribute('overscan'))
  return Math.max(0, fromAttribute ?? DEFAULT_OVERSCAN)
}

function resolveScrollRoot(host: VirtualScrollElement, state: VirtualScrollState): ScrollRootLike {
  if (state.propertyScrollRoot) {
    return state.propertyScrollRoot
  }

  const attributeValue = host.getAttribute('scroll-root')
  if (!attributeValue) {
    return host
  }

  if (attributeValue === 'window') {
    return window
  }

  try {
    return document.querySelector(attributeValue) ?? host
  } catch {
    return host
  }
}

function getElementsOnly(state: VirtualScrollState): Element[] {
  return state.logicalChildren.filter((node): node is Element => node instanceof Element)
}

/**
 * Computes the viewport in logical main-axis coordinates.
 * The result is expressed against the total logical extent, not just mounted DOM.
 */
function getViewportMetrics(host: VirtualScrollElement, state: VirtualScrollState): { start: number; end: number } {
  const totalExtent = getTotalExtent(state)

  if (state.scrollRoot === host) {
    const start = state.axis === 'vertical' ? host.scrollTop : host.scrollLeft
    const size = state.axis === 'vertical' ? host.clientHeight : host.clientWidth
    return { start, end: start + size }
  }

  const hostRect = host.getBoundingClientRect()

  if (state.scrollRoot === window) {
    if (state.axis === 'vertical') {
      const start = clamp(-hostRect.top, 0, totalExtent)
      const end = clamp(window.innerHeight - hostRect.top, 0, totalExtent)
      return { start, end }
    }

    const start = clamp(-hostRect.left, 0, totalExtent)
    const end = clamp(window.innerWidth - hostRect.left, 0, totalExtent)
    return { start, end }
  }

  const rootRect = (state.scrollRoot as Element).getBoundingClientRect()
  if (state.axis === 'vertical') {
    const start = clamp(rootRect.top - hostRect.top, 0, totalExtent)
    const end = clamp(rootRect.bottom - hostRect.top, 0, totalExtent)
    return { start, end }
  }

  const start = clamp(rootRect.left - hostRect.left, 0, totalExtent)
  const end = clamp(rootRect.right - hostRect.left, 0, totalExtent)
  return { start, end }
}

function getTotalExtent(state: VirtualScrollState): number {
  let total = 0

  for (const node of state.logicalChildren) {
    total += getNodeRecord(state, node).extent ?? 0
  }

  return total
}

function getLogicalOffsetBeforeIndex(state: VirtualScrollState, index: number): number {
  let offset = 0
  for (let current = 0; current < index; current += 1) {
    offset += getNodeRecord(state, state.logicalChildren[current]).extent ?? 0
  }
  return offset
}

function getLogicalIndex(state: VirtualScrollState, node: Node): number {
  return state.logicalChildren.indexOf(node)
}

function isDirectChildRetainedByAttribute(node: Node): boolean {
  return node instanceof Element && node.hasAttribute('data-keep-alive')
}

function resolveContainingLogicalDirectChild(host: VirtualScrollElement, state: VirtualScrollState, node: Node | null): Element | null {
  if (!(node instanceof Node) || !host.contains(node)) {
    return null
  }

  for (const directChild of state.logicalChildren) {
    if (!(directChild instanceof Element)) {
      continue
    }

    if (directChild === node || directChild.contains(node)) {
      return directChild
    }
  }

  return null
}

function getRetainedIndices(host: VirtualScrollElement, state: VirtualScrollState): number[] {
  const retained = new Set<number>()
  const focusedRetainedIndex =
    state.focusedRetainedChild != null ? getLogicalIndex(state, state.focusedRetainedChild) : -1

  if (focusedRetainedIndex !== -1) {
    retained.add(focusedRetainedIndex)
  } else {
    state.focusedRetainedChild = null
    state.focusedElement = null
  }

  for (let index = 0; index < state.logicalChildren.length; index += 1) {
    const node = state.logicalChildren[index]
    if (isDirectChildRetainedByAttribute(node) || state.keepAlive?.(node) === true) {
      retained.add(index)
    }
  }

  return Array.from(retained).sort((left, right) => left - right)
}

function refreshFocusedRetainedChild(host: VirtualScrollElement, state: VirtualScrollState, node: Node | null): void {
  state.focusedRetainedChild = resolveContainingLogicalDirectChild(host, state, node)
  state.focusedElement = node instanceof Element && state.focusedRetainedChild != null ? node : null
}

function scheduleFocusedRetainedChildRefresh(host: VirtualScrollElement): void {
  const state = getState(host)
  if (state.focusRefreshTimer != null) {
    clearTimeout(state.focusRefreshTimer)
  }

  state.focusRefreshTimer = window.setTimeout(() => {
    state.focusRefreshTimer = null
    if (!host.isConnected) {
      return
    }

    refreshFocusedRetainedChild(host, state, document.activeElement)
    scheduleReconcile(host)
  }, 0)
}

function restoreFocusedElementIfNeeded(state: VirtualScrollState): void {
  if (state.focusedRetainedChild == null || state.focusedElement == null) {
    return
  }

  const activeElement = document.activeElement
  if (activeElement instanceof Element && state.focusedRetainedChild.contains(activeElement)) {
    return
  }

  if (!state.focusedElement.isConnected || !state.focusedRetainedChild.contains(state.focusedElement)) {
    return
  }

  if ('focus' in state.focusedElement && typeof state.focusedElement.focus === 'function') {
    state.focusedElement.focus({ preventScroll: true })
  }
}

function buildMountedSegments(
  state: VirtualScrollState,
  visibleStart: number,
  visibleEndExclusive: number,
  retainedIndices: readonly number[],
): MountedSegment[] {
  const mountedIndices = new Set<number>()

  for (let index = visibleStart; index < visibleEndExclusive; index += 1) {
    mountedIndices.add(index)
  }

  for (const index of retainedIndices) {
    mountedIndices.add(index)
  }

  const ordered = Array.from(mountedIndices).sort((left, right) => left - right)
  /** @type {MountedSegment[]} */
  const segments: MountedSegment[] = []

  for (const index of ordered) {
    const last = segments[segments.length - 1]
    if (!last || index > last.endExclusive) {
      segments.push({ start: index, endExclusive: index + 1 })
      continue
    }

    last.endExclusive = Math.max(last.endExclusive, index + 1)
  }

  return segments
}

function getDirectLogicalHost(node: Node | null | undefined): VirtualScrollElement | null {
  if (!(node instanceof Node)) {
    return null
  }

  const host = logicalHostRoots.get(node)
  if (!host) {
    return null
  }

  const state = getState(host)
  return getLogicalIndex(state, node) === -1 ? null : host
}

function getScrollRootMode(host: VirtualScrollElement, state: VirtualScrollState): ScrollRootMode {
  if (state.scrollRoot === window) {
    return 'window'
  }

  if (state.scrollRoot === host) {
    return 'host'
  }

  return 'external'
}

/** Keeps host/debug attributes aligned with the current logical and physical state. */
function updateDebugAttributes(host: VirtualScrollElement, state: VirtualScrollState): void {
  host.setAttribute('data-virtual-scroll-axis', state.axis)
  host.setAttribute('data-virtual-scroll-count', String(state.logicalChildren.length))
  host.setAttribute('data-virtual-scroll-mounted-start', String(state.mountedStart))
  host.setAttribute('data-virtual-scroll-mounted-end', String(Math.max(state.mountedEndExclusive - 1, -1)))
  host.setAttribute('data-virtual-scroll-anchor-index', String(state.anchorIndex))

  host.setAttribute('data-virtual-scroll-scroll-root', getScrollRootMode(host, state))

  for (const node of state.logicalChildren) {
    if (!(node instanceof Element)) {
      continue
    }

    const index = getLogicalIndex(state, node)
    const mounted = node.parentNode === host
    const visible = index >= state.mountedStart && index < state.mountedEndExclusive
    const retained = mounted && !visible
    node.setAttribute('data-virtual-scroll-index', String(index))
    node.setAttribute('data-virtual-scroll-mounted', mounted ? 'true' : 'false')
    node.setAttribute('data-virtual-scroll-visible', visible ? 'true' : 'false')
    node.setAttribute('data-virtual-scroll-retained', retained ? 'true' : 'false')
  }
}

function dispatchRangeChange(host: VirtualScrollElement, state: VirtualScrollState): void {
  host.dispatchEvent(
    new CustomEvent('rangechange', {
      bubbles: false,
      composed: false,
      detail: {
        start: state.mountedStart,
        end: Math.max(state.mountedEndExclusive - 1, -1),
        count: state.logicalChildren.length,
        anchorIndex: state.anchorIndex,
        scrollRoot: getScrollRootMode(host, state),
      },
    }),
  )
}

function appendPhysicalChild(host: VirtualScrollElement, node: Node): void {
  native.appendChild.call(host, node)
}

function insertPhysicalBefore(host: VirtualScrollElement, node: Node, reference: Node | null): void {
  native.insertBefore.call(host, node, reference)
}

function removePhysicalChild(host: VirtualScrollElement, node: Node): void {
  if (node.parentNode === host) {
    native.removeChild.call(host, node)
  }
}

function getMeasuredInlineConstraint(host: VirtualScrollElement, axis: Axis): number {
  const rect = host.getBoundingClientRect()
  return axis === 'vertical' ? rect.width : rect.height
}

function withMeasurementContext<T>(
  host: VirtualScrollElement,
  state: VirtualScrollState,
  configure: (slot: HTMLElement) => T,
): T {
  const slot = document.createElement('div')
  const constraint = getMeasuredInlineConstraint(host, state.axis)
  slot.style.position = 'relative'
  slot.style.boxSizing = 'border-box'
  slot.style.display = state.axis === 'vertical' ? 'block' : 'inline-block'
  slot.style.overflow = 'visible'

  if (state.axis === 'vertical' && Number.isFinite(constraint) && constraint > 0) {
    slot.style.width = `${constraint}px`
  }

  if (state.axis === 'horizontal' && Number.isFinite(constraint) && constraint > 0) {
    slot.style.height = `${constraint}px`
  }

  state.measureRoot.append(slot)

  try {
    return configure(slot)
  } finally {
    slot.remove()
  }
}

function getElementMainAxisMargins(element: Element, axis: Axis): number {
  const computed = getComputedStyle(element)
  if (axis === 'vertical') {
    return (parseFloat(computed.marginTop) || 0) + (parseFloat(computed.marginBottom) || 0)
  }

  return (parseFloat(computed.marginLeft) || 0) + (parseFloat(computed.marginRight) || 0)
}

function measureElementExtent(element: Element, axis: Axis): number {
  const rect = element.getBoundingClientRect()
  const borderBoxExtent = axis === 'vertical' ? rect.height : rect.width
  return borderBoxExtent + getElementMainAxisMargins(element, axis)
}

/**
 * Measures a logical child's main-axis extent.
 *
 * Order of preference:
 * 1. cached extent
 * 2. mounted real layout in the host
 * 3. runtime-owned measurement lane
 *
 * The runtime never applies authored sizing styles to user children to make this work.
 */
function measureNode(host: VirtualScrollElement, state: VirtualScrollState, node: Node | null | undefined): number {
  if (!(node instanceof Node)) {
    return 0
  }

  const record = getNodeRecord(state, node)

  if (record.extent != null) {
    return record.extent
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    record.extent = 0
    return 0
  }

  if (node.parentNode === host) {
    const extent = node instanceof Element
      ? measureElementExtent(node, state.axis)
      : state.axis === 'vertical'
        ? measureTextNode(node).height
        : measureTextNode(node).width
    record.extent = extent
    return extent
  }

  const measured = withMeasurementContext(host, state, (slot) => {
    slot.append(node)

    if (node.nodeType === Node.TEXT_NODE) {
      return state.axis === 'vertical' ? measureTextNode(node).height : measureTextNode(node).width
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      return measureElementExtent(node as Element, state.axis)
    }

    return 0
  })

  state.parkingFragment.append(node)
  record.extent = measured
  return measured
}

function measureTextNode(node: Node): DOMRect {
  const range = document.createRange()
  range.selectNode(node)
  return range.getBoundingClientRect()
}

function measureAllLogicalChildren(host: VirtualScrollElement, state: VirtualScrollState): void {
  for (const node of state.logicalChildren) {
    measureNode(host, state, node)
  }
}

function updateSpacerSizes(state: VirtualScrollState, segments: readonly MountedSegment[]): void {
  ensureSpacerCount(state, segments.length + 1)

  const sizeProperty = state.axis === 'vertical' ? 'height' : 'width'
  let cursor = 0

  for (let segmentIndex = 0; segmentIndex <= segments.length; segmentIndex += 1) {
    const nextStart = segmentIndex < segments.length
      ? segments[segmentIndex].start
      : state.logicalChildren.length

    let gapExtent = 0
    for (let index = cursor; index < nextStart; index += 1) {
      gapExtent += getNodeRecord(state, state.logicalChildren[index]).extent ?? 0
    }

    state.spacers[segmentIndex].style.setProperty(sizeProperty, `${gapExtent}px`)
    cursor = segmentIndex < segments.length ? segments[segmentIndex].endExclusive : cursor
  }
}

function syncObservedMountedElements(host: VirtualScrollElement, state: VirtualScrollState, segments: readonly MountedSegment[]): void {
  if (!state.resizeObserver) {
    return
  }

  const nextObserved = new Set<Element>()
  for (const segment of segments) {
    for (let index = segment.start; index < segment.endExclusive; index += 1) {
      const node = state.logicalChildren[index]
      if (node instanceof Element) {
        nextObserved.add(node)
        if (!state.observedElements.has(node)) {
          state.resizeObserver.observe(node)
        }
      }
    }
  }

  for (const element of state.observedElements) {
    if (!nextObserved.has(element)) {
      state.resizeObserver.unobserve(element)
    }
  }

  state.observedElements = nextObserved
}

function setHostScrollOffset(host: VirtualScrollElement, axis: Axis, value: number): void {
  if (axis === 'vertical') {
    host.scrollTop = value
    return
  }

  host.scrollLeft = value
}

function getResolvedScrollTop(host: VirtualScrollElement, state: VirtualScrollState): number {
  if (state.scrollRoot === host) {
    return native.getScrollTop?.call(host) ?? 0
  }

  if (state.scrollRoot === window) {
    return window.scrollY
  }

  return (state.scrollRoot as Element).scrollTop
}

function setResolvedScrollTop(host: VirtualScrollElement, state: VirtualScrollState, value: number): void {
  if (state.scrollRoot === host) {
    native.setScrollTop?.call(host, value)
    return
  }

  if (state.scrollRoot === window) {
    window.scrollTo({ top: value, left: window.scrollX, behavior: 'auto' })
    return
  }

  ;(state.scrollRoot as Element).scrollTop = value
}

function getResolvedScrollLeft(host: VirtualScrollElement, state: VirtualScrollState): number {
  if (state.scrollRoot === host) {
    return native.getScrollLeft?.call(host) ?? 0
  }

  if (state.scrollRoot === window) {
    return window.scrollX
  }

  return (state.scrollRoot as Element).scrollLeft
}

function setResolvedScrollLeft(host: VirtualScrollElement, state: VirtualScrollState, value: number): void {
  if (state.scrollRoot === host) {
    native.setScrollLeft?.call(host, value)
    return
  }

  if (state.scrollRoot === window) {
    window.scrollTo({ top: window.scrollY, left: value, behavior: 'auto' })
    return
  }

  ;(state.scrollRoot as Element).scrollLeft = value
}

function getResolvedViewportSize(host: VirtualScrollElement, state: VirtualScrollState): number {
  if (state.scrollRoot === host) {
    return state.axis === 'vertical' ? host.clientHeight : host.clientWidth
  }

  if (state.scrollRoot === window) {
    return state.axis === 'vertical' ? window.innerHeight : window.innerWidth
  }

  return state.axis === 'vertical'
    ? (state.scrollRoot as Element).clientHeight
    : (state.scrollRoot as Element).clientWidth
}

function normalizeScrollIntoViewOptions(
  argument?: boolean | ScrollIntoViewOptions,
): Required<Pick<ScrollIntoViewOptions, 'behavior' | 'block' | 'inline'>> {
  if (argument === false) {
    return { behavior: 'auto', block: 'end', inline: 'nearest' }
  }

  if (argument === true || argument == null) {
    return { behavior: 'auto', block: 'start', inline: 'nearest' }
  }

  return {
    behavior: argument.behavior ?? 'auto',
    block: argument.block ?? 'start',
    inline: argument.inline ?? 'nearest',
  }
}

function resolveAlignmentForAxis(
  axis: Axis,
  options: Required<Pick<ScrollIntoViewOptions, 'block' | 'inline'>>,
): ScrollLogicalPosition {
  return axis === 'vertical' ? options.block : options.inline
}

function getAlignedViewportStart(
  targetStart: number,
  targetEnd: number,
  visibleStart: number,
  visibleEnd: number,
  viewportSize: number,
  alignment: ScrollLogicalPosition,
): number {
  if (alignment === 'center') {
    return targetStart - Math.max(0, viewportSize - (targetEnd - targetStart)) / 2
  }

  if (alignment === 'end') {
    return targetEnd - viewportSize
  }

  if (alignment === 'nearest') {
    if (targetStart >= visibleStart && targetEnd <= visibleEnd) {
      return visibleStart
    }

    const alignStart = targetStart
    const alignEnd = targetEnd - viewportSize
    return Math.abs(alignStart - visibleStart) <= Math.abs(alignEnd - visibleStart)
      ? alignStart
      : alignEnd
  }

  return targetStart
}

function scrollResolvedRootToMainAxis(
  host: VirtualScrollElement,
  state: VirtualScrollState,
  value: number,
  behavior: ScrollBehavior,
): void {
  if (state.axis === 'vertical') {
    if (state.scrollRoot === host) {
      native.scrollTo.call(host, { top: value, left: host.scrollLeft, behavior })
      return
    }

    if (state.scrollRoot === window) {
      window.scrollTo({ top: value, left: window.scrollX, behavior })
      return
    }

    ;(state.scrollRoot as Element).scrollTo({ top: value, left: (state.scrollRoot as Element).scrollLeft, behavior })
    return
  }

  if (state.scrollRoot === host) {
    native.scrollTo.call(host, { top: host.scrollTop, left: value, behavior })
    return
  }

  if (state.scrollRoot === window) {
    window.scrollTo({ top: window.scrollY, left: value, behavior })
    return
  }

  ;(state.scrollRoot as Element).scrollTo({ top: (state.scrollRoot as Element).scrollTop, left: value, behavior })
}

/**
 * Provides logical `scrollIntoView()` for direct children, including parked ones.
 * The runtime first scrolls to the logical slot, mounts the child, then lets native
 * browser alignment finish against the active scroll root.
 */
function scrollLogicalDirectChildIntoView(
  target: Element,
  host: VirtualScrollElement,
  argument?: boolean | ScrollIntoViewOptions,
): void {
  const state = getState(host)
  if (!state.initialized) {
    native.elementScrollIntoView.call(target, argument)
    return
  }

  const index = getLogicalIndex(state, target)
  if (index === -1) {
    native.elementScrollIntoView.call(target, argument)
    return
  }

  const options = normalizeScrollIntoViewOptions(argument)
  const visible = getViewportMetrics(host, state)
  const viewportSize = getResolvedViewportSize(host, state)
  const targetStart = getLogicalOffsetBeforeIndex(state, index)
  const targetExtent = measureNode(host, state, target)
  const targetEnd = targetStart + targetExtent
  const desiredViewportStart = clamp(
    getAlignedViewportStart(
      targetStart,
      targetEnd,
      visible.start,
      visible.end,
      viewportSize,
      resolveAlignmentForAxis(state.axis, options),
    ),
    0,
    Math.max(0, getTotalExtent(state) - viewportSize),
  )

  const delta = desiredViewportStart - visible.start
  if (Math.abs(delta) > 0.5) {
    const currentOffset = state.axis === 'vertical'
      ? getResolvedScrollTop(host, state)
      : getResolvedScrollLeft(host, state)
    scrollResolvedRootToMainAxis(host, state, currentOffset + delta, options.behavior)
  }

  refreshVirtualization(host)

  if (target.parentNode === host) {
    native.elementScrollIntoView.call(target, argument)
  }
}

function scheduleHostScrollOffsetRestore(
  host: VirtualScrollElement,
  state: VirtualScrollState,
  targetOffset: number,
  revision: number,
): void {
  if (state.restoreScrollFrame != null) {
    cancelAnimationFrame(state.restoreScrollFrame)
  }

  state.restoreScrollFrame = requestAnimationFrame(() => {
    state.restoreScrollFrame = null
    if (state.scrollRoot !== host || state.scrollRevision !== revision) {
      return
    }

    setHostScrollOffset(host, state.axis, targetOffset)
  })
}

/**
 * Core reconciliation step:
 * - computes the visible logical range
 * - merges in any retained direct children
 * - resizes spacers for the gaps between mounted segments
 * - mutates the physical DOM into the desired order
 */
function reconcileMountedRange(host: VirtualScrollElement, state: VirtualScrollState): void {
  const previousStart = state.mountedStart
  const previousEndExclusive = state.mountedEndExclusive
  const visible = getViewportMetrics(host, state)
  const preservedHostScrollOffset = state.scrollRoot === host ? visible.start : null
  const scrollRevision = state.scrollRevision
  const startTarget = Math.max(0, visible.start - state.overscan)
  const endTarget = Math.min(getTotalExtent(state), visible.end + state.overscan)

  let start = 0
  let cursor = 0
  while (start < state.logicalChildren.length) {
    const nextExtent = getNodeRecord(state, state.logicalChildren[start]).extent ?? 0
    if (cursor + nextExtent > startTarget) {
      break
    }
    cursor += nextExtent
    start += 1
  }

  let endExclusive = start
  let trailingCursor = cursor
  while (endExclusive < state.logicalChildren.length) {
    const nextExtent = getNodeRecord(state, state.logicalChildren[endExclusive]).extent ?? 0
    trailingCursor += nextExtent
    endExclusive += 1
    if (trailingCursor >= endTarget) {
      break
    }
  }

  state.mountedStart = start
  state.mountedEndExclusive = endExclusive
  state.anchorIndex = Math.min(start, Math.max(0, state.logicalChildren.length - 1))
  state.anchorOffset = Math.max(0, visible.start - cursor)

  const retainedIndices = getRetainedIndices(host, state)
  const segments = buildMountedSegments(state, start, endExclusive, retainedIndices)
  updateSpacerSizes(state, segments)

  ensureSpacerCount(state, segments.length + 1)
  const desiredOrder: Node[] = []
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    desiredOrder.push(state.spacers[segmentIndex])
    desiredOrder.push(...state.logicalChildren.slice(segments[segmentIndex].start, segments[segmentIndex].endExclusive))
  }
  desiredOrder.push(state.spacers[segments.length])

  for (const node of state.logicalChildren) {
    const mounted = desiredOrder.includes(node)
    if (!mounted && node.parentNode === host) {
      removePhysicalChild(host, node)
      state.parkingFragment.append(node)
    }
  }

  let reference: Node | null = native.getFirstChild?.call(host) ?? null
  for (const node of desiredOrder) {
    if (node.parentNode !== host) {
      insertPhysicalBefore(host, node, reference)
    } else if (reference !== node) {
      insertPhysicalBefore(host, node, reference)
    }
    reference = node.nextSibling
  }

  for (const spacer of state.spacers) {
    if (spacer.parentNode === host && !desiredOrder.includes(spacer)) {
      removePhysicalChild(host, spacer)
    }
  }

  let extra = reference
  while (extra) {
    const next = extra.nextSibling
    if (isSpacer(extra) && !desiredOrder.includes(extra)) {
      removePhysicalChild(host, extra)
    }
    extra = next
  }

  if (preservedHostScrollOffset != null && state.scrollRoot !== host) {
    scheduleHostScrollOffsetRestore(host, state, preservedHostScrollOffset, scrollRevision)
  }

  syncObservedMountedElements(host, state, segments)
  updateDebugAttributes(host, state)
  restoreFocusedElementIfNeeded(state)

  if (state.mountedStart !== previousStart || state.mountedEndExclusive !== previousEndExclusive) {
    dispatchRangeChange(host, state)
  }
}

function scheduleReconcile(host: VirtualScrollElement): void {
  const state = getState(host)
  if (state.scheduled) {
    return
  }

  state.scheduled = true
  queueMicrotask(() => {
    state.scheduled = false
    refreshVirtualization(host)
  })
}

/** Rebinds scroll listeners whenever the effective scroll root changes. */
function attachScrollListeners(host: VirtualScrollElement, state: VirtualScrollState): void {
  state.cleanupScrollListener?.()

  const target = state.scrollRoot === window ? window : state.scrollRoot
  const handler = () => {
    if (target === host) {
      state.scrollRevision += 1
    }
    scheduleReconcile(host)
  }

  target.addEventListener('scroll', handler, { passive: true })
  window.addEventListener('resize', handler)

  state.cleanupScrollListener = () => {
    target.removeEventListener('scroll', handler)
    window.removeEventListener('resize', handler)
  }
}

/**
 * Watches the host and currently mounted direct-child elements for size changes.
 * Mounted child observation is critical for content that changes size after mount.
 */
function attachResizeObserver(host: VirtualScrollElement, state: VirtualScrollState): void {
  state.resizeObserver?.disconnect()

  state.resizeObserver = new ResizeObserver((entries) => {
    let invalidateAll = false

    for (const entry of entries) {
      if (entry.target === host) {
        invalidateAll = true
        break
      }
    }

    if (invalidateAll) {
      for (const node of state.logicalChildren) {
        getNodeRecord(state, node).extent = null
      }
    } else {
      for (const entry of entries) {
        const target = entry.target
        if (!(target instanceof Element)) {
          continue
        }

        const recordHost = getDirectLogicalHost(target)
        if (recordHost === host) {
          getNodeRecord(state, target).extent = null
        }
      }
    }

    scheduleReconcile(host)
  })

  state.resizeObserver.observe(host)
  syncObservedMountedElements(
    host,
    state,
    buildMountedSegments(state, state.mountedStart, state.mountedEndExclusive, getRetainedIndices(host, state)),
  )
}

/**
 * Watches retention-related attribute changes on both mounted and parked logical content.
 *
 * The observer must cover:
 * - the host subtree, for currently mounted direct children
 * - the parking fragment subtree, for parked direct children
 *
 * This keeps retention responsive even when attribute changes bypass the explicit
 * `setAttribute()` / `removeAttribute()` interception path, such as `dataset` writes.
 */
function attachMutationObserver(host: VirtualScrollElement, state: VirtualScrollState): void {
  state.mutationObserver?.disconnect()

  state.mutationObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== 'attributes') {
        continue
      }

      if (record.attributeName === 'data-keep-alive' && getDirectLogicalHost(record.target) === host) {
        scheduleReconcile(host)
        return
      }
    }
  })

  const options = {
    attributes: true,
    attributeFilter: ['data-keep-alive'],
    subtree: true,
  } satisfies MutationObserverInit

  state.mutationObserver.observe(host, options)
  state.mutationObserver.observe(state.parkingFragment, options)
}

/** Restores all runtime observers/listeners when an initialized host reconnects. */
function restoreConnectedRuntime(host: VirtualScrollElement, state: VirtualScrollState): void {
  state.axis = resolveAxis(host, state)
  state.overscan = resolveOverscan(host, state)
  state.scrollRoot = resolveScrollRoot(host, state)

  if (!state.measureRoot.isConnected) {
    document.body.append(state.measureRoot)
  }

  host.style.setProperty('overflow-anchor', 'none')
  attachScrollListeners(host, state)
  attachResizeObserver(host, state)
  attachMutationObserver(host, state)
  scheduleReconcile(host)
}

/** Recomputes measurement, scroll-root state, and mounted segments in one scheduled pass. */
function refreshVirtualization(host: VirtualScrollElement): void {
  const state = getState(host)
  if (!state.initialized || state.isReconciling) {
    return
  }

  state.isReconciling = true

  try {
    state.axis = resolveAxis(host, state)
    state.overscan = resolveOverscan(host, state)
    const nextScrollRoot = resolveScrollRoot(host, state)
    if (nextScrollRoot !== state.scrollRoot) {
      state.scrollRoot = nextScrollRoot
      attachScrollListeners(host, state)
    }

    applySpacerStyles(state)
    measureAllLogicalChildren(host, state)
    reconcileMountedRange(host, state)
  } finally {
    state.isReconciling = false
  }
}

/** Initializes logical children from existing authored DOM and boots virtualization. */
function ensureInitialized(host: VirtualScrollElement): void {
  const state = getState(host)
  if (state.initialized) {
    return
  }

  state.initialized = true
  state.axis = resolveAxis(host, state)
  state.overscan = resolveOverscan(host, state)
  state.scrollRoot = resolveScrollRoot(host, state)

  if (!state.measureRoot.isConnected) {
    document.body.append(state.measureRoot)
  }

  const initialChildren = Array.from(
    assertDefined(native.getChildNodes?.call(host), 'childNodes getter is unavailable') as NodeListOf<ChildNode>,
  ).filter((node): node is ChildNode => !isSpacer(node))

  if (state.logicalChildren.length === 0) {
    state.logicalChildren = initialChildren
  } else {
    for (const node of initialChildren) {
      if (!state.logicalChildren.includes(node)) {
        state.logicalChildren.push(node)
      }
    }
  }

  for (const node of state.logicalChildren) {
    markLogicalOwnership(host, node)
    state.parkingFragment.append(node)
  }

  ensureSpacerCount(state, 1)
  appendPhysicalChild(host, state.spacers[0])

  host.style.setProperty('overflow-anchor', 'none')
  attachScrollListeners(host, state)
  attachResizeObserver(host, state)
  attachMutationObserver(host, state)

  refreshVirtualization(host)
}

/** Appends authored nodes to the logical child list without exposing spacer internals. */
function logicalAppend(host: VirtualScrollElement, nodes: Node[]): void {
  const state = getState(host)
  for (const node of nodes) {
    if (isSpacer(node)) {
      throw new Error('Cannot append runtime spacer nodes to the virtual scroll host')
    }

    if (node.parentNode && node.parentNode !== host) {
      node.parentNode.removeChild(node)
    }

    state.logicalChildren.push(node)
    getNodeRecord(state, node).extent = null
    markLogicalOwnership(host, node)
    state.parkingFragment.append(node)
  }

  scheduleReconcile(host)
}

function logicalInsertBefore(host: VirtualScrollElement, node: Node, reference: Node | null): Node {
  const state = getState(host)
  if (reference == null) {
    logicalAppend(host, [node])
    return node
  }

  const referenceIndex = getLogicalIndex(state, reference)
  if (referenceIndex === -1) {
    throw new DOMException('The node before which the new node is to be inserted is not a child of this node.', 'NotFoundError')
  }

  if (node.parentNode && node.parentNode !== host) {
    node.parentNode.removeChild(node)
  }

  const currentIndex = getLogicalIndex(state, node)
  if (currentIndex !== -1) {
    state.logicalChildren.splice(currentIndex, 1)
  }

  state.logicalChildren.splice(referenceIndex, 0, node)
  getNodeRecord(state, node).extent = null
  markLogicalOwnership(host, node)
  state.parkingFragment.append(node)
  scheduleReconcile(host)
  return node
}

function logicalRemove(host: VirtualScrollElement, node: Node): Node {
  const state = getState(host)
  const index = getLogicalIndex(state, node)
  if (index === -1) {
    throw new DOMException('The node to be removed is not a child of this node.', 'NotFoundError')
  }

  state.logicalChildren.splice(index, 1)
  unmarkLogicalOwnership(node)
  removePhysicalChild(host, node)
  if (node.parentNode === state.parkingFragment) {
    state.parkingFragment.removeChild(node)
  }
  scheduleReconcile(host)
  return node
}

function collectNodesForMutation(nodes: Array<Node | string>): Node[] {
  return nodes.flatMap((entry) => {
    if (typeof entry === 'string') {
      return [document.createTextNode(entry)]
    }
    return [entry]
  })
}

function logicalInsertManyBefore(host: VirtualScrollElement, nodes: Node[], reference: Node | null): void {
  for (const node of nodes) {
    logicalInsertBefore(host, node, reference)
  }
}

function serializeLogicalChildren(state: VirtualScrollState): string {
  const template = document.createElement('template')
  const clones = state.logicalChildren.map((node) => node.cloneNode(true))
  template.content.append(...clones)
  return template.innerHTML
}

function parseMarkupToNodes(markup: string): Node[] {
  const template = document.createElement('template')
  template.innerHTML = markup
  return Array.from(template.content.childNodes)
}

/**
 * Host-scoped selector support for the logical subtree.
 * Spacer nodes are excluded and parked descendants remain queryable.
 */
function queryLogicalSelectorAll(host: VirtualScrollElement, selector: string): Element[] {
  const state = getState(host)

  if (selector.trim() === ':scope > *') {
    return getElementsOnly(state)
  }

  const results: Element[] = []
  for (const directChild of state.logicalChildren) {
    if (!(directChild instanceof Element)) {
      continue
    }

    if (native.matches.call(directChild, selector)) {
      results.push(directChild)
    }

    results.push(...Array.from(directChild.querySelectorAll(selector)))
  }

  return results
}

/**
 * Custom element surface for the virtual scroller.
 *
 * Public configuration:
 * - `axis`
 * - `overscan`
 * - `scrollRoot`
 * - `keepAlive`
 *
 * Public host semantics are logical at the direct-child boundary: child collections,
 * mutation methods, `innerHTML`, and host-scoped selectors all operate on authored
 * direct children rather than the runtime spacer DOM.
 */
export class VirtualScrollElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['axis', 'overscan', 'scroll-root']
  }

  constructor() {
    super()

    const measureRoot = document.createElement('div')
    measureRoot.setAttribute('aria-hidden', 'true')
    measureRoot.style.position = 'fixed'
    measureRoot.style.left = '-100000px'
    measureRoot.style.top = '0'
    measureRoot.style.visibility = 'hidden'
    measureRoot.style.pointerEvents = 'none'
    measureRoot.style.contain = 'layout style'
    measureRoot.style.zIndex = '-1'

    const state: VirtualScrollState = {
      initialized: false,
      scheduled: false,
      isReconciling: false,
      axis: DEFAULT_AXIS,
      overscan: DEFAULT_OVERSCAN,
      propertyAxis: null,
      propertyOverscan: null,
      propertyScrollRoot: null,
      keepAlive: null,
      scrollRoot: this,
      logicalChildren: [],
      records: new WeakMap(),
      parkingFragment: document.createDocumentFragment(),
      spacers: [],
      measureRoot,
      mountedStart: 0,
      mountedEndExclusive: 0,
      anchorIndex: 0,
      anchorOffset: 0,
      focusedRetainedChild: null,
      focusedElement: null,
      focusRefreshTimer: null,
      scrollRevision: 0,
      restoreScrollFrame: null,
      cleanupScrollListener: null,
      resizeObserver: null,
      mutationObserver: null,
      observedElements: new Set(),
    }

    states.set(this, state)

    // Focus retention is tracked at the direct-child boundary. The focused row is
    // latched immediately on `focusin`, and refreshed asynchronously on `focusout`
    // once the browser has settled the next active element.
    this.addEventListener('focusin', (event) => {
      const state = getState(this)
      if (state.focusRefreshTimer != null) {
        clearTimeout(state.focusRefreshTimer)
        state.focusRefreshTimer = null
      }
      refreshFocusedRetainedChild(this, state, event.target as Node | null)
      scheduleReconcile(this)
    })
    this.addEventListener('focusout', () => {
      scheduleFocusedRetainedChildRefresh(this)
    })
  }

  get axis(): Axis {
    return getState(this).propertyAxis ?? resolveAxis(this, getState(this))
  }

  set axis(value: Axis) {
    const state = getState(this)
    state.propertyAxis = value
    scheduleReconcile(this)
  }

  get overscan(): number {
    return getState(this).propertyOverscan ?? resolveOverscan(this, getState(this))
  }

  set overscan(value: number) {
    const parsed = parseFiniteNumber(value)
    if (parsed == null) {
      throw new TypeError('overscan must be a finite number')
    }
    const state = getState(this)
    state.propertyOverscan = Math.max(0, parsed)
    scheduleReconcile(this)
  }

  get scrollRoot(): ScrollRootLike {
    return getState(this).propertyScrollRoot ?? resolveScrollRoot(this, getState(this))
  }

  set scrollRoot(value: ScrollRootLike) {
    const state = getState(this)
    state.propertyScrollRoot = value
    scheduleReconcile(this)
  }

  get keepAlive(): ((child: Node) => boolean) | null {
    return getState(this).keepAlive
  }

  set keepAlive(value: ((child: Node) => boolean) | null) {
    const state = getState(this)
    state.keepAlive = value
    scheduleReconcile(this)
  }

  connectedCallback(): void {
    const state = getState(this)
    if (!state.initialized) {
      ensureInitialized(this)
      return
    }

    restoreConnectedRuntime(this, state)
  }

  disconnectedCallback(): void {
    const state = getState(this)
    state.cleanupScrollListener?.()
    state.cleanupScrollListener = null
    state.resizeObserver?.disconnect()
    state.resizeObserver = null
    state.mutationObserver?.disconnect()
    state.mutationObserver = null
    if (state.restoreScrollFrame != null) {
      cancelAnimationFrame(state.restoreScrollFrame)
      state.restoreScrollFrame = null
    }
    if (state.focusRefreshTimer != null) {
      clearTimeout(state.focusRefreshTimer)
      state.focusRefreshTimer = null
    }
    state.measureRoot.remove()
  }

  attributeChangedCallback(name: string): void {
    const state = getState(this)
    if (!state.initialized) {
      return
    }

    if (name === 'axis' || name === 'overscan' || name === 'scroll-root') {
      if (name === 'axis') {
        for (const node of state.logicalChildren) {
          getNodeRecord(state, node).extent = null
        }
      }
      scheduleReconcile(this)
    }
  }

  override get childNodes(): NodeListOf<ChildNode> {
    const state = getState(this)
    return createNodeCollectionView(() => state.logicalChildren as ChildNode[]) as NodeListOf<ChildNode>
  }

  override get children(): HTMLCollection {
    const state = getState(this)
    return createElementCollectionView(() => getElementsOnly(state)) as unknown as HTMLCollection
  }

  override get firstChild(): ChildNode | null {
    return getState(this).logicalChildren[0] as ChildNode | undefined ?? null
  }

  override get lastChild(): ChildNode | null {
    const state = getState(this)
    return state.logicalChildren[state.logicalChildren.length - 1] as ChildNode | undefined ?? null
  }

  override get firstElementChild(): Element | null {
    return getElementsOnly(getState(this))[0] ?? null
  }

  override get lastElementChild(): Element | null {
    const elements = getElementsOnly(getState(this))
    return elements[elements.length - 1] ?? null
  }

  override get childElementCount(): number {
    return getElementsOnly(getState(this)).length
  }

  override hasChildNodes(): boolean {
    return getState(this).logicalChildren.length > 0
  }

  override appendChild<T extends Node>(node: T): T {
    logicalAppend(this, [node])
    return node
  }

  override insertBefore<T extends Node>(node: T, child: Node | null): T {
    logicalInsertBefore(this, node, child)
    return node
  }

  override removeChild<T extends Node>(child: T): T {
    return logicalRemove(this, child) as T
  }

  override replaceChild<T extends Node>(node: Node, child: T): T {
    const state = getState(this)
    const index = getLogicalIndex(state, child)
    if (index === -1) {
      throw new DOMException('The node to be replaced is not a child of this node.', 'NotFoundError')
    }

    logicalRemove(this, child)
    state.logicalChildren.splice(index, 0, node)
    getNodeRecord(state, node).extent = null
    markLogicalOwnership(this, node)
    state.parkingFragment.append(node)
    scheduleReconcile(this)
    return child
  }

  override append(...nodes: Array<Node | string>): void {
    logicalAppend(this, collectNodesForMutation(nodes))
  }

  override prepend(...nodes: Array<Node | string>): void {
    const collected = collectNodesForMutation(nodes)
    const reference = this.firstChild
    for (let index = collected.length - 1; index >= 0; index -= 1) {
      logicalInsertBefore(this, collected[index], reference)
    }
  }

  override replaceChildren(...nodes: Array<Node | string>): void {
    const state = getState(this)
    for (const child of [...state.logicalChildren]) {
      logicalRemove(this, child)
    }
    logicalAppend(this, collectNodesForMutation(nodes))
  }

  override querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null
  override querySelector<K extends keyof SVGElementTagNameMap>(selectors: K): SVGElementTagNameMap[K] | null
  override querySelector<E extends Element = Element>(selectors: string): E | null
  override querySelector<E extends Element = Element>(selectors: string): E | null {
    return (queryLogicalSelectorAll(this, selectors)[0] ?? null) as E | null
  }

  override querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>
  override querySelectorAll<K extends keyof SVGElementTagNameMap>(selectors: K): NodeListOf<SVGElementTagNameMap[K]>
  override querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>
  override querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> {
    return createNodeCollectionView(() => queryLogicalSelectorAll(this, selectors) as E[]) as NodeListOf<E>
  }

  override get innerHTML(): string {
    return serializeLogicalChildren(getState(this))
  }

  override set innerHTML(value: string) {
    this.replaceChildren(...parseMarkupToNodes(String(value)))
  }

  override get scrollTop(): number {
    return getResolvedScrollTop(this, getState(this))
  }

  override set scrollTop(value: number) {
    setResolvedScrollTop(this, getState(this), value)
  }

  override get scrollLeft(): number {
    return getResolvedScrollLeft(this, getState(this))
  }

  override set scrollLeft(value: number) {
    setResolvedScrollLeft(this, getState(this), value)
  }

  override scroll(options?: ScrollToOptions): void
  override scroll(x: number, y: number): void
  override scroll(xOrOptions?: number | ScrollToOptions, y?: number): void {
    if (typeof xOrOptions === 'number') {
      this.scrollTo(xOrOptions, y ?? 0)
      return
    }

    this.scrollTo(xOrOptions ?? {})
  }

  override scrollTo(options?: ScrollToOptions): void
  override scrollTo(x: number, y: number): void
  override scrollTo(xOrOptions?: number | ScrollToOptions, y?: number): void {
    const state = getState(this)
    if (state.scrollRoot === this) {
      if (typeof xOrOptions === 'number') {
        native.scrollTo.call(this, xOrOptions, y ?? 0)
        return
      }

      native.scrollTo.call(this, xOrOptions ?? {})
      return
    }

    if (typeof xOrOptions === 'number') {
      if (state.scrollRoot === window) {
        window.scrollTo(xOrOptions, y ?? 0)
      } else {
        ;(state.scrollRoot as Element).scrollTo(xOrOptions, y ?? 0)
      }
      return
    }

    const options = xOrOptions ?? {}
    if (state.scrollRoot === window) {
      window.scrollTo(options)
    } else {
      ;(state.scrollRoot as Element).scrollTo(options)
    }
  }

  override scrollBy(options?: ScrollToOptions): void
  override scrollBy(x: number, y: number): void
  override scrollBy(xOrOptions?: number | ScrollToOptions, y?: number): void {
    const state = getState(this)
    if (state.scrollRoot === this) {
      if (typeof xOrOptions === 'number') {
        native.scrollBy.call(this, xOrOptions, y ?? 0)
        return
      }

      native.scrollBy.call(this, xOrOptions ?? {})
      return
    }

    if (typeof xOrOptions === 'number') {
      if (state.scrollRoot === window) {
        window.scrollBy(xOrOptions, y ?? 0)
      } else {
        ;(state.scrollRoot as Element).scrollBy(xOrOptions, y ?? 0)
      }
      return
    }

    const options = xOrOptions ?? {}
    if (state.scrollRoot === window) {
      window.scrollBy(options)
    } else {
      ;(state.scrollRoot as Element).scrollBy(options)
    }
  }
}

const closestPatched = Symbol.for('virtual-scroll.closest-patched')
const directChildMutationPatched = Symbol.for('virtual-scroll.direct-child-mutation-patched')
const keepAliveAttributePatched = Symbol.for('virtual-scroll.keep-alive-attribute-patched')
const scrollIntoViewPatched = Symbol.for('virtual-scroll.scroll-into-view-patched')

if (!(Element.prototype as unknown as Record<PropertyKey, unknown>)[closestPatched]) {
  Object.defineProperty(Element.prototype, closestPatched, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  })

  Element.prototype.closest = function patchedClosest(this: Element, selectors: string): Element | null {
    const nativeResult = native.closest.call(this, selectors)
    if (nativeResult) {
      return nativeResult
    }

    let current: Node | null = this
    while (current) {
      const logicalHost = logicalHostRoots.get(current)
      if (logicalHost) {
        if (native.matches.call(logicalHost, selectors)) {
          return logicalHost
        }
        return native.closest.call(logicalHost, selectors)
      }
      current = current.parentNode
    }

    return null
  }
}

if (!(Element.prototype as unknown as Record<PropertyKey, unknown>)[directChildMutationPatched]) {
  Object.defineProperty(Element.prototype, directChildMutationPatched, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  })

  Element.prototype.remove = function patchedRemove(this: Element): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      logicalRemove(host, this)
      return
    }

    native.elementRemove.call(this)
  }

  Element.prototype.before = function patchedBefore(this: Element, ...nodes: Array<Node | string>): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      logicalInsertManyBefore(host, collectNodesForMutation(nodes), this)
      return
    }

    native.elementBefore.call(this, ...nodes)
  }

  Element.prototype.after = function patchedAfter(this: Element, ...nodes: Array<Node | string>): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      const state = getState(host)
      const nextSibling = state.logicalChildren[getLogicalIndex(state, this) + 1] ?? null
      logicalInsertManyBefore(host, collectNodesForMutation(nodes), nextSibling)
      return
    }

    native.elementAfter.call(this, ...nodes)
  }

  Element.prototype.replaceWith = function patchedReplaceWith(this: Element, ...nodes: Array<Node | string>): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      const state = getState(host)
      const nextSibling = state.logicalChildren[getLogicalIndex(state, this) + 1] ?? null
      logicalRemove(host, this)
      logicalInsertManyBefore(host, collectNodesForMutation(nodes), nextSibling)
      return
    }

    native.elementReplaceWith.call(this, ...nodes)
  }

  CharacterData.prototype.remove = function patchedCharacterDataRemove(this: CharacterData): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      logicalRemove(host, this)
      return
    }

    native.characterDataRemove.call(this)
  }

  CharacterData.prototype.before = function patchedCharacterDataBefore(this: CharacterData, ...nodes: Array<Node | string>): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      logicalInsertManyBefore(host, collectNodesForMutation(nodes), this)
      return
    }

    native.characterDataBefore.call(this, ...nodes)
  }

  CharacterData.prototype.after = function patchedCharacterDataAfter(this: CharacterData, ...nodes: Array<Node | string>): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      const state = getState(host)
      const nextSibling = state.logicalChildren[getLogicalIndex(state, this) + 1] ?? null
      logicalInsertManyBefore(host, collectNodesForMutation(nodes), nextSibling)
      return
    }

    native.characterDataAfter.call(this, ...nodes)
  }

  CharacterData.prototype.replaceWith = function patchedCharacterDataReplaceWith(this: CharacterData, ...nodes: Array<Node | string>): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      const state = getState(host)
      const nextSibling = state.logicalChildren[getLogicalIndex(state, this) + 1] ?? null
      logicalRemove(host, this)
      logicalInsertManyBefore(host, collectNodesForMutation(nodes), nextSibling)
      return
    }

    native.characterDataReplaceWith.call(this, ...nodes)
  }
}

if (!(Element.prototype as unknown as Record<PropertyKey, unknown>)[keepAliveAttributePatched]) {
  Object.defineProperty(Element.prototype, keepAliveAttributePatched, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  })

  Element.prototype.setAttribute = function patchedSetAttribute(this: Element, qualifiedName: string, value: string): void {
    native.setAttribute.call(this, qualifiedName, value)

    if (qualifiedName === 'data-keep-alive') {
      const host = getDirectLogicalHost(this)
      if (host) {
        scheduleReconcile(host)
      }
    }
  }

  Element.prototype.removeAttribute = function patchedRemoveAttribute(this: Element, qualifiedName: string): void {
    native.removeAttribute.call(this, qualifiedName)

    if (qualifiedName === 'data-keep-alive') {
      const host = getDirectLogicalHost(this)
      if (host) {
        scheduleReconcile(host)
      }
    }
  }

  Element.prototype.toggleAttribute = function patchedToggleAttribute(
    this: Element,
    qualifiedName: string,
    force?: boolean,
  ): boolean {
    const result = native.toggleAttribute.call(this, qualifiedName, force)

    if (qualifiedName === 'data-keep-alive') {
      const host = getDirectLogicalHost(this)
      if (host) {
        scheduleReconcile(host)
      }
    }

    return result
  }
}

if (!(Element.prototype as unknown as Record<PropertyKey, unknown>)[scrollIntoViewPatched]) {
  Object.defineProperty(Element.prototype, scrollIntoViewPatched, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  })

  Element.prototype.scrollIntoView = function patchedScrollIntoView(
    this: Element,
    arg?: boolean | ScrollIntoViewOptions,
  ): void {
    const host = getDirectLogicalHost(this)
    if (host) {
      scrollLogicalDirectChildIntoView(this, host, arg)
      return
    }

    native.elementScrollIntoView.call(this, arg)
  }
}

/**
 * Registers the custom element once and returns the constructor used for that tag.
 * Repeated calls are idempotent and return the previously defined class.
 */
export function defineVirtualScrollElement(tagName = HOST_TAG_NAME): typeof VirtualScrollElement {
  const existing = customElements.get(tagName)
  if (existing) {
    return existing as typeof VirtualScrollElement
  }

  customElements.define(tagName, VirtualScrollElement)
  return VirtualScrollElement
}
