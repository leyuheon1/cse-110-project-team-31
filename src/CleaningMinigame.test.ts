import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CleaningMinigame } from "./CleaningMinigame";

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

type RectEntry = {
  config: Record<string, unknown>;
  fillHistory: string[];
  trigger: (event: string, evt?: { cancelBubble?: boolean }) => void;
};

const konvaState = vi.hoisted(() => ({
  groups: [] as Array<{ config: Record<string, unknown>; visible: () => boolean }>,
  rects: [] as RectEntry[],
  texts: [] as Array<{ config: Record<string, unknown> }>,
}));

const randomQueue = vi.hoisted(() => [] as number[]);

vi.mock("./config", () => ({
  ConfigManager: {
    getInstance: () => ({
      getConfig: () => ({
        cleaningTime: 15,
      }),
    }),
  },
}));

const exitButtonState = vi.hoisted(() => ({ lastCallback: null as (() => void) | null }));

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
      // noop
    }
  },
}));

vi.mock("./ui/InfoButton", () => ({
  InfoButton: class {
    constructor(
      _stage: unknown,
      _layer: unknown,
      _message: string
    ) {
      // noop
    }
  },
}));

vi.mock("konva", () => {
  type Handler = (evt?: { cancelBubble?: boolean }) => void;

  class FakeNode {
    config: Record<string, unknown>;
    constructor(config?: Record<string, unknown>) {
      this.config = { ...(config ?? {}) };
    }
  }

  class FakeGroup extends FakeNode {
    private visibleState: boolean;
    children: unknown[] = [];
    private handlers = new Map<string, Handler>();

    constructor(config?: Record<string, unknown>) {
      super(config);
      this.visibleState = (config?.visible as boolean) ?? true;
      konvaState.groups.push({
        config: this.config,
        visible: () => this.visible(),
      });
    }

    add(...children: unknown[]) {
      this.children.push(...children);
      return this;
    }

    visible(value?: boolean) {
      if (typeof value === "boolean") {
        this.visibleState = value;
      }
      return this.visibleState;
    }

    destroyChildren() {
      this.children = [];
    }

    destroy() {
      this.config.destroyed = true;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }

    trigger(event: string, evt?: { cancelBubble?: boolean }) {
      const handler = this.handlers.get(event);
      handler?.(evt);
    }
  }

  class FakeRect extends FakeNode {
    private handlers = new Map<string, Handler>();
    fillHistory: string[] = [];

    constructor(config?: Record<string, unknown>) {
      super(config);
      konvaState.rects.push({
        config: this.config,
        fillHistory: this.fillHistory,
        trigger: (event: string, evt?: { cancelBubble?: boolean }) =>
          this.trigger(event, evt),
      });
    }

    fill(color: string) {
      this.fillHistory.push(color);
      this.config.fill = color;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }

    trigger(event: string, evt: { cancelBubble?: boolean } = {}) {
      const handler = this.handlers.get(event);
      handler?.(evt);
    }
  }

  class FakeCircle extends FakeNode {}
  class FakeLine extends FakeNode {}

  class FakeText extends FakeNode {
    constructor(config?: Record<string, unknown>) {
      super(config);
      konvaState.texts.push({ config: this.config });
    }

    width() {
      return (this.config.width as number) ?? 10;
    }

    text(value: string) {
      this.config.text = value;
    }

    fill(color: string) {
      this.config.fill = color;
    }

    y() {
      return (this.config.y as number) ?? 0;
    }

    height() {
      return (this.config.height as number) ?? 10;
    }

    offsetX(value: number) {
      this.config.offsetX = value;
    }

    offsetY(value: number) {
      this.config.offsetY = value;
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

describe("CleaningMinigame", () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;
  let keydownHandler: ((evt: Partial<KeyboardEvent>) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    randomQueue.length = 0;
    mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      if (randomQueue.length === 0) {
        return 0;
      }
      return randomQueue.shift()!;
    });
    konvaState.groups.length = 0;
    konvaState.rects.length = 0;
    konvaState.texts.length = 0;
    exitButtonState.lastCallback = null;
    keydownHandler = null;

    vi.stubGlobal("window", {
      location: { href: "" },
      addEventListener: vi.fn((event: string, handler: (evt: any) => void) => {
        if (event === "keydown") keydownHandler = handler;
      }),
      removeEventListener: vi.fn((event: string, handler: (evt: any) => void) => {
        if (event === "keydown" && keydownHandler === handler) {
          keydownHandler = null;
        }
      }),
      setInterval: (fn: (...args: any[]) => void, ms?: number) => setInterval(fn, ms),
      clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
      setTimeout: (fn: (...args: any[]) => void, ms?: number) => setTimeout(fn, ms),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    mathRandomSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("allows players to skip cleaning", () => {
    const stage = new FakeStage(800, 600);
    const layer = new FakeLayer();
    const onComplete = vi.fn();

    const minigame = new CleaningMinigame(stage as never, layer as never, 12, onComplete);

    const skipRect = konvaState.rects.find(
      (rect) => rect.config.fill === "#F08080"
    );
    expect(skipRect).toBeTruthy();

    skipRect!.trigger("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    skipRect!.trigger("mouseleave");
    expect(stage.container().style.cursor).toBe("default");
    skipRect!.trigger("click tap");

    vi.advanceTimersByTime(0);
    expect(onComplete).toHaveBeenCalledWith(
      {
        correctAnswers: 0,
        totalProblems: 0,
        timeRemaining: 0,
      },
      true
    );

    minigame.cleanup();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("runs through the play path and finishes all dishes", () => {
    const stage = new FakeStage(900, 700);
    const layer = new FakeLayer();
    const onComplete = vi.fn();

    randomQueue.push(...Array(10).fill(0));
    const minigame = new CleaningMinigame(stage as never, layer as never, 15, onComplete);

    const playRect = konvaState.rects.find(
      (rect) => rect.config.fill === "#90EE90"
    );
    expect(playRect).toBeTruthy();
    playRect!.trigger("click tap");

    const minigameGroup = konvaState.groups.find(
      (group) => group.config.name === "minigameUI"
    );
    expect(minigameGroup?.visible()).toBe(true);

    expect(window.addEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
    const handler = keydownHandler!;

    // Simulate 5 correct answers
    for (let i = 0; i < 5; i++) {
      handler({ key: "1" });
      handler({ key: "Enter" });
      vi.advanceTimersByTime(500);
    }

    expect(onComplete).toHaveBeenCalledWith(
      {
        correctAnswers: 15,
        totalProblems: 5,
        timeRemaining: 0,
      },
      false
    );

    minigame.cleanup();
  });
});
