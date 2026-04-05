import { beforeEach, describe, expect, test } from 'vitest'
import { defineVirtualScrollElement, VirtualScrollElement } from '../src'

defineVirtualScrollElement()

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function settle(): Promise<void> {
  await nextFrame()
  await nextFrame()
}

function createHost(): VirtualScrollElement {
  const host = document.createElement('virtual-scroll') as VirtualScrollElement
  host.setAttribute('axis', 'vertical')
  host.setAttribute('overscan', '0')
  host.style.display = 'block'
  host.style.height = '120px'
  host.style.overflow = 'auto'
  host.style.border = '0'
  document.body.append(host)
  return host
}

function createExternalScrollRoot(): HTMLDivElement {
  const root = document.createElement('div')
  root.id = 'external-root'
  root.style.height = '120px'
  root.style.overflow = 'auto'
  root.style.display = 'block'
  document.body.append(root)
  return root
}

function createDisconnectedHost(): VirtualScrollElement {
  const host = document.createElement('virtual-scroll') as VirtualScrollElement
  host.setAttribute('axis', 'vertical')
  host.setAttribute('overscan', '0')
  host.style.display = 'block'
  host.style.height = '120px'
  host.style.overflow = 'auto'
  host.style.border = '0'
  return host
}

function createSizedItem(label: string, className?: string): HTMLDivElement {
  const element = document.createElement('div')
  element.textContent = label
  element.style.height = '40px'
  if (className) {
    element.className = className
  }
  return element
}

