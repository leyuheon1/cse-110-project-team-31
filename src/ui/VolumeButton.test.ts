// VolumeButton behavioral coverage:
// - verifies popup creation/close, global volume propagation, and slider wiring
// - exercises setVolume before/after popup to cover clamping and forwarding logic
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VolumeButton } from "./VolumeButton";

type Handler = (...args: any[]) => void;

const konvaState = vi.hoisted(() => ({
  groups: [] as Array<{ handlers: Map<string, Handler> }>,
  rects: [] as Array<{ config: Record<string, any>; handlers: Map<string, Handler> }>,
  layers: [] as Array<any>,
}));

vi.mock("konva", () => {
  class Node {
    config: Record<string, any>;
    handlers = new Map<string, Handler>();
    constructor(config: Record<string, any> = {}) {
      this.config = { ...config };
    }
    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
    }
    fire(event: string, payload?: any) {
      this.handlers.get(event)?.(payload);
    }
  }

  class Group extends Node {
    children: any[] = [];
    add(...children: any[]) {
      this.children.push(...children);
      return this;
    }
    destroy() {
      this.config.destroyed = true;
    }
  }

  class Rect extends Node {
    constructor(config: Record<string, any> = {}) {
      super(config);
      konvaState.rects.push({ config: this.config, handlers: this.handlers });
    }
  }
  class Circle extends Node {
    fill(color?: string) {
      if (color) this.config.fill = color;
      return this.config.fill;
    }
  }
  class Text extends Node {}

  class Layer extends Group {
    draw = vi.fn();
    batchDraw = vi.fn();
    destroy = vi.fn();
  }

  class Stage extends Node {
    containerEl = { style: { cursor: "default" } };
    children: any[] = [];
    width() {
      return this.config.width ?? 0;
    }
    height() {
      return this.config.height ?? 0;
    }
    container() {
      return this.containerEl;
    }
    add(child: any) {
      this.children.push(child);
      konvaState.layers.push(child);
    }
  }

  return {
    default: {
      Group,
      Rect,
      Circle,
      Text,
      Layer,
      Stage,
      Image: class {},
    },
  };
});

const sliderState = vi.hoisted(() => ({
  lastCallback: null as null | ((v: number) => void),
  lastSetVolume: vi.fn(),
  lastSetPosition: vi.fn(),
  lastInitial: null as null | number,
}));

vi.mock("./VolumeSlider", () => ({
  VolumeSlider: class {
    constructor(_stage: any, _layer: any, initial: number, cb: (v: number) => void) {
      sliderState.lastCallback = cb;
      sliderState.lastInitial = initial;
    }
    getWidth() {
      return 160;
    }
    setPosition(x: number, y: number) {
      sliderState.lastSetPosition(x, y);
    }
    setVolume(v: number) {
      sliderState.lastSetVolume(v);
    }
  },
}));

vi.stubGlobal(
  "Image",
  class {
    onload: (() => void) | null = null;
    set src(_: string) {
      this.onload?.();
    }
  }
);

describe("VolumeButton", () => {
  beforeEach(() => {
    konvaState.groups.length = 0;
    konvaState.rects.length = 0;
    konvaState.layers.length = 0;
    sliderState.lastCallback = null;
    sliderState.lastInitial = null;
    sliderState.lastSetVolume.mockClear();
    sliderState.lastSetPosition.mockClear();
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        set src(_: string) {
          this.onload?.();
        }
      }
    );
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens popup once, seeds volume from global getter, and routes slider callback", async () => {
    const setGlobalSpy = vi.fn();
    (window as any).setGlobalBgmVolume = setGlobalSpy;
    (window as any).getGlobalBgmVolume = () => 2; // ensure clamp to 1

    const { default: Konva } = await import("konva");
    const stage = new Konva.Stage({ width: 800, height: 600 });
    const layer = new Konva.Layer();
    const button: any = new VolumeButton(stage as never, layer as never, 0.4);

    // trigger click to open popup
    button["group"].handlers.get("click")?.();
    expect(sliderState.lastInitial).toBe(1); // clamped global getter value
    sliderState.lastSetPosition.mock.calls.length === 1;
    expect(sliderState.lastSetPosition).toHaveBeenCalled(); // slider positioned

    // slider callback propagates to global setter and event
    sliderState.lastCallback?.(0.3);
    expect(setGlobalSpy).toHaveBeenCalledWith(0.3);
    expect((window as any).dispatchEvent).toHaveBeenCalled();

    // overlay click should close popup and redraw base layer
    const overlay = konvaState.rects.find((r) => r.config.fill?.toString().includes("rgba"));
    overlay?.handlers.get("click")?.();
    expect(button.isPopupOpen).toBe(false);
    expect(layer.draw).toHaveBeenCalled();
  });

  it("clamps setVolume before and after popup creation", async () => {
    const { default: Konva } = await import("konva");
    const stage = new Konva.Stage({ width: 500, height: 400 });
    const layer = new Konva.Layer();
    const button = new VolumeButton(stage as never, layer as never, 0.2);

    button.setVolume(-1); // before popup exists
    expect(button.volume).toBe(0);
    expect(sliderState.lastSetVolume).not.toHaveBeenCalled();

    button["group"].handlers.get("click")?.(); // open popup to create slider
    button.setVolume(2); // forward to slider with clamp
    expect(button.volume).toBe(1);
    expect(sliderState.lastSetVolume).toHaveBeenCalledWith(1);
  });
});
