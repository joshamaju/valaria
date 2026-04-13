// @ts-check

/**
 * Shared helpers for the example gallery.
 *
 * These are intentionally lightweight and imperative: examples should focus on
 * demonstrating virtual-scroll behavior rather than carrying repeated shell/setup code.
 */

/**
 * @typedef {HTMLElement & {
 *   axis: 'vertical' | 'horizontal'
 *   overscan: number
 *   scrollRoot: Window | Element
 *   keepAlive: ((child: Node) => boolean) | null
 * }} VirtualScrollElement
 */

/**
 * @typedef {object} ExampleContext
 * @property {VirtualScrollElement} host
 * @property {HTMLElement} outlet
 * @property {HTMLElement} controls
 */

/**
 * @param {string} title
 * @param {string} description
 * @returns {ExampleContext}
 */
export function createExampleShell(title, description) {
  const main = document.querySelector("main");
  if (!(main instanceof HTMLElement)) {
    throw new Error("Expected a <main> element");
  }

  main.innerHTML = "";

  const hero = document.createElement("section");
  hero.className = "hero";
  hero.innerHTML = `
    <h1>${title}</h1>
    <p>${description}</p>
  `;

  const chrome = document.createElement("section");
  chrome.className = "chrome layout";

  const controls = document.createElement("div");
  controls.className = "controls";

  const outlet = document.createElement("div");
  outlet.className = "layout";

  chrome.append(controls, outlet);
  main.append(hero, chrome);

  const host = /** @type {VirtualScrollElement} */ (
    /** @type {unknown} */ (document.createElement("virtual-scroll"))
  );

  return { host, outlet, controls };
}

/**
 * Applies the baseline authored layout expected by vertical examples.
 *
 * @param {VirtualScrollElement} host
 */
export function applyVerticalHostStyles(host) {
  host.setAttribute("axis", "vertical");
  host.className = "vertical-host";
}

/**
 * Applies the baseline authored layout expected by horizontal examples.
 *
 * @param {VirtualScrollElement} host
 */
export function applyHorizontalHostStyles(host) {
  host.setAttribute("axis", "horizontal");
  host.className = "horizontal-host";
}

/**
 * Creates a simple variable-height card for list-style examples.
 *
 * @param {number} index
 * @param {string} [extraText]
 * @returns {HTMLElement}
 */
export function createCard(index, extraText = "") {
  const card = document.createElement("article");
  card.className = "stack-card";
  card.innerHTML = `
    <h3>Record ${index + 1}</h3>
    <p>
      This child has authored layout, variable content, and no runtime-owned dimensions.
      ${extraText}
    </p>
  `;
  return card;
}

/**
 * Creates a rich inline-SVG media card without requiring network access.
 *
 * @param {number} index
 * @returns {HTMLElement}
 */
