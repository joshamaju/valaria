export function define(
  tag: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions,
) {
  if (!customElements.get(tag)) {
    customElements.define(tag, constructor, options);
  }
}

export class Widget extends HTMLElement {
  static define(
    tag: string,
    options?: ElementDefinitionOptions,
    element = this,
  ) {
    define(tag, element, options);
  }

  protected emit(type: string, init?: CustomEventInit<unknown> | undefined) {
    const event = new CustomEvent(type, init);
    this.dispatchEvent(event);
    return event;
  }
}

export function attr(name: string) {
  return `data-va-${name}`;
}
