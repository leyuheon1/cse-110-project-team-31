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
    fire(event: string) {
      this.handlers.get(event)?.();
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
    cornerRadius = this.accessor("cornerRadius", 0);
    opacity = this.accessor("opacity", 1);
  }
  class FakeStage extends FakeNode {
    containerElement = { style: {} };
    constructor(config: Record<string, any>) {
      super(config);
    }
    container() {
      return this.containerElement;
    }
  }
  class FakeLayer extends FakeNode {
    draw = vi.fn();
    batchDraw = vi.fn();
  }
  class FakeRect extends FakeNode {}
  class FakeText extends FakeNode {
    text = this.accessor("text", "");
  }
  class FakeImage extends FakeNode {
    image(val?: any) {
      if (val !== undefined) this.config.image = val;
      return this.config.image;
    }
  }
  class FakeAnimation {
    constructor(private cb?: (frame: any) => void, private _layer?: any) {}
    start() {
      // bounce across thresholds to flip direction
      [5, 1000, 6000].forEach((timeDiff) => this.cb?.({ timeDiff }));
    }
  }
  return {
    default: {
      Stage: FakeStage,
      Layer: FakeLayer,
      Rect: FakeRect,
      Text: FakeText,
      Image: FakeImage,
      Animation: FakeAnimation,
    },
  };
}

describe("SavingsTracker coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds UI and updates progress clamped to bounds", async () => {
    vi.stubGlobal(
      "Image",
      class {
        _src = "";
        _onload: (() => void) | null = null;
        set src(val: string) {
          this._src = val;
          this._onload?.();
        }
        get src() {
          return this._src;
        }
        set onload(fn: (() => void) | null) {
          this._onload = fn;
          if (fn && this._src) fn();
        }
        get onload() {
          return this._onload;
        }
      }
    );
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    const { ConfigManager } = await import("./config");
    vi.spyOn(ConfigManager, "getInstance").mockReturnValue({
      getConfig: () => ({
        winThreshold: 50,
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
    const { SavingsTracker } = await import("./ui/SavingsTracker");
    const Konva = (await import("konva")).default as any;

    const stage = new Konva.Stage({ width: 800, height: 400, container: {} });
    const layer = new Konva.Layer();
    const tracker: any = new SavingsTracker(layer, stage);

    // progress over goal -> clamp to 1
    tracker.update(100);
    // progress under 0 -> clamp to 0
    tracker.update(-10);
    // ensure text updates
    expect(tracker.labelText.text()).toContain("Savings:");
    expect(layer.batchDraw).toHaveBeenCalled();
  });
});
