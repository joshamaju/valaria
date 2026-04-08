import { isFocusable } from "tabbable";
import { attr, Widget } from "../widget.js";
import { findNextFocusable } from "./utils.js";

const ITEM_FOCUS_EVENT = "focus";
const ITEM_FOCUSOUT_EVENT = "focusout";

const ACTIVE_ATTRIBUTE = attr("virtual-focus-active");

export class VirtualFocus extends Widget {
  static TAG_NAME = "va-virtual-focus";

  static observedAttributes = ["mount", "wrap", "loop", "preserve"];

  protected currentOption?: Element | HTMLElement | undefined | null;

  get activeElement() {
    return this.currentOption;
  }

  set activeElement(element: HTMLElement | Element | undefined | null) {
    const event = this.emit("change", {
      detail: { target: element },
      cancelable: true,
      bubbles: true,
    });

    if (event.defaultPrevented) return;

    this.currentOption?.removeAttribute(ACTIVE_ATTRIBUTE);
    this.currentOption = element;
    this.currentOption?.setAttribute(ACTIVE_ATTRIBUTE, "true");
  }

  disconnectedCallback() {
    this.unmount();
  }

  connectedCallback() {
    if (this.hasAttribute("mount")) this.mount();
  }

  attributeChangedCallback(name: any, oldValue: any, newValue: any) {
    if (name === "mount") {
      if (this.hasAttribute("mount")) {
        this.mount();
      } else {
        this.unmount();
      }
    }
  }

  public mount() {
    console.log("mounted");

    this.activeElement =
      this.currentOption ??
      this.querySelector(`[${attr("virtual-focus-current")}]`);

    const children = this.getChildren();

    children.forEach((_) => {
      _.addEventListener(ITEM_FOCUS_EVENT, this.itemFocus);
      _.addEventListener(ITEM_FOCUSOUT_EVENT, this.itemFocusOut);
    });

    document.addEventListener("keydown", this.handleDocumentKeyDown);
  }

  public unmount() {
    console.log("unmounted");

    this.currentOption?.removeAttribute(ACTIVE_ATTRIBUTE);

    if (!this.hasAttribute("preserve")) this.currentOption = undefined;

    const children = this.getChildren();

    children.forEach((_) => {
      _.removeEventListener(ITEM_FOCUS_EVENT, this.itemFocus);
      _.removeEventListener(ITEM_FOCUSOUT_EVENT, this.itemFocusOut);
    });

    document.removeEventListener("keydown", this.handleDocumentKeyDown);
  }

  protected getChildren() {
    return this.querySelectorAll(`[${attr("virtual-focus")}]`);
  }

  protected itemFocus = (e: Event) => {
    e.stopPropagation();
    this.activeElement = e.target as HTMLElement;
  };

  protected itemFocusOut = (e: Event) => {
    e.stopPropagation();
    this.activeElement = undefined;
  };

  protected handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      const loop = this.hasAttribute("loop");
      const options = [...this.getChildren()];
      const focusables = options.filter((_) => isFocusable(_));

      // @ts-expect-error
      const index = focusables.indexOf(this.currentOption);

      let newFocusable = null;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        newFocusable = findNextFocusable(focusables, index, "forward", loop);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        newFocusable = findNextFocusable(focusables, index, "backward", loop);
      } else if (event.key === "Home") {
        newFocusable = focusables[0];
      } else if (event.key === "End") {
        newFocusable = focusables[focusables.length - 1];
      }

      if (!newFocusable) return;

      this.activeElement = newFocusable;
    }
  };
}
