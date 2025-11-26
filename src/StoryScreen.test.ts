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
}

class FakeLayer {
  readonly addedNodes: unknown[] = [];
  readonly draw = vi.fn();
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

vi.mock("konva", () => {
  type Handler = () => void;

  class FakeNode<T = unknown> {
    config: T;
    constructor(config: T) {
      this.config = config;
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

  return {
    default: {
      Image: FakeNode,
      Rect: FakeNode,
      Text: FakeText,
      Tag: FakeTag,
      Label: FakeLabel,
    },
  };
});

describe("StoryScreen", () => {
  beforeEach(() => {
    createdLabels.length = 0;
    vi.useFakeTimers();
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
    expect(button).toBeTruthy();

    button!.trigger("mouseenter");
    button!.trigger("mouseleave");
    button!.trigger("click");

    expect(layer.draw).toHaveBeenCalled();
    expect(layer.destroyChildren).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    expect(stage.container().style.cursor).toBe("default");
  });
});
