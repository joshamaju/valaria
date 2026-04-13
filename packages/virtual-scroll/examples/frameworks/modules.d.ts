declare module 'react' {
  const React: any
  export default React
  export const Fragment: any
  export const useState: any
}

declare module 'react-dom/client' {
  export const createRoot: any
}

declare module 'preact' {
  export const h: any
  export const Fragment: any
  export const render: any
}

declare module 'preact/hooks' {
  export const useState: any
}

declare module 'vue' {
  export const createApp: any
  export const h: any
  export const ref: any
}

declare module 'lit' {
  export const html: any
  export const render: any
}

declare module 'solid-js' {
  export const createSignal: any
}

declare module 'solid-js/web' {
  export const render: any
}

declare module 'solid-js/html' {
  const html: any
  export default html
}

declare module 'svelte' {
  export const mount: any
}

declare module 'svelte/compiler' {
  export const compile: any
}
