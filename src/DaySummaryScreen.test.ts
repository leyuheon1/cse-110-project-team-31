import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DaySummaryScreen } from "./DaySummaryScreen";

class FakeStage {
  private readonly widthValue: number;
  private readonly heightValue: number;
  private readonly containerElement = { style: { cursor: "default" } };

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

type Handler = () => void;

const konvaState = vi.hoisted(() => ({
  groups: [] as Array<{ config: Record<string, unknown>; handlers: Map<string, Handler> }>,
  texts: [] as Array<{ config: Record<string, unknown> }>,
  rects: [] as Array<{ config: Record<string, unknown>; fillHistory: string[] }>,
}));

const exitButtonState = vi.hoisted(() => ({ destroy: vi.fn(), lastCallback: null as (() => void) | null }));

vi.stubGlobal(
  "Image",
  class {
    onload: (() => void) | null = null;
    set src(_: string) {
      this.onload?.();
    }
  }
);

vi.mock("./ui/ExitButton", () => ({
  ExitButton: class {
    constructor(
      _stage: unknown,
      _layer: unknown,
      callback: () => void
    ) {
      exitButtonState.lastCallback = callback;
    }

    destroy() {
      exitButtonState.destroy();
    }
  },
}));

vi.mock("./ui/InfoButton", () => ({
  InfoButton: class {
    constructor(
      _stage: unknown,
      _layer: unknown
    ) {}
  },
}));

vi.mock("konva", () => {
  class FakeNode {
    config: Record<string, unknown>;
    constructor(config?: Record<string, unknown>) {
      this.config = { ...(config ?? {}) };
    }
  }

  class FakeGroup extends FakeNode {
    readonly children: unknown[] = [];
    readonly handlers = new Map<string, Handler>();

    constructor(config?: Record<string, unknown>) {
      super(config);
      konvaState.groups.push({ config: this.config, handlers: this.handlers });
    }

    add(...children: unknown[]) {
      this.children.push(...children);
      return this;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
  }

  class FakeRect extends FakeNode {
    fillHistory: string[] = [];
    xValue = (this.config.x as number) ?? 0;
    widthValue = (this.config.width as number) ?? 0;

    fill(color: string) {
      this.fillHistory.push(color);
      this.config.fill = color;
    }

    x() {
      return this.xValue;
    }

    width() {
      return this.widthValue;
    }
  }
  class FakeImage extends FakeNode {
    private widthValue = (this.config.width as number) ?? 0;
    private heightValue = (this.config.height as number) ?? 0;
    private xValue = (this.config.x as number) ?? 0;

    width() {
      return this.widthValue;
    }

    height() {
      return this.heightValue;
    }

    x(value?: number) {
      if (typeof value === "number") {
        this.xValue = value;
      }
      return this.xValue;
    }
  }

  class FakeText extends FakeNode {
    constructor(config?: Record<string, unknown>) {
      super(config);
      konvaState.texts.push({ config: this.config });
    }

    text(value: string) {
      this.config.text = value;
    }

    fill(color: string) {
      this.config.fill = color;
    }
  }

  return {
    default: {
      Group: FakeGroup,
      Rect: FakeRect,
      Image: FakeImage,
      Text: FakeText,
    },
  };
});

describe("DaySummaryScreen", () => {
  beforeEach(() => {
    konvaState.groups.length = 0;
    konvaState.texts.length = 0;
    exitButtonState.destroy.mockClear();
    exitButtonState.lastCallback = null;
    vi.stubGlobal("window", {
      location: { href: "about:blank" },
      Image: (globalThis as any).Image,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the summary and handles button interactions", () => {
    const stage = new FakeStage(1000, 800);
    const layer = new FakeLayer();
    const onContinue = vi.fn();

    new DaySummaryScreen(stage as never, layer as never, 3, 500, 200, 1300, 75, onContinue);

    const buttonGroup = konvaState.groups.find((group) =>
      group.handlers.has("click tap")
    );
    expect(buttonGroup).toBeTruthy();

    const continueHandler = buttonGroup!.handlers.get("click tap")!;
    continueHandler();
    expect(onContinue).toHaveBeenCalled();

    const enterHandler = buttonGroup!.handlers.get("mouseenter")!;
    const leaveHandler = buttonGroup!.handlers.get("mouseleave")!;
    stage.container().style.cursor = "default";
    enterHandler();
    expect(stage.container().style.cursor).toBe("pointer");
    leaveHandler();
    expect(stage.container().style.cursor).toBe("default");

    const texts = konvaState.texts.map((entry) => entry.config.text);
    expect(texts).toContain("DAY 3");
    expect(texts).toContain("Tips Earned: $75.00");
    expect(texts).toContain("Sales (Cookies Sold): $500.00");

    exitButtonState.lastCallback?.();
    expect(window.location.href).toBe("/login.hmtl");
  });
});
