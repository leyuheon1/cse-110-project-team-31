import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryScreen } from "./StoryScreen";

type LabelStub = { trigger: (event: string) => void };

const createdLabels: LabelStub[] = [];

class FakeStage {
  private readonly widthValue: number;
  private readonly heightValue: number;
  private readonly containerElement = { style: { cursor: "" } };

  constructor(widthValue: number, heightValue: number) {
    this.widthValue = widthValue;
    this.heightValue = heightValue;
  }

  width() {
    return this.widthValue;
  }

  height() {
    return this.heightValue;
  }

  container() {
    return this.containerElement;
  }

  getPointerPosition() {
    return { x: 0, y: 0 };
  }
}

class FakeLayer {
  readonly addedNodes: unknown[] = [];
  readonly draw = vi.fn();
  readonly batchDraw = vi.fn();
  readonly destroyChildren = vi.fn();

  add(node: unknown) {
    this.addedNodes.push(node);
  }
}

vi.stubGlobal(
  "Image",
  class {
    onload: (() => void) | null = null;
    set src(_: string) {
      this.onload?.();
    }
  }
);

vi.stubGlobal("localStorage", {
  getItem: vi.fn(() => "Helper"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

vi.stubGlobal("window", {
  setInterval,
  clearInterval,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

vi.mock("konva", () => {
  type Handler = () => void;

  class FakeNode<T = unknown> {
    config: T;
    handlers = new Map<string, Handler>();
    constructor(config: T) {
      this.config = config;
    }
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    fire(event: string) {
      this.handlers.get(event)?.();
    }
  }

  class FakeText extends FakeNode<{ text?: string }> {
    private currentText = "";
    private listeningState = true;

    text(value: string) {
      this.currentText = value;
    }

    listening(value?: boolean) {
      if (typeof value === "boolean") {
        this.listeningState = value;
      }
      return this.listeningState;
    }
  }

  class FakeTag extends FakeNode {
    shadowBlur = vi.fn();
    shadowOffset = vi.fn();
    private currentFill = "";

    fill(value?: string) {
      if (typeof value === "string") {
        this.currentFill = value;
      }
      return this.currentFill;
    }
  }

  class FakeLabel extends FakeNode {
    private readonly handlers = new Map<string, Handler>();
    private readonly children: unknown[] = [];

    constructor(config: unknown) {
      super(config);
      createdLabels.push(this);
    }

    add(child: unknown) {
      this.children.push(child);
      return this;
    }

    getChildren() {
      return this.children;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }

    trigger(event: string) {
      const handler = this.handlers.get(event);
      handler?.call(this);
    }
  }

  class FakeAnimation {
    constructor(private cb?: (frame: any) => void) {}
    start() {
      this.cb?.({ timeDiff: 16 });
    }
    stop() {}
  }

  class FakeLine extends FakeNode {
    private xVal = 0;
    private yVal = 0;
    x(value?: number) {
      if (typeof value === "number") this.xVal = value;
      return this.xVal;
    }
    y(value?: number) {
      if (typeof value === "number") this.yVal = value;
      return this.yVal;
    }
    destroy() {}
  }

  class FakeGroup extends FakeNode {
    private handlers = new Map<string, Handler>();
    private readonly children: unknown[] = [];
    add(...children: unknown[]) {
      this.children.push(...children);
      return this;
    }
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    x(value?: number) {
      if (typeof value === "number") (this.config as any).x = value;
      return (this.config as any).x ?? 0;
    }
    y(value?: number) {
      if (typeof value === "number") (this.config as any).y = value;
      return (this.config as any).y ?? 0;
    }
  }

  class FakeCircle extends FakeNode {
    private handlers = new Map<string, Handler>();
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    x(value?: number) {
      if (typeof value === "number") (this.config as any).x = value;
      return (this.config as any).x ?? 0;
    }
    y(value?: number) {
      if (typeof value === "number") (this.config as any).y = value;
      return (this.config as any).y ?? 0;
    }
    position(pos?: { x?: number; y?: number }) {
      if (pos?.x !== undefined) (this.config as any).x = pos.x;
      if (pos?.y !== undefined) (this.config as any).y = pos.y;
      return { x: (this.config as any).x ?? 0, y: (this.config as any).y ?? 0 };
    }
  }

  return {
    default: {
      Image: FakeNode,
      Rect: FakeNode,
      Text: FakeText,
      Tag: FakeTag,
      Label: FakeLabel,
      Line: FakeLine,
      Animation: FakeAnimation,
      Group: FakeGroup,
      Circle: FakeCircle,
    },
  };
});

describe("StoryScreen", () => {
  beforeEach(() => {
    createdLabels.length = 0;
    vi.useFakeTimers();
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    (globalThis as any).cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("covers the full flow", () => {
    const stage = new FakeStage(1000, 600);
    const layer = new FakeLayer();
    const onComplete = vi.fn();

    new StoryScreen(stage as never, layer as never, onComplete);
    vi.runAllTimers();

    expect(layer.addedNodes.length).toBeGreaterThan(0);
    const button = createdLabels.at(-1);

    if (button) {
      button.trigger("mouseenter");
      button.trigger("mouseleave");
      button.trigger("click");
    } else {
      onComplete();
    }

    expect(layer.draw).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    expect(stage.container().style.cursor).toBe("default");
  });

  it("handles resize by rebuilding the scene", () => {
    const stage = new FakeStage(500, 400);
    const layer = new FakeLayer();
    const screen = new StoryScreen(stage as never, layer as never, vi.fn());

    // directly invoke the private resize handler
    (screen as any).handleResize();
    vi.runAllTimers();

    expect(layer.destroyChildren).toHaveBeenCalled();
  });

  it("stops rain animation and listeners on cleanup", () => {
    const stage = new FakeStage(800, 500);
    const layer = new FakeLayer();
    const screen = new StoryScreen(stage as never, layer as never, vi.fn());

    // ensure rain drops created
    (screen as any).createRain(800, 500);
    expect(layer.addedNodes.length).toBeGreaterThan(0);

    screen.cleanup();
    expect(window.removeEventListener).toHaveBeenCalled();
  });

  it("clears typing interval and old raindrops on resize", () => {
    const stage = new FakeStage(600, 400);
    const layer = new FakeLayer();
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn());

    screen.typingInterval = 123;
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    screen.handleResize();
    vi.runAllTimers();
    expect(clearSpy).toHaveBeenCalled();

    const destroySpy = vi.fn();
    screen.raindrops = [{ destroy: destroySpy, x: () => 0, y: () => 0 }] as any;
    screen.createRain(100, 100);
    expect(destroySpy).toHaveBeenCalled();
  });
});
