// Layout note: mocks first, then a helper to build the button, followed by interaction tests (hover/click) and teardown tests so the flow is easy to walk through with a TA.
import { describe, it, expect, vi, beforeEach } from "vitest"; // vitest primitives

type Handler = (...args: any[]) => void; // shorthand for event handler signatures

// Lightweight Konva doubles tailored to ShuffleButton needs.
class FakeNode {
  config: Record<string, any>; // hold configuration values
  handlers = new Map<string, Handler>(); // map of event handlers
  constructor(config: Record<string, any> = {}) {
    this.config = { ...config }; // store copy for later reads
  }
  on(event: string, handler: Handler) {
    this.handlers.set(event, handler); // allow manual firing
  }
  fire(event: string) {
    this.handlers.get(event)?.(); // trigger stored handler if present
  }
  destroy() {
    this.config.destroyed = true; // flag destruction for assertions
  }
}

class FakeStage extends FakeNode {
  containerEl = { style: { cursor: "default" } }; // mirror DOM container for cursor checks
  width() {
    return this.config.width ?? 800; // support width reads
  }
  height() {
    return this.config.height ?? 600; // support height reads
  }
  container() {
    return this.containerEl; // expose container for hover assertions
  }
}

class FakeLayer extends FakeNode {
  draw = vi.fn(); // spy on draw calls
}

class FakeGroup extends FakeNode {
  add(...nodes: any[]) {
    this.config.children = [...(this.config.children ?? []), ...nodes]; // track children for inspection
  }
}

class FakeCircle extends FakeNode {
  fill(value?: string) {
    if (value) this.config.fill = value; // mutate fill color when provided
    return this.config.fill; // getter for tests
  }
  opacity(value?: number) {
    if (typeof value === "number") this.config.opacity = value; // store opacity set by button
    return this.config.opacity ?? 1; // default opacity
  }
}

class FakeText extends FakeNode {
  offsetX = vi.fn(); // accept offset calls without behavior
  offsetY = vi.fn(); // accept offset calls without behavior
  width() {
    return 10; // return a small width to feed offset math
  }
  height() {
    return 10; // return a small height to feed offset math
  }
  fill(value?: string) {
    if (typeof value === "string") this.config.fill = value; // store fill color set by button
    return this.config.fill ?? "#16a085"; // default matches active color
  }
  text(value?: string) {
    if (typeof value === "string") this.config.text = value; // allow text mutations
    return this.config.text ?? ""; // expose text for assertions
  }
}

// Register the mock with Vitest.
vi.mock("konva", () => ({
  default: {
    Stage: FakeStage,
    Layer: FakeLayer,
    Group: FakeGroup,
    Circle: FakeCircle,
    Text: FakeText,
  },
})); // hoisted Konva mock to avoid real DOM needs

describe("ShuffleButton", () => {
  beforeEach(() => {
    vi.resetModules(); // fresh module cache
    vi.clearAllMocks(); // reset spies
  });

  it("shows hover feedback only when shuffles remain and consumes clicks", async () => {
    const Konva = (await import("konva")).default as any; // import mocked Konva
    const { ShuffleButton } = await import("./ShuffleButton"); // import target after mocks
    const stage = new Konva.Stage({ width: 600, height: 400 }); // stage for sizing and cursor
    const layer = new Konva.Layer(); // layer with draw spy
    const parent = new Konva.Group(); // parent group receives the button
    const onShuffle = vi.fn(); // spy on shuffle callback

    const button = new ShuffleButton(stage, layer, parent, 200, 100, 40, onShuffle); // build button to test interactions
    const group = (button as any).buttonGroup as FakeGroup; // access eventful group
    const circle = (button as any).buttonCircle as FakeCircle; // access circle styling
    const countText = (button as any).shuffleCountText as FakeText; // access counter text

    group.fire("mouseenter"); // hover with shuffles remaining
    expect(stage.container().style.cursor).toBe("pointer"); // cursor should flip to pointer
    expect(circle.fill()).toBe("#138d75"); // darker fill applied on hover
    expect(layer.draw).toHaveBeenCalledTimes(1); // hover triggers a draw

    group.fire("click"); // first shuffle
    expect((button as any).getShufflesRemaining()).toBe(2); // remaining count decreased
    expect(countText.text()).toContain("2"); // counter text updated
    expect(onShuffle).toHaveBeenCalledTimes(1); // callback fired

    group.fire("click"); // second shuffle
    group.fire("click"); // third shuffle takes it to zero
    expect((button as any).getShufflesRemaining()).toBe(0); // exhausted shuffles
    expect(circle.fill()).toBe("#95a5a6"); // button visually disabled
    expect(circle.opacity()).toBe(0.6); // opacity lowered when out of shuffles
    expect(onShuffle).toHaveBeenCalledTimes(3); // callback fired for each allowed click

    stage.container().style.cursor = "default"; // reset cursor manually
    group.fire("mouseenter"); // hover after exhaustion
    expect(stage.container().style.cursor).toBe("default"); // cursor stays default when no shuffles left
    expect(layer.draw).toHaveBeenCalledTimes(4); // hover triggers one draw and each shuffle triggers one
  });

  it("destroys nodes and redraws on destroy", async () => {
    const Konva = (await import("konva")).default as any; // mocked Konva access
    const { ShuffleButton } = await import("./ShuffleButton"); // import target after mocks
    const stage = new Konva.Stage({ width: 500, height: 300 }); // stage baseline
    const layer = new Konva.Layer(); // layer spy
    const parent = new Konva.Group(); // parent holder

    const button = new ShuffleButton(stage, layer, parent, 150, 80, 30, vi.fn()); // create button
    (button as any).destroy(); // call destroy lifecycle

    expect((button as any).buttonGroup.config.destroyed).toBe(true); // group flagged destroyed
    expect((button as any).shuffleCountText.config.destroyed).toBe(true); // counter destroyed too
    expect(layer.draw).toHaveBeenCalledTimes(1); // draw invoked once during destroy
  });
});
