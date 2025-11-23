// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

function createKonvaMock() {
  type Handler = (evt?: any) => void;
  class FakeNode {
    config: Record<string, any>;
    children: any[] = [];
    handlers = new Map<string, Handler>();
    constructor(config: Record<string, any> = {}) {
      this.config = { ...config };
    }
    add(...nodes: any[]) {
      this.children.push(...nodes);
      return this;
    }
    getChildren() {
      return this.children;
    }
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    fire(event: string, payload?: any) {
      this.handlers.get(event)?.(payload);
    }
    accessor(key: string, fallback: any = 0) {
      return (value?: any) => {
        if (value !== undefined) this.config[key] = value;
        return this.config[key] ?? fallback;
      };
    }
    width = this.accessor("width", 100);
    height = this.accessor("height", 50);
    x = this.accessor("x", 0);
    y = this.accessor("y", 0);
    fill = this.accessor("fill", "");
    stroke = this.accessor("stroke", "");
    strokeWidth = this.accessor("strokeWidth", 0);
    opacity = this.accessor("opacity", 1);
    cornerRadius = this.accessor("cornerRadius", 0);
    offsetX = this.accessor("offsetX", 0);
    offsetY = this.accessor("offsetY", 0);
    scale(val?: any) {
      if (val !== undefined) this.config.scale = val;
      return this.config.scale ?? { x: 1, y: 1 };
    }
    moveToBottom() {}
    moveToTop() {}
    destroy() {
      this.config.destroyed = true;
    }
    listening(val?: boolean) {
      if (val !== undefined) this.config.listening = val;
      return this.config.listening ?? true;
    }
  }
  class FakeStage extends FakeNode {
    containerElement = { style: { cursor: "default" } };
    constructor(config: Record<string, any>) {
      super(config);
    }
    container() {
      return this.containerElement;
    }
    add(node: any) {
      this.children.push(node);
      return this;
    }
  }
  class FakeLayer extends FakeNode {
    draw = vi.fn();
    batchDraw = vi.fn();
    destroyChildren = vi.fn(() => {
      this.children = [];
    });
  }
  class FakeGroup extends FakeNode {}
  class FakeRect extends FakeNode {}
  class FakeText extends FakeNode {
    text = this.accessor("text", "");
  }
  class FakeCircle extends FakeNode {
    radius = this.accessor("radius", 0);
  }
  class FakeImage extends FakeNode {
    image(value?: any) {
      if (value !== undefined) this.config.image = value;
      return this.config.image;
    }
  }
  return {
    default: {
      Stage: FakeStage,
      Layer: FakeLayer,
      Group: FakeGroup,
      Rect: FakeRect,
      Text: FakeText,
      Image: FakeImage,
      Circle: FakeCircle,
    },
  };
}

