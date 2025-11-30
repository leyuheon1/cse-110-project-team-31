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
    cornerRadius = this.accessor("cornerRadius", 0);
    opacity = this.accessor("opacity", 1);
    offsetX = this.accessor("offsetX", 0);
    offsetY = this.accessor("offsetY", 0);
    scale(value?: any) {
      if (value !== undefined) this.config.scale = value;
      return this.config.scale ?? { x: 1, y: 1 };
    }
    rotate(value?: number) {
      if (value !== undefined) this.config.rotation = value;
      return this.config.rotation ?? 0;
    }
    moveToBottom() {}
    moveToTop() {}
    destroy() {
      this.config.destroyed = true;
    }
    listening(value?: boolean) {
      if (value !== undefined) this.config.listening = value;
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
  class FakeCircle extends FakeNode {
    radius = this.accessor("radius", 0);
  }
  class FakeText extends FakeNode {
    text = this.accessor("text", "");
    fill = this.accessor("fill", "");
    getTextWidth() {
      return String(this.text()).length * 5;
    }
  }
  class FakeImage extends FakeNode {
    image(value?: any) {
      if (value !== undefined) this.config.image = value;
      return this.config.image;
    }
  }
  class FakeAnimation {
    started = false;
    stopped = false;
    constructor(private cb?: (frame: any) => void, private _layer?: any) {}
    start() {
      this.started = true;
      [1000, 5000, 5000].forEach((timeDiff) =>
        this.cb?.({ timeDiff })
      );
    }
    stop() {
      this.stopped = true;
    }
  }

  return {
    default: {
      Stage: FakeStage,
      Layer: FakeLayer,
      Group: FakeGroup,
      Rect: FakeRect,
      Circle: FakeCircle,
      Text: FakeText,
      Image: FakeImage,
      Animation: FakeAnimation,
    },
  };
}