export function createMediaCard(index) {
  const card = document.createElement("article");
  card.className = "media-card";

  const aspect = ["4 / 3", "16 / 9", "1 / 1", "5 / 4"][index % 4];
  const palette = [
    ["#f7b267", "#f4845f", "#f27059"],
    ["#84dcc6", "#95a3ff", "#c3bef0"],
    ["#ffd670", "#e9ff70", "#70d6ff"],
    ["#cdb4db", "#ffc8dd", "#bde0fe"],
  ][index % 4];

  const title = `Gallery Item ${index + 1}`;
  const subtitle = [
    "Responsive imagery with authored aspect ratios and variable captions.",
    "A mixed-content child with badges, metadata, and wrapped descriptive text.",
    "An example that exercises image layout without any runtime-owned child dimensions.",
    "Media content should resize naturally and still play well with virtualization.",
  ][index % 4];

  const caption = [
    "Late-afternoon light, layered paper textures, and compact product framing.",
    "Wide editorial crop with extra annotation to create a taller card footprint.",
    "Square image treatment with short copy for a denser rhythm between items.",
    "Balanced landscape treatment with a slightly longer summary and metadata.",
  ][index % 4];

  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="50%" stop-color="${palette[1]}"/>
          <stop offset="100%" stop-color="${palette[2]}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#g)"/>
      <circle cx="920" cy="220" r="170" fill="rgba(255,255,255,0.2)"/>
      <circle cx="260" cy="700" r="220" fill="rgba(255,255,255,0.14)"/>
      <rect x="140" y="120" width="420" height="520" rx="38" fill="rgba(255,255,255,0.28)"/>
      <rect x="620" y="300" width="420" height="300" rx="28" fill="rgba(16,24,40,0.12)"/>
      <text x="150" y="760" font-family="IBM Plex Sans, Arial, sans-serif" font-size="60" font-weight="700" fill="rgba(23,23,23,0.68)">
        ${title}
      </text>
    </svg>
  `);

  card.innerHTML = `
    <figure class="media-card__figure">
      <img
        class="media-card__image"
        src="data:image/svg+xml;charset=utf-8,${svg}"
        alt="${title}"
        style="aspect-ratio: ${aspect};"
      />
    </figure>
    <div class="media-card__body">
      <div class="media-card__eyebrow">
        <span class="media-pill">Image</span>
        <span class="media-pill media-pill--alt">${index % 2 === 0 ? "Featured" : "Archive"}</span>
      </div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
      <p class="media-card__caption">${caption}</p>
    </div>
  `;

  return card;
}

/**
 * Creates a remote-image card that exercises native image loading and resize handling.
 *
 * @param {number} index
 * @returns {HTMLElement}
 */
export function createRemoteMediaCard(index) {
  const card = document.createElement("article");
  card.className = "media-card";

  const widths = [960, 1200, 900, 1280];
  const heights = [720, 800, 900, 768];
  const width = widths[index % widths.length];
  const height = heights[index % heights.length];
  const seed = `virtual-scroll-remote-${index + 1}`;
  const title = `Remote Story ${index + 1}`;
  const src = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;

  const subtitle = [
    "Remote imagery arriving after initial layout should still settle into the measured card footprint cleanly.",
    "This card mixes a network image with wrapped copy and metadata to exercise resize observation on mounted children.",
    "The content is authored normally and relies on native image sizing rather than runtime-owned child dimensions.",
    "This example is intended to surface real-world image loading behavior during virtualization.",
  ][index % 4];

  const caption = [
    "Seeded remote image with a denser caption block and an editorial-style summary.",
    "A taller remote asset combined with a compact copy treatment and badge row.",
    "Medium-length remote content that should remeasure cleanly once the image finishes loading.",
    "A broader image crop with a slightly shorter caption to vary the final card height.",
  ][index % 4];

  card.innerHTML = `
    <figure class="media-card__figure">
      <img
        class="media-card__image"
        src="${src}"
        alt="${title}"
        width="${width}"
        height="${height}"
        loading="lazy"
      />
    </figure>
    <div class="media-card__body">
      <div class="media-card__eyebrow">
        <span class="media-pill">Remote Image</span>
        <span class="media-pill media-pill--alt">${index % 2 === 0 ? "Network" : "Lazy"}</span>
      </div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
      <p class="media-card__caption">${caption}</p>
    </div>
  `;

  return card;
}

/**
 * Creates a horizontally sized chip used by horizontal virtualization examples.
 *
 * @param {number} index
 * @returns {HTMLElement}
 */
export function createChip(index) {
  const chip = document.createElement("article");
  chip.className = "chip";
  chip.style.width = `${160 + (index % 5) * 60}px`;
  chip.textContent = `Tile ${index + 1}`;
  return chip;
}

/**
 * Creates a button wired to an example action.
 *
 * @param {string} label
 * @param {() => void} onClick
 * @param {string} [className]
 * @returns {HTMLButtonElement}
 */
export function createButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

/**
 * Attaches the host into the example shell's outlet region.
 *
 * @param {ExampleContext} context
 * @param {VirtualScrollElement} host
 */
export function mountHost(context, host) {
  context.outlet.append(host);
}

/**
 * Creates an example caption/output element.
 *
 * @param {ExampleContext} context
 * @param {string} text
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function addCaption(context, text, className = "caption") {
  const caption = document.createElement("p");
  caption.className = className;
  caption.textContent = text;
  context.outlet.prepend(caption);
  return caption;
}

/**
 * @param {VirtualScrollElement} host
 * @param {Iterable<Node>} items
 */
export function appendMany(host, items) {
  for (const item of items) {
    host.append(item);
  }
}

/**
 * @param {VirtualScrollElement} host
 * @param {HTMLElement} container
 */
export function setDebugMirror(host, container) {
  const render = () => {
    container.innerHTML = "";
    const keys = [
      "data-virtual-scroll-axis",
      "data-virtual-scroll-count",
      "data-virtual-scroll-mounted-start",
      "data-virtual-scroll-mounted-end",
      "data-virtual-scroll-anchor-index",
      "data-virtual-scroll-scroll-root",
    ];

    for (const key of keys) {
      const line = document.createElement("div");
      line.textContent = `${key}: ${host.getAttribute(key)}`;
      container.append(line);
    }
  };

  render();
  const observer = new MutationObserver(render);
  observer.observe(host, { attributes: true });
}
