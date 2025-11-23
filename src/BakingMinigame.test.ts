import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BakingMinigame } from "./BakingMinigame";

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

type AnimationEntry = {
  triggerComplete: () => void;
  destroy: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  loadPromise?: Promise<void>;
};

const animationState = vi.hoisted(() => ({
  instances: [] as AnimationEntry[],
  nextShouldReject: false,
}));

const exitButtonState = vi.hoisted(() => ({
  lastCallback: null as (() => void) | null,
}));

vi.mock("./config", () => ({
  ConfigManager: {
    getInstance: () => ({
      getConfig: () => ({
        bakingTime: 12,
      }),
    }),
  },
}));

vi.mock("./AnimationPlayer", () => ({
  AnimationPlayer: class {
    private readonly onComplete: () => void;
    readonly start = vi.fn();
    readonly stop = vi.fn();
    readonly destroy = vi.fn();
    private entry: AnimationEntry;

    constructor(
      _layer: unknown,
      _images: string[],
      _fps: number,
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _loop: boolean,
      onComplete: () => void
    ) {
      this.onComplete = onComplete;
      this.entry = {
        triggerComplete: () => this.onComplete(),
        destroy: this.destroy,
        stop: this.stop,
      };
      animationState.instances.push(this.entry);
    }

    load() {
      const promise = animationState.nextShouldReject
        ? Promise.reject(new Error("boom"))
        : Promise.resolve();
      animationState.nextShouldReject = false;
      this.entry.loadPromise = promise;
      return promise;
    }

    triggerComplete() {
      this.onComplete();
    }
  },
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
      // nothing to do for the mock
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
    children: unknown[] = [];
    private visibleState: boolean;
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

    align(_: string) {
      return _;
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

describe("BakingMinigame", () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let keydownHandler: ((evt: Partial<KeyboardEvent>) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    konvaState.groups.length = 0;
    konvaState.rects.length = 0;
    konvaState.texts.length = 0;
    animationState.instances.length = 0;
    animationState.nextShouldReject = false;
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
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("lets players skip and exit via the UI", async () => {
    animationState.nextShouldReject = true;
    const stage = new FakeStage(800, 600);
    const layer = new FakeLayer();
    const onComplete = vi.fn();

    const minigame = new BakingMinigame(stage as never, layer as never, 5, onComplete);
    const animation = animationState.instances[0];
    await animation.loadPromise?.catch(() => {});
    expect(consoleErrorSpy).toHaveBeenCalled();
    const choiceGroup = konvaState.groups.find(
      (group) => group.config.name === "choiceUI"
    );
    expect(choiceGroup?.visible()).toBe(true);

    const skipRect = konvaState.rects.find(
      (rect) => rect.config.fill === "#F08080"
    );
    expect(skipRect).toBeTruthy();

    skipRect!.trigger("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    skipRect!.trigger("mouseleave");
    expect(stage.container().style.cursor).toBe("default");

    const skipEvent = { cancelBubble: false };
    skipRect!.trigger("click tap", skipEvent);
    expect(skipEvent.cancelBubble).toBe(true);

    vi.advanceTimersByTime(150);
    expect(onComplete).toHaveBeenCalledWith(
      {
        correctAnswers: 0,
        totalProblems: 0,
        timeRemaining: 12,
      },
      true
    );

    expect(animationState.instances[0].destroy).toHaveBeenCalled();

    exitButtonState.lastCallback?.();
    expect(window.location.href).toBe("/login.hmtl");

    minigame.cleanup();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("runs through the play flow and timer countdown", async () => {
    const stage = new FakeStage(1024, 768);
    const layer = new FakeLayer();
    const onComplete = vi.fn();

    const minigame = new BakingMinigame(stage as never, layer as never, 9, onComplete);
    await Promise.resolve();

    const animation = animationState.instances[0];
    animation.triggerComplete();

    const playRect = konvaState.rects.find(
      (rect) => rect.config.fill === "#90EE90"
    );
    expect(playRect).toBeTruthy();

    playRect!.trigger("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    playRect!.trigger("mouseleave");
    expect(stage.container().style.cursor).toBe("default");
    playRect!.trigger("click tap", { cancelBubble: false });

    const choiceGroup = konvaState.groups.find(
      (group) => group.config.name === "choiceUI"
    );
    const minigameGroup = konvaState.groups.find(
      (group) => group.config.name === "minigameUI"
    );
    expect(choiceGroup?.visible()).toBe(false);
    expect(minigameGroup?.visible()).toBe(true);

    expect(window.addEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );

    const handler = keydownHandler!;
    handler({ key: "Enter" });
    handler({ key: "5" });
    handler({ key: "Backspace" });
    handler({ key: "1" });
    handler({ key: "Enter" });
    vi.advanceTimersByTime(800);

    const scoreText = konvaState.texts.find((text) =>
      (text.config.text as string)?.startsWith("Tips Earned")
    );
    expect(scoreText?.config.text).toBe("Tips Earned: $1");

    handler({ key: "2" });
    handler({ key: "Enter" });
    vi.advanceTimersByTime(800);

    vi.advanceTimersByTime(12000);
    expect(animation.stop).toHaveBeenCalled();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );

    vi.advanceTimersByTime(500);
    expect(onComplete).toHaveBeenCalledWith(
      {
        correctAnswers: 1,
        totalProblems: 2,
        timeRemaining: 0,
      },
      false
    );

    minigame.cleanup();
  });
});
