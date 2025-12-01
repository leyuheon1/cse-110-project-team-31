// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

let KonvaModule: any;
let LoginScreen: any;

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
    destroy() {}
    getChildren() {
      return this.children;
    }
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    fire(event: string, payload?: any) {
      this.handlers.get(event)?.(payload);
    }
    findOne() {
      return this.children[0] ?? new FakeNode();
    }
    find() {
      return this.children;
    }
    listening(_: boolean) {
      return _;
    }
    moveToTop() {}
    moveToBottom() {}
    moveToFront() {}
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
    stroke = this.accessor("stroke", "");
    shadowBlur = this.accessor("shadowBlur", 0);
    shadowOffset = this.accessor("shadowOffset", { x: 0, y: 0 });
    shadowOpacity = this.accessor("shadowOpacity", 0);
    shadowColor = this.accessor("shadowColor", "");
    opacity = this.accessor("opacity", 1);
    cornerRadius = this.accessor("cornerRadius", 0);
    fontFamily = this.accessor("fontFamily", "");
    fontSize = this.accessor("fontSize", 16);
    fontStyle = this.accessor("fontStyle", "");
    align = this.accessor("align", "left");
    verticalAlign = this.accessor("verticalAlign", "top");
    lineHeight = this.accessor("lineHeight", 1);
    wrap = this.accessor("wrap", "word");
    offsetY = this.accessor("offsetY", 0);
    offsetX = this.accessor("offsetX", 0);
    padding = this.accessor("padding", 0);
    text = this.accessor("text", "");
    // Explicit method for frameworks that expect a function property
    visible(value?: any) {
      if (value !== undefined) this.config.visible = value;
      return this.config.visible ?? true;
    }
    getTextWidth() {
      return (this.config.text?.length ?? 0) * 10;
    }
  }

  class FakeStage extends FakeNode {
    containerElement = { style: { cursor: "default" } };
    constructor(config: { width: number; height: number }) {
      super(config);
    }
    container() {
      return this.containerElement;
    }
    add(node: any) {
      this.children.push(node);
      return this;
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
  class FakeCircle extends FakeNode {}

  // Expose helper methods used by VolumeSlider
  FakeNode.prototype.position = function (pos?: { x?: number; y?: number }) {
    if (pos) {
      if (pos.x !== undefined) this.config.x = pos.x;
      if (pos.y !== undefined) this.config.y = pos.y;
    }
    return { x: this.config.x ?? 0, y: this.config.y ?? 0 };
  };
  FakeNode.prototype.getPointerPosition = function () {
    return { x: this.config.x ?? 0, y: this.config.y ?? 0 };
  };

  return {
    default: {
      Stage: FakeStage,
      Layer: FakeLayer,
      Group: FakeGroup,
      Rect: FakeRect,
      Text: FakeText,
      Image: FakeImage,
      Line: FakeLine,
      Circle: FakeCircle,
    },
  };
}

describe("LoginScreen basic flow", () => {
  let stage: FakeStage;
  let layer: FakeLayer;
  let onLogin: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const konvaMock = createKonvaMock();
    vi.doMock("konva", () => konvaMock);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    // mock image to auto-load
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        width = 200;
        height = 100;
        set src(_: string) {
          this.onload?.();
        }
      }
    );
    // fonts API
    (document as any).fonts = { load: vi.fn().mockResolvedValue([]) };
    // storage
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    onLogin = vi.fn();
    KonvaModule = (await import("konva")).default;
    LoginScreen = (await import("./LoginScreen")).LoginScreen;
    stage = new KonvaModule.Stage({
      width: 1000,
      height: 800,
      container: { appendChild() {} },
    });
    layer = new KonvaModule.Layer({} as any);
  });

  it("creates UI, handles typing and cleanup", () => {
    const screen = new LoginScreen(stage as any, layer as any, onLogin);

    // focus input and type
    (screen as any).inputBox.fire("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "A" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));

    // trigger login via enter and button click
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    (screen as any).cursor?.fire?.("click");

    screen.cleanup();
    expect(layer.draw).toHaveBeenCalled();
  });

  it("validates empty input on enter and start button", () => {
    const screen = new LoginScreen(stage as any, layer as any, onLogin);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    (screen as any).inputBox.fire("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(alertSpy).toHaveBeenCalledTimes(1);

    // clicking start button also should alert when empty
    const signGroup = layer.children.find((c: any) =>
      c.children?.some((child: any) => child.config?.text === "START GAME")
    );
    expect(signGroup).toBeTruthy();
    signGroup?.fire("click");
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it("restores input state after resize", () => {
    const screen = new LoginScreen(stage as any, layer as any, onLogin);
    (screen as any).focusInput();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "A" }));

    // simulate resize flow
    const destroySpy = vi.spyOn(layer, "destroyChildren");
    (screen as any).handleResize();
    expect(destroySpy).toHaveBeenCalled();

    // cursor should be visible again after resize and focus
    expect((screen as any).inputFocused).toBe(true);
  });

  it("hovering start button changes cursor and clicking logs in", () => {
    const screen = new LoginScreen(stage as any, layer as any, onLogin);
    const button = layer.children.find((c: any) =>
      c.children?.some((child: any) => child.config?.text === "START GAME")
    );
    const board = button?.find()[1];

    button?.fire("mouseenter");
    expect(stage.container().style.cursor).toBe("pointer");
    button?.fire("mouseleave");
    expect(stage.container().style.cursor).toBe("default");

    (screen as any).username = "Tester";
    button?.fire("click");
    expect(onLogin).toHaveBeenCalledWith("Tester");
  });
});
