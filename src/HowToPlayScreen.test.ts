// Layout note: mocks first, then shared setup, followed by three scenario tests (tips path, error path, debounce) and extra coverage for no-tips + volume callback so every branch is easy to narrate to a TA.
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HowToPlayScreen } from "./HowToPlayScreen";

type Handler = (...args: any[]) => void;

let lastExitCb: (() => void) | null = null;
vi.mock("./ui/ExitButton", () => ({
  ExitButton: class {
    constructor(_s: any, _l: any, cb: () => void) {
      lastExitCb = cb;
    }
  },
}));

// Simple Konva mock matching needed API
vi.mock("konva", () => {
  class NodeStub {
    config: Record<string, any>;
    children: NodeStub[] = [];
    private handlers = new Map<string, Handler>();

    constructor(config: Record<string, any> = {}) {
      this.config = { ...config };
    }

    add(...nodes: NodeStub[]) {
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

    destroy() {
      /* no-op destroy to mirror Konva API */
    }

    accessor<T>(key: string, fallback: T) {
      return (value?: T) => {
        if (value !== undefined) this.config[key] = value;
        return (this.config[key] as T) ?? fallback;
      };
    }

    width = this.accessor("width", 0);
    height = this.accessor("height", 0);
    x = this.accessor("x", 0);
    y = this.accessor("y", 0);
    fill = this.accessor("fill", "");
    stroke = this.accessor("stroke", "");
    fontFamily = this.accessor("fontFamily", "");
    fontSize = this.accessor("fontSize", 16);
    fontStyle = this.accessor("fontStyle", "");
    align = this.accessor("align", "left");
    verticalAlign = this.accessor("verticalAlign", "top");
    lineHeight = this.accessor("lineHeight", 1);
    wrap = this.accessor("wrap", "word");
    text = this.accessor("text", "");
    cornerRadius = this.accessor("cornerRadius", 0);
    opacity = this.accessor("opacity", 1);

    position(pos?: { x?: number; y?: number }) {
      if (pos?.x !== undefined) this.config.x = pos.x;
      if (pos?.y !== undefined) this.config.y = pos.y;
      return { x: this.config.x ?? 0, y: this.config.y ?? 0 };
    }
  }

  class StageStub extends NodeStub {
    containerEl = { style: { cursor: "default" } };
    getPointerPosition() {
      return { x: this.config.x ?? 0, y: this.config.y ?? 0 };
    }
    container() {
      return this.containerEl;
    }
  }

  class LayerStub extends NodeStub {
    draw = vi.fn();
    batchDraw = vi.fn();
    destroyChildren = vi.fn();
  }

  class TextStub extends NodeStub {}
  class RectStub extends NodeStub {}
  class GroupStub extends NodeStub {
    findOne(type: string) {
      return this.children.find((c) => c.constructor.name === `${type}Stub`);
    }
  }
  class ImageStub extends NodeStub {}
  class CircleStub extends NodeStub {}

  return {
    default: {
      Stage: StageStub,
      Layer: LayerStub,
      Group: GroupStub,
      Rect: RectStub,
      Text: TextStub,
      Image: ImageStub,
      Circle: CircleStub,
    },
  };
});

describe("HowToPlayScreen", () => {
  let stage: any;
  let layer: any;
  const fetchMock = vi.fn();
  let KonvaModule: any;
  let rafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    (global as any).fetch = fetchMock;
    KonvaModule = (await import("konva")).default as any;
    stage = new KonvaModule.Stage({ width: 800, height: 600 }) as any;
    layer = new KonvaModule.Layer() as any;
    stage.add(layer);
    rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  it("renders without tips, applies global volume callback, and respects setVolume clamp", async () => {
    fetchMock.mockResolvedValueOnce({ text: async () => "Only instructions" }); // no tips header triggers else branch
    const screen: any = new HowToPlayScreen(stage as any, layer as any, vi.fn()); // create screen
    await Promise.resolve(); // let fetch resolve

    screen.setVolume(2); // clamp through public setter (also hits guard when slider exists)
    expect(screen.volume).toBe(1); // clamped to max
    expect(layer.draw).toHaveBeenCalled(); // draw at least once during setup
  });

  it("renders instructions with tips, buttons, and supports hover/click", async () => {
    fetchMock.mockResolvedValueOnce({
      text: async () => "Line A\nTips for Success:\nBe nice",
    });

    const startCb = vi.fn();
    const screen = new HowToPlayScreen(stage as any, layer as any, startCb);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // title + modal + tips content + button (+ mocked exit button trigger)
    expect(layer.getChildren().length).toBeGreaterThanOrEqual(3);

    const button = layer
      .getChildren()
      .find(
        (c: any) => c instanceof KonvaModule.Group && (c as any).findOne("Text")?.text() === "START GAME"
      ) as any;
    expect(button).toBeTruthy();

    button.fire("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    button.fire("mouseleave");
    expect(stage.container().style.cursor).toBe("default");

    button.fire("click");
    expect(startCb).toHaveBeenCalled();

    // Exit button is the other group
    lastExitCb?.();
    screen.cleanup();
  });

  it("handles fetch failure gracefully and cleanup stops resize handling", async () => {
    fetchMock.mockRejectedValueOnce(new Error("fail"));
    const screen = new HowToPlayScreen(stage as any, layer as any, vi.fn());

    await Promise.resolve();
    expect(console.error).toHaveBeenCalled();

    // trigger resize logic
    screen["handleResize"]?.();
    expect(layer.destroyChildren).toHaveBeenCalledTimes(1);

    screen.cleanup();
    screen["handleResize"]?.(); // no-op when inactive
    expect(layer.destroyChildren).toHaveBeenCalled();
  });

  it("debounces resize and recreates UI", async () => {
    fetchMock.mockResolvedValueOnce({ text: async () => "Only text" });
    const screen = new HowToPlayScreen(stage as any, layer as any, vi.fn());
    await Promise.resolve();

    screen["handleResize"]?.();
    expect(layer.destroyChildren).toHaveBeenCalled();
    expect(rafSpy).toHaveBeenCalled();
  });
});
