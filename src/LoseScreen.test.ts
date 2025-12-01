import { describe, it, expect, beforeEach, vi } from "vitest";

let KonvaModule: any;
let LoseScreen: any;

function createKonvaMock() {
  class FakeNode {
    config: Record<string, any>;
    children: any[] = [];
    handlers = new Map<string, (evt?: any) => void>();
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
    on(event: string, handler: (evt?: any) => void) {
      this.handlers.set(event, handler);
    }
    fire(event: string, payload?: any) {
      this.handlers.get(event)?.(payload);
    }
    findOne() {
      return this.children[0] ?? new FakeNode();
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
    shadowBlur = this.accessor("shadowBlur", 0);
    shadowOffset = this.accessor("shadowOffset", { x: 0, y: 0 });
    moveToBottom() {}
  }

  class FakeStage extends FakeNode {
    containerElement = { style: { cursor: "default" } };
    container() {
      return this.containerElement;
    }
  }
  class FakeLayer extends FakeNode {
    draw = vi.fn();
    batchDraw = vi.fn();
    destroyChildren = vi.fn();
  }
  class FakeGroup extends FakeNode {}
  class FakeRect extends FakeNode {}
  class FakeText extends FakeNode {}
  class FakeImage extends FakeNode {}
  class FakeLine extends FakeNode {}

  return {
    default: {
      Stage: FakeStage,
      Layer: FakeLayer,
      Group: FakeGroup,
      Rect: FakeRect,
      Text: FakeText,
      Image: FakeImage,
      Line: FakeLine,
    },
  };
}

describe("LoseScreen", () => {
  let stage: FakeStage;
  let layer: FakeLayer;
  let onReturn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        set src(_: string) {
          this.onload?.();
        }
      }
    );
    KonvaModule = (await import("konva")).default;
    LoseScreen = (await import("./LoseScreen")).LoseScreen;
    stage = new KonvaModule.Stage({
      width: 1000,
      height: 700,
      container: { appendChild() {} },
    });
    layer = new KonvaModule.Layer();
    onReturn = vi.fn();
  });

  it("creates UI and triggers callbacks", () => {
    const screen = new LoseScreen(stage as any, layer as any, {
      totalDaysPlayed: 2,
      cashBalance: 1000,
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
    clickEvent && button?.handlers.get(clickEvent)?.();

    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(layer.draw).toHaveBeenCalled();
  });
});
