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
  class FakeImage extends FakeNode {
    image(value?: any) {
      if (value !== undefined) this.config.image = value;
      return this.config.image;
    }
  }
  class FakeCircle extends FakeNode {
    radius = this.accessor("radius", 0);
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

describe("ShoppingScreen targeted coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockImages(options: { priceTagError?: boolean; receiptError?: boolean } = {}) {
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
          const shouldFailPrice = val.includes("price-tag") && options.priceTagError;
          const shouldFailReceipt = val.includes("start-receipt") && options.receiptError;
          if (shouldFailPrice || shouldFailReceipt) {
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
          if (fn && this._src && !this._src.includes("price-tag") && !this._src.includes("start-receipt")) {
            fn();
          }
        }
        get onload() {
          return this._onload;
        }
      }
    );
  }

  it("walks through UI creation helpers and purchase callbacks", async () => {
    mockImages();
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    // Minimal button dependencies
    vi.doMock("./ui/ExitButton", () => ({
      ExitButton: class {
        constructor(stage: any, layer: any, onExit: () => void) {
          const g: any = new (createKonvaMock().default.Group)();
          g.handlers.set("click", onExit);
          layer.add(g);
        }
      },
    }));
    vi.doMock("./ui/InfoButton", () => ({
      InfoButton: class {},
    }));
    const { ShoppingScreen } = await import("./ShoppingScreen");
    const Konva = (await import("konva")).default as any;

    const stage = new Konva.Stage({ width: 900, height: 700, container: {} });
    const layer = new Konva.Layer();
    const onPurchaseComplete = vi.fn();
    const onViewRecipe = vi.fn();

    const screen: any = new ShoppingScreen(
      stage,
      layer,
      30,
      3,
      6,
      [{ customerNum: 1, cookieCount: 2 }],
      onPurchaseComplete,
      onViewRecipe
    );
    // Directly re-run setup/draw to exercise internal callbacks
    screen.setupUI?.();
    screen.drawDynamicUI?.();

    // Directly exercise helper factories for uncovered lines
    screen.createBalanceGroup(900, 700);
    screen.createPriceTagGroup(900, 700, { name: "Test", price: 1, inputValue: "0", unit: "cup" }, 100);
    screen.createIngredientNameText(900, 100, "Salt", 120);
    screen.createViewRecipeButton(900, 700);
    screen.createViewOrdersButton(900, 700);
    screen.createPurchaseButton(900, 0);
    screen.createIngredientRow(900, 400, { name: "Butter", price: 0.5, inputValue: "0", unit: "tbsp" }, 200);

    // Focus input via click handler and type to toggle stroke changes
    const firstRect = layer.getChildren().find((c: any) => c.stroke && c.stroke() === "#3498db");
    const firstText = layer.getChildren().find((c: any) => c.text?.() === "0");
    firstRect?.fire("click"); // invokes focusInput through bound handler
    firstRect?.fire("mouseenter");
    firstRect?.fire("mouseleave");
    firstText?.fire?.("click");
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "5" }));
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "Backspace" }));
    screen.updateInputDisplay("Butter");
    screen.updateTotalCost();
    // Second focus to trigger prior focus reset branch
    screen.focusInput("Sugar", new Konva.Rect(), new Konva.Text());
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "5" }));
    screen.handleKeyPress(new KeyboardEvent("keydown", { key: "Backspace" }));

    // Update totals and purchase happy path
    screen.ingredients[0].inputValue = "2";
    const purchaseBtnGroup = layer
      .getChildren()
      .find((c: any) => c.getChildren?.().some((n: any) => n.text?.() === "PURCHASE"));
    purchaseBtnGroup?.fire("mouseenter");
    purchaseBtnGroup?.fire("mouseleave");
    purchaseBtnGroup?.fire("click");
    expect(onPurchaseComplete).toHaveBeenCalled();
    // insufficient funds branch
    window.alert = vi.fn();
    screen.currentFunds = 0;
    screen.ingredients[0].inputValue = "10";
    purchaseBtnGroup?.fire("click");
    expect(window.alert).toHaveBeenCalled();

    // View recipe button path
    const viewRecipeBtnGroup = layer
      .getChildren()
      .find((c: any) => c.getChildren?.().some((n: any) => n.text?.() === "VIEW RECIPE"));
    const viewRecipeRect = viewRecipeBtnGroup?.getChildren?.()[0];
    viewRecipeRect?.fire("click");
    expect(onViewRecipe).toHaveBeenCalledTimes(1);

    screen.cleanup();
  });

  it("covers price tag error path and receipt modal close interactions", async () => {
    mockImages({ priceTagError: true });
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    vi.doMock("./ui/ExitButton", () => ({
      ExitButton: class {
        constructor(stage: any, layer: any, onExit: () => void) {
          const g: any = new (createKonvaMock().default.Group)();
          g.handlers.set("click", onExit);
          layer.add(g);
        }
      },
    }));
    vi.doMock("./ui/InfoButton", () => ({
      InfoButton: class {},
    }));
    const { ShoppingScreen } = await import("./ShoppingScreen");
    const Konva = (await import("konva")).default as any;

    const stage = new Konva.Stage({ width: 700, height: 500, container: {} });
    const layer = new Konva.Layer();
    const onPurchaseComplete = vi.fn();
    const onViewRecipe = vi.fn();

    const saved = new Map<string, string>([["Flour", "4"]]);
    const screen: any = new ShoppingScreen(
      stage,
      layer,
      40,
      4,
      8,
      [{ customerNum: 2, cookieCount: 3 }],
      onPurchaseComplete,
      onViewRecipe,
      saved
    );

    // Explicitly hit loadPriceTagImage error branch
    screen.loadPriceTagImage(() => {});

    // Receipt modal path with close button events
    screen.showReceiptModal();
    const modalLayer = stage.getChildren().find((n: any) => n.getChildren?.().length);
    const closeCircle = modalLayer
      ?.getChildren()
      .find((n: any) => n.handlers?.has("click"));
    closeCircle?.fire("mouseenter");
    closeCircle?.fire("mouseleave");
    closeCircle?.fire("click");

    screen.cleanup();
  });
});
