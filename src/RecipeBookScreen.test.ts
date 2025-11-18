import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { RecipeBookScreen } from "./RecipeBookScreen";

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
}

class FakeLayer {
  readonly addedNodes: unknown[] = [];
  readonly draw = vi.fn();

  add(node: unknown) {
    this.addedNodes.push(node);
  }
}

const konvaState = vi.hoisted(() => ({
  groups: [] as Array<{
    config: Record<string, unknown>;
    children: unknown[];
    handlers: Map<string, () => void>;
    destroy: ReturnType<typeof vi.fn>;
    trigger: (event: string) => void;
  }>,
}));

const exitButtonState = vi.hoisted(() => ({
  destroyMock: vi.fn(),
  lastCallback: null as (() => void) | null,
}));

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
      exitButtonState.destroyMock();
    }
  },
}));

vi.mock("konva", () => {
  type Handler = () => void;

  class FakeNode<T extends Record<string, unknown> | undefined = undefined> {
    config: Record<string, unknown>;

    constructor(config?: T) {
      this.config = (config ?? {}) as Record<string, unknown>;
    }
  }

  class FakeGroup extends FakeNode {
    children: unknown[] = [];
    handlers = new Map<string, Handler>();
    destroy = vi.fn();

    constructor(config?: Record<string, unknown>) {
      super(config);
      const entry = {
        config: this.config,
        children: this.children,
        handlers: this.handlers,
        destroy: this.destroy,
        trigger: (event: string) => this.trigger(event),
      };
      konvaState.groups.push(entry);
    }

    add(child: unknown) {
      this.children.push(child);
      return this;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }

    trigger(event: string) {
      const handler = this.handlers.get(event);
      handler?.call(this);
    }
  }

  class FakeRect extends FakeNode<{ fill?: string }> {
    fillHistory: string[] = [];

    fill(color: string) {
      this.fillHistory.push(color);
      this.config.fill = color;
    }
  }

  class FakeCircle extends FakeNode {}
  class FakeLine extends FakeNode {}
  class FakeText extends FakeNode<{ text?: string }> {
    text(value: string) {
      this.config.text = value;
    }
  }

  return {
    default: {
      Group: FakeGroup,
      Rect: FakeRect,
      Circle: FakeCircle,
      Line: FakeLine,
      Text: FakeText,
    },
  };
});

describe("RecipeBookScreen", () => {
  beforeEach(() => {
    konvaState.groups.length = 0;
    exitButtonState.destroyMock.mockClear();
    exitButtonState.lastCallback = null;
    vi.stubGlobal("window", { location: { href: "about:blank" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("builds the UI and handles button behaviours", () => {
    const stage = new FakeStage(1000, 800);
    const layer = new FakeLayer();
    const onClose = vi.fn();
    const ingredients = new Map<string, number>([
      ["Flour", 3],
      ["Sugar", 0],
      ["Butter", 10],
      ["Chocolate", 1],
      ["Baking Soda", 1],
    ]);

    const screen = new RecipeBookScreen(
      stage as never,
      layer as never,
      ingredients,
      onClose
    );

    expect(layer.addedNodes.length).toBeGreaterThan(0);
    const buttonGroupEntry = konvaState.groups.find((group) =>
      group.handlers.has("click")
    );
    expect(buttonGroupEntry).toBeTruthy();

    buttonGroupEntry!.trigger("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    buttonGroupEntry!.trigger("mouseleave");
    expect(stage.container().style.cursor).toBe("default");
    buttonGroupEntry!.trigger("click");
    expect(onClose).toHaveBeenCalled();

    const buttonRect = buttonGroupEntry!.children[0] as {
      fillHistory?: string[];
    };
    expect(buttonRect.fillHistory).toContain("#f77f00");
    expect(buttonRect.fillHistory?.at(-1)).toBe("#d62828");

    exitButtonState.lastCallback?.();
    expect(exitButtonState.destroyMock).toHaveBeenCalledTimes(1);
    expect(konvaState.groups[0].destroy).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("/login.hmtl");

    screen.cleanup();
    expect(konvaState.groups[0].destroy).toHaveBeenCalledTimes(2);
    expect(exitButtonState.destroyMock).toHaveBeenCalledTimes(1);
    expect(layer.draw).toHaveBeenCalled();
  });
});
