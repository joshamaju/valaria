// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createButton,
  createCard,
  createExampleShell,
  createMediaCard,
  createRemoteMediaCard,
} from "./shared.js";

const TOTAL_ITEMS = 960;
const APPEND_BATCH = 24;
const PREPEND_BATCH = 12;
const CHAOS_INTERVAL_MS = 850;

const nativeChildNodesGetter = Object.getOwnPropertyDescriptor(
  Node.prototype,
  "childNodes",
)?.get;

const context = createExampleShell(
  "Stress Lab",
  "A high-pressure sandbox with mixed node types, remote images, mutation storms, scroll-root switching, and live virtualization stats.",
);

/** @type {'host' | 'external' | 'window'} */
let mode = "host";
/** @type {number | null} */
let chaosTimer = null;
/** @type {number | null} */
let debugFrame = null;
let nextIndex = 0;

const mountZone = document.createElement("section");
mountZone.className = "layout";

const externalRoot = document.createElement("section");
externalRoot.className = "external-scroll-root";
externalRoot.id = "stress-external-root";

const externalLead = document.createElement("div");
externalLead.className = "notice";
externalLead.textContent =
  "External root mode: the host scroll APIs should proxy into this panel.";

const windowLead = document.createElement("div");
windowLead.className = "window-spacer";

const windowIntro = document.createElement("div");
windowIntro.className = "notice";
windowIntro.textContent =
  "Window mode: the page scrolls while the host remains a logical viewport target.";

const windowTail = document.createElement("div");
windowTail.className = "window-spacer";

const debugPanel = document.createElement("section");
debugPanel.className = "debug-panel";
/** @type {Map<string, HTMLDivElement>} */
const debugRows = new Map();

const status = document.createElement("output");
status.textContent = "Mode: host. Chaos: off.";

const modeSelect = document.createElement("select");
modeSelect.innerHTML = `
  <option value="host">Host Scroll Root</option>
  <option value="external">External Scroll Root</option>
  <option value="window">Window Scroll Root</option>
`;

/**
 * @param {number} index
 */
function createDenseRow(index) {
  const row = document.createElement("article");
  row.className = "dense-row";
  row.innerHTML = `
    <strong>Dense Row ${index + 1}</strong>
    <span>compact metrics</span>
    <span>${(index % 12) + 1} signals</span>
  `;
  return row;
}

/**
 * @param {number} index
 */
function createExpandableCard(index) {
  const card = document.createElement("article");
  card.className = "stack-card";
  card.innerHTML = `
    <h3>Interactive Item ${index + 1}</h3>
    <p>
      This card owns local interactive state. Expanding it should change its height and trigger
      mounted direct-child resize observation.
    </p>
    <button type="button" class="stress-expand-toggle">Expand details</button>
  `;

  const note = document.createElement("div");
  note.className = "child-state-note";
  note.hidden = true;
  note.textContent =
    "Expanded detail block: extra metadata, simulated diagnostics, and additional copy to stretch the card.";
  card.append(note);

  const button = /** @type {HTMLButtonElement | null} */ (
    card.querySelector(".stress-expand-toggle")
  );
  button?.addEventListener("click", () => {
    const expanded = note.hidden;
    note.hidden = !expanded;
    if (button) {
      button.textContent = expanded ? "Collapse details" : "Expand details";
    }
  });

  return card;
}

/**
 * @param {number} index
 * @returns {Node}
 */
function createStressNode(index) {
  switch (index % 8) {
    case 0:
      return document.createComment(`stress-comment-${index + 1}`);
    case 1:
      return document.createTextNode(
        `Loose text node ${index + 1}. This is part of the logical child list and helps stress mixed node-type virtualization.`,
      );
    case 2:
      return createCard(index, "Baseline card content in a large mixed feed.");
    case 3:
      return createMediaCard(index);
    case 4:
      return createRemoteMediaCard(index);
    case 5:
      return createExpandableCard(index);
    case 6:
      return createDenseRow(index);
    default:
      return document.createTextNode(
        `Another text node ${index + 1}. It adds wrapped copy and spacing pressure to the mounted range.`,
      );
  }
}

