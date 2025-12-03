// Layout note: this file is split into Konva fakes, a helper factory to build VolumeSlider with spies, and focused tests that exercise drag, click, and programmatic volume updates so I can explain each coverage point clearly.
import { describe, it, expect, vi, beforeEach } from "vitest"; // import vitest APIs for structuring and assertions

type Handler = (...args: any[]) => void; // alias to annotate handler maps

// Minimal Konva doubles that record state and expose the methods VolumeSlider calls.
class FakeNode {
  config: Record<string, any>; // store construction config and later mutations
  handlers = new Map<string, Handler>(); // registry for event handlers
  constructor(config: Record<string, any> = {}) {
    this.config = { ...config }; // copy config so each node is isolated
  }
  on(event: string, handler: Handler) {
    this.handlers.set(event, handler); // allow tests to trigger later
  }
  fire(event: string, payload?: any) {
    this.handlers.get(event)?.(payload); // simulate Konva event dispatch
  }
}

class FakeStage extends FakeNode {
  private pointer: { x: number; y: number } | null = { x: 0, y: 0 }; // track pointer for getPointerPosition
  containerEl = { style: { cursor: "default" } }; // emulate DOM container style mutation
  width() {
    return this.config.width ?? 800; // support width reads
  }
  height() {
    return this.config.height ?? 600; // support height reads
  }
  container() {
    return this.containerEl; // expose container for cursor expectations
  }
  setPointer(x: number, y: number) {
    this.pointer = { x, y }; // allow tests to move pointer
  }
  getPointerPosition() {
    return this.pointer; // VolumeSlider reads this during track clicks
  }
}

class FakeLayer extends FakeNode {
  draw = vi.fn(); // spy to assert drawing occurs
  batchDraw = vi.fn(); // spy for batched redraws
  add(node: any) {
    return node; // no-op add because we only care about side effects
  }
}

class FakeGroup extends FakeNode {
  add(...nodes: any[]) {
    nodes.forEach((n) => (n.config.parent = this)); // record parent for debugging
    return this; // chainable like Konva.Group
  }
  x() {
    return this.config.x ?? 0; // expose x for pointer translation math
  }
  y() {
    return this.config.y ?? 0; // expose y for completeness
  }
}

class FakeRect extends FakeNode {}

class FakeCircle extends FakeNode {
  x(value?: number) {
    if (typeof value === "number") this.config.x = value; // setter for x position
    return this.config.x ?? 0; // getter for assertions
  }
  y(value?: number) {
    if (typeof value === "number") this.config.y = value; // setter for y position
    return this.config.y ?? 0; // getter for assertions
  }
  position(pos?: { x: number; y: number }) {
    if (pos) {
      this.config.x = pos.x; // set via position helper
      this.config.y = pos.y;
    }
    return { x: this.x(), y: this.y() }; // return for parity with Konva
  }
}

class FakeText extends FakeNode {
  width() {
    return (this.config.width as number) ?? 0; // mimic Konva width method
  }
  offsetX(_value: number) {
    /* no-op for tests */
  }
}

// Factory that wires Fake Konva into the module system for each test.
vi.mock("konva", () => ({
  default: {
    Stage: FakeStage,
    Layer: FakeLayer,
    Group: FakeGroup,
    Rect: FakeRect,
    Circle: FakeCircle,
    Text: FakeText,
  },
})); // hoisted Konva mock so VolumeSlider always uses fakes

vi.stubGlobal("Image", class {
  onload: (() => void) | null = null;
  set src(_: string) {
    this.onload?.();
  }
});

describe("VolumeSlider", () => {
  beforeEach(() => {
    vi.resetModules(); // ensure fresh module state between tests
    vi.clearAllMocks(); // reset spy call counts
  });

  it("initializes knob position and clamps setVolume", async () => {
    const changeSpy = vi.fn(); // observe callback invocations
    const Konva = (await import("konva")).default as any; // pull in the mocked Konva
    const { VolumeSlider } = await import("./VolumeSlider"); // import target after mocks
    const stage = new Konva.Stage({ width: 400, height: 300 }); // stage with deterministic size
    const layer = new Konva.Layer(); // layer spy container

    const slider = new VolumeSlider(stage, layer, 0.25, changeSpy); // create slider with 25% initial volume
    const knob = (slider as any).knob as FakeCircle; // reach into private knob for assertions

    expect(knob.x()).toBeCloseTo(40); // 0.25 * 160 width results in x=40
    (slider as any).setVolume(2); // push above 1 to verify clamping logic
    expect(knob.x()).toBe(160); // knob should clamp to max width
    expect(layer.batchDraw).toHaveBeenCalled(); // setVolume triggers a redraw
  });

  it("maps drag movement to clamped volume and redraws", async () => {
    const changeSpy = vi.fn(); // callback spy for drag updates
    const Konva = (await import("konva")).default as any; // mocked Konva access
    const { VolumeSlider } = await import("./VolumeSlider"); // import target after mocks
    const stage = new Konva.Stage({ width: 500, height: 300 }); // stage drives position math
    const layer = new Konva.Layer(); // layer with spyable batchDraw

    const slider = new VolumeSlider(stage, layer, -1, changeSpy); // start below zero to exercise clamp in constructor
    const knob = (slider as any).knob as FakeCircle; // access knob instance

    knob.x(-50); // simulate Konva setting a negative drag position
    knob.fire("dragmove"); // trigger drag handler registered in constructor
    expect(knob.x()).toBe(0); // knob must clamp to the left edge
    expect(changeSpy).toHaveBeenLastCalledWith(0); // callback receives normalized volume

    knob.x(500); // overshoot to the right
    knob.fire("dragmove"); // trigger drag logic again
    expect(knob.x()).toBe(160); // clamp to slider width
    expect(layer.batchDraw).toHaveBeenCalledTimes(2); // redraw fired for each drag
  });

  it("moves knob on track click using pointer position and calls callback", async () => {
    const changeSpy = vi.fn(); // observe click volume change
    const Konva = (await import("konva")).default as any; // load mocked Konva
    const { VolumeSlider } = await import("./VolumeSlider"); // import target after mocks
    const stage = new Konva.Stage({ width: 320, height: 200 }); // compact stage for simple math
    const layer = new Konva.Layer(); // layer spy

    const slider = new VolumeSlider(stage, layer, 0.5, changeSpy); // build slider with default 50%
    const track = (slider as any).track as FakeRect; // access the track node
    const knob = (slider as any).knob as FakeCircle; // access knob for position verification
    (stage as FakeStage).setPointer(200, 0); // place pointer to the right of center

    track.fire("mousedown"); // simulate clicking the track
    expect(knob.x()).toBeGreaterThan(0); // knob should have moved from the initial position
    expect(changeSpy).toHaveBeenCalledTimes(1); // click invokes the callback once (constructor does not)
    expect(layer.batchDraw).toHaveBeenCalled(); // redraw after click
  });
});