describe('VirtualScrollElement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('virtualizes pre-existing children on connection', async () => {
    const host = createDisconnectedHost()

    for (let index = 0; index < 8; index += 1) {
      host.append(createSizedItem(`Item ${index}`, index === 6 ? 'target' : undefined))
    }

    document.body.append(host)
    await settle()

    expect(host.getAttribute('data-virtual-scroll-count')).toBe('8')
    expect(host.childNodes.length).toBe(8)
    expect(host.children.length).toBe(8)
    expect(host.querySelector('.target')?.textContent).toBe('Item 6')

    const physicalSpacers = Array.from(Element.prototype.querySelectorAll.call(host, '[data-virtual-scroll-spacer]'))
    expect(physicalSpacers.length).toBe(2)
  })

  test('hides runtime spacer elements from host child collections and selectors', async () => {
    const host = createHost()

    host.append(createSizedItem('A', 'alpha'))
    host.append(document.createTextNode('text child'))
    host.append(document.createComment('comment child'))
    host.append(createSizedItem('B', 'beta'))

    await settle()

    expect(host.childNodes.length).toBe(4)
    expect(host.children.length).toBe(2)
    expect(Array.from(host.querySelectorAll(':scope > *')).map((element) => element.className)).toEqual(['alpha', 'beta'])

    const physicalSpacerCount = Array.from(host.querySelectorAll('[data-virtual-scroll-spacer]')).length
    expect(physicalSpacerCount).toBe(0)
  })

  test('finds parked descendants through host-scoped logical queries', async () => {
    const host = createHost()
    host.setAttribute('overscan', '0')

    for (let index = 0; index < 10; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 9) {
        const descendant = document.createElement('span')
        descendant.className = 'parked-target'
        descendant.textContent = 'target'
        item.append(descendant)
      }
      host.append(item)
    }

    await settle()

    const target = host.querySelector('.parked-target')
    expect(target).not.toBeNull()
    expect(target?.textContent).toBe('target')
  })

  test('resolves invalid scroll-root selectors by falling back to the host', async () => {
    const host = createHost()
    host.setAttribute('scroll-root', '#missing-root')
    host.append(createSizedItem('Only item'))

    await settle()

    expect(host.getAttribute('data-virtual-scroll-scroll-root')).toBe('host')
  })

  test('supports closest back to the virtual scroll host for parked descendants', async () => {
    const host = createHost()
    for (let index = 0; index < 12; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 11) {
        const descendant = document.createElement('button')
        descendant.className = 'deep-target'
        descendant.textContent = 'Click'
        item.append(descendant)
      }
      host.append(item)
    }

    await settle()

    const target = host.querySelector('.deep-target')
    expect(target).not.toBeNull()
    expect(target?.closest('virtual-scroll')).toBe(host)
  })

  test('intercepts direct child remove and sibling mutation helpers at the host boundary', async () => {
    const host = createHost()
    const first = createSizedItem('A')
    const second = createSizedItem('B')
    const third = document.createTextNode('C')

    host.append(first, second, third)
    await settle()

    second.before(createSizedItem('Inserted before'))
    third.after(document.createComment('Inserted comment'))
    first.remove()
    await settle()

    expect(host.childNodes.length).toBe(4)
    expect(host.firstChild?.textContent).toBe('Inserted before')
    expect(host.lastChild?.nodeType).toBe(Node.COMMENT_NODE)
    expect(Array.from(host.childNodes).map((node) => node.textContent ?? node.nodeValue)).toEqual([
      'Inserted before',
      'B',
      'C',
      'Inserted comment',
    ])
  })

  test('treats host innerHTML as logical child markup', async () => {
    const host = createHost()
    host.innerHTML = '<div class="alpha">A</div><!--gap-->text<span class="beta">B</span>'
    await settle()

    expect(host.children.length).toBe(2)
    expect(host.childNodes.length).toBe(4)
    expect(host.querySelector('.alpha')?.textContent).toBe('A')
    expect(host.querySelector('.beta')?.textContent).toBe('B')
    expect(host.innerHTML).toContain('class="alpha"')
    expect(host.innerHTML).toContain('<!--gap-->')
    expect(host.innerHTML).toContain('text')
  })

  test('reacts to axis attribute changes', async () => {
    const host = createHost()
    host.append(createSizedItem('A'))
    host.append(createSizedItem('B'))

    await settle()

    host.setAttribute('axis', 'horizontal')
    await settle()

    expect(host.getAttribute('data-virtual-scroll-axis')).toBe('horizontal')
  })

  test('proxies host scroll APIs to an external scroll root', async () => {
    const root = createExternalScrollRoot()
    const spacer = document.createElement('div')
    spacer.style.height = '240px'
    root.append(spacer)

    const host = document.createElement('virtual-scroll') as VirtualScrollElement
    host.setAttribute('axis', 'vertical')
    host.setAttribute('overscan', '0')
    host.setAttribute('scroll-root', '#external-root')
    host.style.display = 'block'
    root.append(host)

    for (let index = 0; index < 12; index += 1) {
      host.append(createSizedItem(`Item ${index}`))
    }

    const tail = document.createElement('div')
    tail.style.height = '240px'
    root.append(tail)

    await settle()

    host.scrollTop = 80
    expect(root.scrollTop).toBe(80)
    expect(host.scrollTop).toBe(80)

    host.scrollBy({ top: 20 })
    expect(root.scrollTop).toBe(100)

    host.scrollTo({ top: 60 })
    expect(root.scrollTop).toBe(60)
    expect(host.scrollTop).toBe(60)
  })

  test('scrollIntoView mounts and scrolls parked logical direct children', async () => {
    const host = createHost()
    let target: HTMLDivElement | null = null

    for (let index = 0; index < 14; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 13) {
        item.className = 'scroll-target'
        target = item
      }
      host.append(item)
    }

    await settle()

    expect(target).not.toBeNull()
    expect(target?.parentNode === host).toBe(false)

    target?.scrollIntoView({ block: 'start' })
    await settle()

    expect(target?.parentNode).toBe(host)
    expect(host.scrollTop).toBeGreaterThan(0)
    expect(host.getAttribute('data-virtual-scroll-mounted-start')).not.toBe('0')
  })

  test('emits rangechange when the mounted logical range changes', async () => {
    const host = createHost()
    const events: Array<{
      start: number
      end: number
      count: number
      anchorIndex: number
      scrollRoot: 'host' | 'external' | 'window'
    }> = []

    host.addEventListener('rangechange', (event) => {
      events.push((event as CustomEvent<typeof events[number]>).detail)
    })

    for (let index = 0; index < 16; index += 1) {
      host.append(createSizedItem(`Item ${index}`))
    }

    await settle()

    const initialCount = events.length
    host.scrollTop = 320
    await settle()

    expect(events.length).toBeGreaterThan(initialCount)
    const detail = events.at(-1)
    expect(detail).toBeDefined()
    expect(detail?.count).toBe(16)
    expect(detail?.scrollRoot).toBe('host')
    expect(detail?.start).toBeGreaterThan(0)
    expect(detail?.end).toBeGreaterThanOrEqual(detail?.start ?? 0)
  })

  test('reconnects external scroll-root listeners after disconnect and reconnect', async () => {
    const root = createExternalScrollRoot()
    const spacer = document.createElement('div')
    spacer.style.height = '240px'
    root.append(spacer)

    const host = document.createElement('virtual-scroll') as VirtualScrollElement
    host.setAttribute('axis', 'horizontal')
    host.setAttribute('overscan', '0')
    host.setAttribute('scroll-root', '#external-root')
    host.style.display = 'block'
    host.style.whiteSpace = 'nowrap'
    root.append(host)

    for (let index = 0; index < 16; index += 1) {
      const item = document.createElement('div')
      item.textContent = `Item ${index}`
      item.style.display = 'inline-block'
      item.style.width = '120px'
      item.style.height = '40px'
      host.append(item)
    }

    await settle()

    host.remove()
    root.append(host)
    await settle()

    root.scrollLeft = 300
    await settle()

    expect(host.getAttribute('data-virtual-scroll-scroll-root')).toBe('external')
    expect(host.getAttribute('data-virtual-scroll-mounted-start')).not.toBe('0')
  })

  test('keeps a direct child mounted when it has data-keep-alive', async () => {
    const host = createHost()
    let retained: HTMLDivElement | null = null

    for (let index = 0; index < 14; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 12) {
        item.setAttribute('data-keep-alive', '')
        retained = item
      }
      host.append(item)
    }

    await settle()

    host.scrollTop = 0
    await settle()

    expect(retained).not.toBeNull()
    expect(retained?.parentNode).toBe(host)
    expect(retained?.getAttribute('data-virtual-scroll-retained')).toBe('true')
  })

  test('keeps a direct child mounted when keepAlive returns true', async () => {
    const host = createHost()
    let retained: HTMLDivElement | null = null

    for (let index = 0; index < 14; index += 1) {
      const item = createSizedItem(`Item ${index}`, index === 11 ? 'keep-me' : undefined)
      if (index === 11) {
        retained = item
      }
      host.append(item)
    }

    host.keepAlive = (child) => child instanceof Element && child.classList.contains('keep-me')
    await settle()

    host.scrollTop = 0
    await settle()

    expect(retained).not.toBeNull()
    expect(retained?.parentNode).toBe(host)
    expect(retained?.getAttribute('data-virtual-scroll-retained')).toBe('true')
  })

  test('reacts to data-keep-alive changes on a direct child', async () => {
    const host = createHost()
    let retained: HTMLDivElement | null = null

    for (let index = 0; index < 14; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 12) {
        retained = item
      }
      host.append(item)
    }

    await settle()

    expect(retained).not.toBeNull()
    expect(retained?.parentNode === host).toBe(false)

    retained?.setAttribute('data-keep-alive', '')
    await settle()

    expect(retained?.parentNode).toBe(host)
    expect(retained?.getAttribute('data-virtual-scroll-retained')).toBe('true')
  })

  test('reacts to dataset.keepAlive changes on a parked direct child', async () => {
    const host = createHost()
    let retained: HTMLDivElement | null = null

    for (let index = 0; index < 14; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 12) {
        retained = item
      }
      host.append(item)
    }

    await settle()

    expect(retained).not.toBeNull()
    expect(retained?.parentNode === host).toBe(false)

    if (retained) {
      retained.dataset.keepAlive = ''
    }
    await settle()

    expect(retained?.parentNode).toBe(host)
    expect(retained?.getAttribute('data-virtual-scroll-retained')).toBe('true')
  })

  test('retains the focused direct child outside the visible range', async () => {
    const host = createHost()
    let focusedItem: HTMLDivElement | null = null
    let input: HTMLInputElement | null = null

    for (let index = 0; index < 14; index += 1) {
      const item = createSizedItem(`Item ${index}`)
      if (index === 13) {
        const field = document.createElement('input')
        field.value = 'focus me'
        item.append(field)
        focusedItem = item
        input = field
      }
      host.append(item)
    }

    await settle()

    host.scrollTop = 520
    await settle()

    input?.focus()
    await settle()

    host.scrollTop = 0
    await settle()

    expect(document.activeElement).toBe(input)
    expect(focusedItem?.parentNode).toBe(host)
    expect(focusedItem?.getAttribute('data-virtual-scroll-retained')).toBe('true')

    host.scrollTop = 520
    await settle()

    expect(document.activeElement).toBe(input)
    expect(focusedItem?.parentNode).toBe(host)
  })
})