/**
 * @param {number} count
 * @returns {Node[]}
 */
function createBatch(count) {
  return Array.from({ length: count }, () => {
    const node = createStressNode(nextIndex);
    nextIndex += 1;
    return node;
  });
}

function getPhysicalChildren() {
  const getter = nativeChildNodesGetter;
  if (!getter) {
    return [];
  }

  return Array.from(
    /** @type {NodeListOf<ChildNode>} */ (getter.call(context.host)),
  );
}

function getMountedLogicalCount() {
  return getPhysicalChildren().filter((node) => {
    return !(
      node instanceof HTMLElement &&
      node.hasAttribute("data-virtual-scroll-spacer")
    );
  }).length;
}

function getActiveScrollTop() {
  if (mode === "window") {
    return window.scrollY;
  }

  if (mode === "external") {
    return externalRoot.scrollTop;
  }

  return context.host.scrollTop;
}

function updateStatus() {
  status.textContent = `Mode: ${mode}. Chaos: ${chaosTimer == null ? "off" : "on"}. Logical children: ${context.host.childNodes.length}.`;
}

/**
 * @param {string} key
 */
function ensureDebugRow(key) {
  let row = debugRows.get(key);
  if (!row) {
    row = document.createElement("div");
    debugRows.set(key, row);
    debugPanel.append(row);
  }
  return row;
}

function renderDebug() {
  const lines = {
    "logical child count": String(context.host.childNodes.length),
    "logical element count": String(context.host.children.length),
    "mounted physical logical children": String(getMountedLogicalCount()),
    "mounted start": context.host.getAttribute(
      "data-virtual-scroll-mounted-start",
    ),
    "mounted end": context.host.getAttribute("data-virtual-scroll-mounted-end"),
    "anchor index": context.host.getAttribute(
      "data-virtual-scroll-anchor-index",
    ),
    "scroll root mode": context.host.getAttribute(
      "data-virtual-scroll-scroll-root",
    ),
    "active scrollTop": String(Math.round(getActiveScrollTop())),
    "host scrollHeight": String(Math.round(context.host.scrollHeight)),
    "host clientHeight": String(Math.round(context.host.clientHeight)),
  };

  for (const [key, value] of Object.entries(lines)) {
    ensureDebugRow(key).textContent = `${key}: ${value}`;
  }

  updateStatus();
}

function scheduleDebugRender() {
  if (debugFrame != null) {
    return;
  }

  debugFrame = requestAnimationFrame(() => {
    debugFrame = null;
    renderDebug();
  });
}

function applyHostMode() {
  mode = "host";
  mountZone.innerHTML = "";
  applyVerticalHostStyles(context.host);
  context.host.removeAttribute("scroll-root");
  mountZone.append(context.host);
  externalRoot.scrollTop = 0;
  window.scrollTo({ top: 0, left: window.scrollX, behavior: "auto" });
  scheduleDebugRender();
}

function applyExternalMode() {
  mode = "external";
  mountZone.innerHTML = "";
  context.host.className = "";
  context.host.style.display = "block";
  context.host.style.padding = "12px";
  context.host.style.margin = "0";
  context.host.setAttribute("scroll-root", "#stress-external-root");
  externalRoot.replaceChildren(externalLead, context.host);
  mountZone.append(externalRoot);
  externalRoot.scrollTop = 0;
  scheduleDebugRender();
}

function applyWindowMode() {
  mode = "window";
  mountZone.innerHTML = "";
  context.host.className = "";
  context.host.style.display = "block";
  context.host.style.padding = "12px";
  context.host.style.margin = "0";
  context.host.setAttribute("scroll-root", "window");
  mountZone.append(windowLead, windowIntro, context.host, windowTail);
  window.scrollTo({ top: 0, left: window.scrollX, behavior: "auto" });
  scheduleDebugRender();
}

