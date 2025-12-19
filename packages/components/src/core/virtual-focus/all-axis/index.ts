import { VirtualFocus } from "../linear.js";
import { compute, move } from "./utils.js";

export class VirtualFocusAllAxis extends VirtualFocus {
  static TAG_NAME = "va-virtual-focus-all-axis";

  handleDocumentKeyDown = (event: KeyboardEvent) => {
    const options = this.getChildren();
    const currentOption = this.currentOption ?? options[0];

    const grid = compute(this, [...options]);

    let currentX = null;
    let currentY = null;

    for (let i = 0; i < grid.length; i++) {
      const page = grid[i];

      if (!page) continue;

      for (let j = 0; j < page.length; j++) {
        const item = page[j];

        // @ts-expect-error
        if (item?.isSameNode(currentOption)) {
          [currentX, currentY] = [j, i];
          break;
        }
      }

      if (currentY) break;
    }

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

      currentX ??= 0;
      currentY ??= 0;

      let newX = currentX;
      let newY = currentY;

      if (event.key === "ArrowDown") {
        const [x, y] = move(grid, {
          direction: "down",
          x: currentX,
          y: currentY,
          loop,
        });

        [newX, newY] = [x, y];
      } else if (event.key === "ArrowRight") {
        const [x, y] = move(grid, {
          direction: "right",
          x: currentX,
          y: currentY,
        });

        [newX, newY] = [x, y];
      } else if (event.key === "ArrowUp") {
        const [x, y] = move(grid, {
          direction: "up",
          x: currentX,
          y: currentY,
          loop,
        });

        [newX, newY] = [x, y];
      } else if (event.key === "ArrowLeft") {
        const [x, y] = move(grid, {
          direction: "left",
          x: currentX,
          y: currentY,
        });

        [newX, newY] = [x, y];
      } else if (event.key == "Home") {
        [newX, newY] = [0, 0];
      } else if (event.key == "End") {
        [newX, newY] = [grid[grid.length - 1]!.length - 1, grid.length - 1];
      }

      this.activeElement = grid[newY]?.[newX];
    }
  };
}