describe("ShoppingScreen full coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function stubImages(options: { priceTagError?: boolean; receiptError?: boolean } = {}) {
    vi.stubGlobal(
      "Image",
      class {
        _src = "";
        _onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 100;
        height = 50;
        set src(val: string) {
          this._src = val;
          const failPrice = val.includes("price-tag") && options.priceTagError;
          const failReceipt = val.includes("start-receipt") && options.receiptError;
          if (failPrice || failReceipt) {
            this.onerror?.();
          } else {
            this._onload?.();
          }
        }
        get src() {
          return this._src;
        }
        set onload(fn: (() => void) | null) {
          this._onload = fn;
          const failPrice = this._src.includes("price-tag") && options.priceTagError;
          const failReceipt = this._src.includes("start-receipt") && options.receiptError;
          if (fn && this._src && !failPrice && !failReceipt) {
            fn();
          }
        }
        get onload() {
          return this._onload;
        }
      }
    );
  }

  it("exercises purchase flow, totals, keyboard, recipe and receipt", async () => {
    stubImages();
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { ShoppingScreen } = await import("./ShoppingScreen");
    const Konva = (await import("konva")).default as any;
    const stage = new Konva.Stage({ width: 1000, height: 800, container: {} });
    const layer = new Konva.Layer();
    const onPurchaseComplete = vi.fn();
    const onViewRecipe = vi.fn();

    const screen: any = new ShoppingScreen(
      stage,
      layer,
      20,
      1,
      5,
      [{ customerNum: 1, cookieCount: 2 }],
      onPurchaseComplete,
      onViewRecipe
    );

    // cover early return in handleKeyPress
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "1" }));

    // focus input and type/backspace
    const tmpRect = new Konva.Rect();
    const tmpText = new Konva.Text();
    screen.focusInput("Flour", tmpRect, tmpText);
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "3" }));
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "Backspace" }));

    // totals color branches
    screen.ingredients[0].inputValue = "100";
    if (!screen.totalCostText) screen.totalCostText = new Konva.Text();
    screen.updateTotalCost();
    screen.currentFunds = 1000;
    screen.updateTotalCost();

    // update display and get values
    screen.updateInputDisplay("Flour");
    expect(screen.getIngredientValues().size).toBeGreaterThan(0);

    // purchase success first (set affordable)
    screen.ingredients[0].inputValue = "1";
    screen.currentFunds = 20;
    let purchaseButton = layer
      .getChildren()
      .find((c: any) =>
        c.getChildren?.().some((n: any) => n.text?.() === "PURCHASE")
      );
    if (!purchaseButton && typeof screen.createPurchaseButton === "function") {
      screen.createPurchaseButton(stage.width(), 0);
      purchaseButton = layer
        .getChildren()
        .find((c: any) =>
          c.getChildren?.().some((n: any) => n.text?.() === "PURCHASE")
        );
    }
    expect(purchaseButton).toBeDefined();
    purchaseButton?.fire("mouseenter");
    purchaseButton?.fire("mouseleave");
    purchaseButton?.fire("click");
    expect(onPurchaseComplete).toHaveBeenCalled();

    // View recipe button hover + click triggers cleanup/onViewRecipe
    const viewRecipeButton = layer
      .getChildren()
      .find((c: any) =>
        c.getChildren?.().some((n: any) => n.text?.() === "VIEW RECIPE")
      );
    viewRecipeButton?.fire("mouseenter");
    viewRecipeButton?.fire("mouseleave");
    viewRecipeButton?.fire("click");

    // view orders modal open/close
    const viewOrdersButton = layer
      .getChildren()
      .find((c: any) =>
        c.getChildren?.().some((n: any) => n.text?.() === "VIEW ORDERS")
      );
    viewOrdersButton?.fire("click");
    const modalLayer = stage.getChildren().find((n: any) => n.getChildren?.().length);
    const closeCircle = modalLayer
      ?.getChildren()
      .find((n: any) => n.handlers?.has("click"));
    closeCircle?.fire("mouseenter");
    closeCircle?.fire("mouseleave");
    closeCircle?.fire("click");

    // insufficient funds branch
    screen.currentFunds = 0;
    screen.ingredients[0].inputValue = "5";
    window.alert = vi.fn();
    purchaseButton?.fire("click");
    expect(window.alert).toHaveBeenCalled();

    // cleanup removes listener
    const removeSpy = vi.spyOn(window, "removeEventListener");
    screen.cleanup();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("uses saved values and price-tag fallback branch", async () => {
    stubImages({ priceTagError: true });
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { ShoppingScreen } = await import("./ShoppingScreen");
    const Konva = (await import("konva")).default as any;
    const saved = new Map<string, string>([
      ["Flour", "7"],
      ["Sugar", "4"],
    ]);
    const stage = new Konva.Stage({ width: 600, height: 400, container: {} });
    const layer = new Konva.Layer();
    const onPurchaseComplete = vi.fn();
    const onViewRecipe = vi.fn();
    const screen: any = new ShoppingScreen(
      stage,
      layer,
      50,
      2,
      8,
      [{ customerNum: 1, cookieCount: 3 }],
      onPurchaseComplete,
      onViewRecipe,
      saved
    );

    // ensure saved values restored
    expect(screen.ingredients.find((i: any) => i.name === "Flour")?.inputValue).toBe("7");

    // call showReceiptModal directly to cover image onload path
    screen.showReceiptModal();
    const modalLayer = stage.getChildren().find((n: any) => n.getChildren?.().length);
    expect(modalLayer).toBeDefined();

    // exit button hover/click from ExitButton inside drawDynamicUI
    const exitGroup = layer
      .getChildren()
      .find((c: any) => c.handlers?.has("click") && c.getChildren?.().some((n: any) => n.text?.() === "EXIT"));
    exitGroup?.fire("mouseenter");
    exitGroup?.fire("mouseleave");
    exitGroup?.fire("click");

    screen.cleanup();
  });
});