/**
 * @param {'host' | 'external' | 'window'} nextMode
 */
function applyMode(nextMode) {
  if (nextMode === "external") {
    applyExternalMode();
    return;
  }

  if (nextMode === "window") {
    applyWindowMode();
    return;
  }

  applyHostMode();
}

function appendBatch() {
  appendMany(context.host, createBatch(APPEND_BATCH));
  scheduleDebugRender();
}

function prependBatch() {
  context.host.prepend(...createBatch(PREPEND_BATCH));
  scheduleDebugRender();
}

function removeRandomNode() {
  const nodes = Array.from(context.host.childNodes);
  if (nodes.length <= 160) {
    return;
  }

  const index = Math.floor(Math.random() * nodes.length);
  nodes[index]?.remove();
  scheduleDebugRender();
}

function moveRandomNode() {
  const nodes = Array.from(context.host.childNodes);
  if (nodes.length < 4) {
    return;
  }

  const fromIndex = Math.floor(Math.random() * nodes.length);
  const toIndex = Math.floor(Math.random() * nodes.length);
  if (fromIndex === toIndex) {
    return;
  }

  const node = nodes[fromIndex];
  const reference = nodes[toIndex] ?? null;
  if (!node) {
    return;
  }

  context.host.insertBefore(node, reference);
  scheduleDebugRender();
}

function toggleMountedExpansion() {
  const buttons = getPhysicalChildren().flatMap((node) => {
    if (!(node instanceof HTMLElement)) {
      return [];
    }

    return Array.from(node.querySelectorAll(".stress-expand-toggle"));
  });

  if (buttons.length === 0) {
    return;
  }

  const button = buttons[Math.floor(Math.random() * buttons.length)];
  if (button instanceof HTMLButtonElement) {
    button.click();
  }

  scheduleDebugRender();
}

function runChaosStep() {
  const actions = [
    appendBatch,
    prependBatch,
    removeRandomNode,
    moveRandomNode,
    toggleMountedExpansion,
  ];
  const action = actions[Math.floor(Math.random() * actions.length)];
  action?.();
}

function handleScrollDebug() {
  if (mode === "host") {
    scheduleDebugRender();
  }
}

function handleExternalScrollDebug() {
  if (mode === "external") {
    scheduleDebugRender();
  }
}

function handleWindowScrollDebug() {
  if (mode === "window") {
    scheduleDebugRender();
  }
}

function toggleChaos() {
  if (chaosTimer != null) {
    window.clearInterval(chaosTimer);
    chaosTimer = null;
    scheduleDebugRender();
    return;
  }

  chaosTimer = window.setInterval(runChaosStep, CHAOS_INTERVAL_MS);
  scheduleDebugRender();
}

modeSelect.addEventListener("change", () => {
  applyMode(/** @type {'host' | 'external' | 'window'} */ (modeSelect.value));
});

context.controls.append(
  modeSelect,
  createButton("Scroll Top", () => {
    context.host.scrollTo({ top: 0, behavior: "smooth" });
  }),
  createButton("Scroll Down 1200", () => {
    context.host.scrollBy({ top: 1200, behavior: "smooth" });
  }),
  createButton(
    "Tail Into View",
    () => {
      context.host.lastElementChild?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    },
    "alt",
  ),
  createButton("Append 24", appendBatch),
  createButton("Prepend 12", prependBatch, "alt"),
  createButton("Chaos Mode", toggleChaos),
  status,
);

appendMany(context.host, createBatch(TOTAL_ITEMS));
context.outlet.append(mountZone, debugPanel);

context.host.addEventListener("scroll", handleScrollDebug, { passive: true });
externalRoot.addEventListener("scroll", handleExternalScrollDebug, {
  passive: true,
});
window.addEventListener("scroll", handleWindowScrollDebug, { passive: true });

new MutationObserver(scheduleDebugRender).observe(context.host, {
  attributes: true,
});

applyHostMode();
renderDebug();
