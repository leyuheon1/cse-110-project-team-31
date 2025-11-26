import { describe, it, expect, beforeEach, vi } from "vitest";

let KonvaModule: any;
let VictoryScreen: any;

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
  class FakeAnimation {
    constructor(private cb?: () => void, private layer?: any) {}
    start() {
      this.cb?.();
    }
    stop() {}
  }

  return {
    default: {
      Stage: FakeStage,
      Layer: FakeLayer,
      Group: FakeGroup,
      Rect: FakeRect,
      Text: FakeText,
      Image: FakeImage,
      Line: FakeLine,
      Animation: FakeAnimation,
    },
  };
}

describe("VictoryScreen", () => {
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
    VictoryScreen = (await import("./VictoryScreen")).VictoryScreen;
    stage = new KonvaModule.Stage({
      width: 1200,
      height: 800,
      container: { appendChild() {} },
    });
    layer = new KonvaModule.Layer();
    onReturn = vi.fn();
  });

  it("builds UI and triggers callbacks", () => {
    const screen = new VictoryScreen(stage as any, layer as any, {
      totalDaysPlayed: 5,
      cashBalance: 3000,
      onReturnHome: onReturn,
    });

    // trigger button handler from the layer tree
    const button = layer.getChildren().find((c: any) => c.handlers?.has("click"));
    button?.handlers.get("click")?.();

    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(layer.draw).toHaveBeenCalled();
  });
});