describe("UI component coverage", () => {
  const baseImageStub = () =>
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
          if (val.includes("force-error")) {
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
          if (fn && this._src && !this._src.includes("force-error")) {
            fn();
          }
        }
        get onload() {
          return this._onload;
        }
      }
    );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("covers ExitButton and ShuffleButton interactions", async () => {
    baseImageStub();
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { ExitButton } = await import("./ui/ExitButton");
    const { ShuffleButton } = await import("./ui/ShuffleButton");
    const Konva = (await import("konva")).default as any;

    const stage = new Konva.Stage({ width: 500, height: 400, container: {} });
    const layer = new Konva.Layer();
    const onExit = vi.fn();
    new ExitButton(stage, layer, onExit);
    const exitGroup = layer.getChildren()[0];
    const exitRect = exitGroup.getChildren()[0];
    exitRect.fire("mouseenter");
    exitRect.fire("mouseleave");
    exitRect.fire("click");
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(layer.draw).toHaveBeenCalled();

    const parentGroup = new Konva.Group();
    const onShuffle = vi.fn();
    const shuffle = new ShuffleButton(
      stage,
      layer,
      parentGroup,
      200,
      100,
      60,
      onShuffle,
      10
    );
    const buttonGroup = parentGroup.getChildren()[0];
    const buttonCircle = (buttonGroup as any).children[0];
    buttonGroup.fire("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    buttonGroup.fire("mouseleave");
    buttonGroup.fire("click");
    buttonGroup.fire("click");
    buttonGroup.fire("click");
    expect(shuffle.getShufflesRemaining()).toBe(0);
    expect(buttonCircle.fill()).toBe("#95a5a6");
    expect(onShuffle).toHaveBeenCalledTimes(3);
    shuffle.destroy();
    expect(layer.draw).toHaveBeenCalled();
  });

  it("covers SavingsTracker update and bounce", async () => {
    baseImageStub();
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { SavingsTracker } = await import("./ui/SavingsTracker");
    const Konva = (await import("konva")).default as any;
    const { ConfigManager } = await import("./config");
    vi.spyOn(ConfigManager, "getInstance").mockReturnValue({
      getConfig: () => ({
        winThreshold: 100,
        startingFunds: 0,
        bankruptcyThreshold: 0,
        flourPriceMin: 0,
        flourPriceMax: 0,
        bakingTime: 0,
        cleaningTime: 0,
        maxBreadCapacity: 0,
        divisionProblems: 0,
        multiplicationProblems: 0,
        cookiePrice: 0,
      }),
    } as any);

    const stage = new Konva.Stage({ width: 1000, height: 500, container: {} });
    const layer = new Konva.Layer();
    const tracker = new SavingsTracker(layer, stage);
    tracker.update(150); // clamp at 1
    tracker.update(-10); // clamp at 0
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it("covers VictoryScreen interactions and confetti", async () => {
    baseImageStub();
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { VictoryScreen } = await import("./VictoryScreen");
    const Konva = (await import("konva")).default as any;
    const stage = new Konva.Stage({ width: 800, height: 600, container: {} });
    const layer = new Konva.Layer();
    const onReturn = vi.fn();
    const screen = new VictoryScreen(stage, layer, {
      totalDaysPlayed: 3,
      cashBalance: 123.45,
      onReturnHome: onReturn,
    });

    const button = layer
      .getChildren()
      .find((c: any) =>
        Array.from(c.handlers?.keys?.() ?? []).some((key) => key.includes("click"))
      );
    const clickEvent = Array.from(button?.handlers.keys?.() ?? []).find((key) =>
      key.includes("click")
    );
    button?.fire("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    button?.fire("mouseleave");
    button?.fire(clickEvent ?? "click");
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("covers LoseScreen hover and click", async () => {
    baseImageStub();
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { LoseScreen } = await import("./LoseScreen");
    const Konva = (await import("konva")).default as any;
    const stage = new Konva.Stage({ width: 700, height: 500, container: {} });
    const layer = new Konva.Layer();
    const onReturn = vi.fn();
    new LoseScreen(stage, layer, {
      cashBalance: 55.5,
      totalDaysPlayed: 4,
      onReturnHome: onReturn,
    });
    const button = layer
      .getChildren()
      .find((c: any) =>
        Array.from(c.handlers?.keys?.() ?? []).some((key) => key.includes("click"))
      );
    const clickEvent = Array.from(button?.handlers.keys?.() ?? []).find((key) =>
      key.includes("click")
    );
    button?.fire("mouseenter");
    button?.fire("mouseleave");
    button?.fire(clickEvent ?? "click");
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("covers ShoppingScreen happy path and insufficient funds", async () => {
    // Special Image stub: price tag success but background loads
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
          if (val.includes("price-tag") && val.includes("error")) {
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
          if (fn && this._src && !(this._src.includes("price-tag") && this._src.includes("error"))) {
            fn();
          }
        }
        get onload() {
          return this._onload;
        }
      }
    );
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
      10, // funds
      1,
      5,
      [{ customerNum: 1, cookieCount: 2 }],
      onPurchaseComplete,
      onViewRecipe
    );

    // Ensure purchase button exists even if draw order changes
    screen.createPurchaseButton?.(stage.width(), 0);

    // handleKeyPress no focus early return
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "1" }));

    // Simulate focusing first ingredient and typing via helper
    const tempRect = new Konva.Rect();
    const tempText = new Konva.Text();
    screen.focusInput("Flour", tempRect, tempText);
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "9" }));
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "Backspace" }));

    // Force totals to flip color states
    screen.ingredients[0].inputValue = "100";
    if (!screen.totalCostText) screen.totalCostText = new Konva.Text();
    screen.updateTotalCost();
    expect(screen.totalCostText.fill()).toBe("red");
    screen.currentFunds = 1000;
    screen.updateTotalCost();
    expect(screen.totalCostText.fill()).toBe("white");

    screen.updateInputDisplay("Flour");
    const values = screen.getIngredientValues();
    expect(values.size).toBeGreaterThan(0);

    // trigger view recipe button hover + click
    const viewRecipeButton = layer
      .getChildren()
      .find((c: any) =>
        c.getChildren?.().some((n: any) => n.text?.() === "VIEW RECIPE")
      );
    viewRecipeButton?.fire("mouseenter");
    viewRecipeButton?.fire("mouseleave");
    viewRecipeButton?.fire("click");

    // Trigger purchase button click (should succeed)
    const purchaseButton =
      layer
        .getChildren()
        .find(
          (c: any) =>
            c.handlers?.has("click") &&
            c.getChildren()?.some((n: any) => n.text?.() === "PURCHASE")
        ) || layer.getChildren().find((c: any) => c.handlers?.has("click"));
    expect(purchaseButton).toBeDefined();
    purchaseButton?.fire("click");
    expect(onPurchaseComplete).toHaveBeenCalled();

    // Force insufficient funds branch
    screen.currentFunds = 0;
    screen.ingredients[0].inputValue = "10";
    window.alert = vi.fn();
    purchaseButton?.fire("click");
    expect(window.alert).toHaveBeenCalled();
    screen.cleanup();
  });

  it("covers ShoppingScreen price tag fallback and receipt modal", async () => {
    // Image stub triggers error for price tag
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
          if (val.includes("price-tag")) {
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
          if (fn && this._src && !this._src.includes("price-tag")) {
            fn();
          }
        }
        get onload() {
          return this._onload;
        }
      }
    );
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { ShoppingScreen } = await import("./ShoppingScreen");
    const Konva = (await import("konva")).default as any;
    const stage = new Konva.Stage({ width: 800, height: 600, container: {} });
    const layer = new Konva.Layer();
    const onPurchaseComplete = vi.fn();
    const onViewRecipe = vi.fn();
    const screen: any = new ShoppingScreen(
      stage,
      layer,
      20,
      2,
      10,
      [
        { customerNum: 1, cookieCount: 2 },
        { customerNum: 2, cookieCount: 3 },
      ],
      onPurchaseComplete,
      onViewRecipe
    );

    // trigger view orders modal
    const viewOrdersButton = layer
      .getChildren()
      .find((c: any) =>
        c.getChildren?.().some((n: any) => n.text?.() === "VIEW ORDERS")
      );
    viewOrdersButton?.fire("click");
    // find the close circle inside modal layer children
    const modalLayer = stage.getChildren().find((n: any) => n.getChildren?.().length);
    const closeCircle = modalLayer
      ?.getChildren()
      .find((n: any) => n.handlers?.has("click"));
    closeCircle?.fire("click");
    screen.cleanup();
  });
});
