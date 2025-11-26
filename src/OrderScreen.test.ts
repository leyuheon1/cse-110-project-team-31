import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderScreen } from "./OrderScreen";

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

  add(node: unknown) {
    this.addedNodes.push(node);
  }
}

const konvaState = vi.hoisted(() => ({
  groups: [] as Array<{ config: Record<string, unknown>; handlers: Map<string, () => void> }>,
  texts: [] as Array<{ config: Record<string, unknown> }>,
  rects: [] as Array<{ config: Record<string, unknown>; fillHistory: string[]; handlers: Map<string, () => void> }>,
}));

const randomValues = vi.hoisted(() => [] as number[]);

vi.stubGlobal(
  "Image",
  class {
    onload: (() => void) | null = null;
    set src(_: string) {
      this.onload?.();
    }
  }
);

vi.stubGlobal("window", { location: { href: "about:blank" } });

vi.mock("./ui/ExitButton", () => ({
  ExitButton: class {
    constructor(
      _stage: unknown,
      _layer: unknown,
      callback: () => void
    ) {
      callback();
    }
  },
}));

vi.mock("./ui/InfoButton", () => ({
  InfoButton: class {},
}));

vi.mock("konva", () => {
  type Handler = () => void;

  class FakeNode {
    config: Record<string, unknown>;
    constructor(config?: Record<string, unknown>) {
      this.config = { ...(config ?? {}) };
    }
  }

  class FakeGroup extends FakeNode {
    readonly children: unknown[] = [];
    readonly handlers = new Map<string, Handler>();
    removed = false;

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

    remove() {
      this.removed = true;
    }
  }

  class FakeRect extends FakeNode {
    readonly handlers = new Map<string, Handler>();
    readonly fillHistory: string[] = [];

    constructor(config?: Record<string, unknown>) {
      super(config);
      konvaState.rects.push({ config: this.config, fillHistory: this.fillHistory, handlers: this.handlers });
    }

    fill(color: string) {
      this.fillHistory.push(color);
      this.config.fill = color;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
  }

  class FakeImage extends FakeNode {}

  class FakeText extends FakeNode {
    constructor(config?: Record<string, unknown>) {
      super(config);
      konvaState.texts.push({ config: this.config });
    }

    text(value: string) {
      this.config.text = value;
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

describe("OrderScreen", () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    randomValues.length = 0;
    mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      if (randomValues.length === 0) return 0;
      return randomValues.shift()!;
    });
    konvaState.groups.length = 0;
    konvaState.texts.length = 0;
    konvaState.rects.length = 0;
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("creates customers and continues with total demand", () => {
    randomValues.push(0.5, 0.1, 0.2, 0.3);
    const stage = new FakeStage(1200, 800);
    const layer = new FakeLayer();
    const onContinue = vi.fn();

    new OrderScreen(stage as never, layer as never, 2, 1.2, onContinue);

    const texts = konvaState.texts.map((entry) => entry.config.text);
    expect(texts).toContain("DAY 2");
    const totalLine = texts.find((text) => typeof text === "string" && text.startsWith("TOTAL:"));
    expect(totalLine).toBeDefined();

    const buttonGroup = konvaState.groups.find((group) => group.handlers.has("click"));
    expect(buttonGroup).toBeTruthy();
    buttonGroup!.handlers.get("click")!();
    expect(onContinue).toHaveBeenCalledWith(expect.any(Number), expect.any(Array));

    const hoverRect = konvaState.rects[0];
    hoverRect.handlers.get("mouseenter")?.call(null);
    expect(stage.container().style.cursor).toBe("pointer");
    hoverRect.handlers.get("mouseleave")?.call(null);
    expect(stage.container().style.cursor).toBe("default");

    expect(hoverRect.fillHistory).toContain("#45a049");
    expect(hoverRect.fillHistory).toContain("#4CAF50");
  });
});
