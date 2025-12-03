// Layout note: sections cover Konva fakes, helpers, then behavior tests (hover, click, destroy) so each assertion is easy to explain.
import { describe, it, expect, vi, beforeEach } from "vitest"; // vitest helpers

type Handler = (...args: any[]) => void; // reusable handler signature

// Simple Konva stand-ins with just enough API for ExitButton.
class FakeNode {
  config: Record<string, any>; // store config parameters
  handlers = new Map<string, Handler>(); // events registry
  constructor(config: Record<string, any> = {}) {
    this.config = { ...config }; // shallow copy for isolation
  }
  on(event: string, handler: Handler) {
    this.handlers.set(event, handler); // allow tests to trigger
  }
  fire(event: string) {
    this.handlers.get(event)?.(); // invoke stored handler
  }
  destroy() {
    this.config.destroyed = true; // mark destroyed for checks
  }
}

class FakeStage extends FakeNode {
  containerEl = { style: { cursor: "default" } }; // emulate DOM container style
  width() {
    return this.config.width ?? 800; // width reads
  }
  height() {
    return this.config.height ?? 600; // height reads
  }
  container() {
    return this.containerEl; // expose container for cursor assertions
  }
}

class FakeLayer extends FakeNode {
  draw = vi.fn(); // spy to ensure draw is invoked
  add(node: any) {
    this.config.added = [...(this.config.added ?? []), node]; // track added nodes for sanity
  }
}

class FakeGroup extends FakeNode {
  add(...nodes: any[]) {
    this.config.children = [...(this.config.children ?? []), ...nodes]; // track children
  }
}

class FakeRect extends FakeNode {
  fill(value?: string) {
    if (value) this.config.fill = value; // mutate fill color when called
    return this.config.fill; // allow tests to read back
  }
}

class FakeText extends FakeNode {}

// Install the Konva mock before each test.
vi.mock("konva", () => ({
  default: {
    Stage: FakeStage,
    Layer: FakeLayer,
    Group: FakeGroup,
    Rect: FakeRect,
    Text: FakeText,
  },
})); // hoisted Konva replacement so ExitButton uses fakes

describe("ExitButton", () => {
  beforeEach(() => {
    vi.resetModules(); // clean module cache
    vi.clearAllMocks(); // reset spies
  });

  it("changes colors and cursor on hover, triggers exit on click", async () => {
    const Konva = (await import("konva")).default as any; // import mocked Konva
    const { ExitButton } = await import("./ExitButton"); // import after mocks
    const layer = new Konva.Layer(); // fake layer for draw spy
    const stage = new Konva.Stage({ width: 400, height: 300 }); // stage drives sizing
    const exitSpy = vi.fn(); // spy for exit callback

    const button = new ExitButton(stage, layer, exitSpy); // create button to test interactions
    const rect = (button as any).buttonGroup.config.children[0] as FakeRect; // first child is the rect

    rect.fire("mouseenter"); // simulate hover in
    expect(stage.container().style.cursor).toBe("pointer"); // cursor switches to pointer
    expect(rect.fill()).toBe("#ff7775"); // hover fill color applied

    rect.fire("mouseleave"); // simulate hover out
    expect(stage.container().style.cursor).toBe("default"); // cursor resets
    expect(rect.fill()).toBe("#da5552"); // base color restored

    rect.fire("click"); // simulate click
    expect(exitSpy).toHaveBeenCalledTimes(1); // callback fired once
    expect(layer.draw).toHaveBeenCalled(); // draw invoked during setup
  });

  it("destroys group and redraws when destroy is called", async () => {
    const Konva = (await import("konva")).default as any; // mocked Konva access
    const { ExitButton } = await import("./ExitButton"); // import after mocks
    const layer = new Konva.Layer(); // layer spy
    const stage = new Konva.Stage({ width: 300, height: 200 }); // stage for sizing

    const button = new ExitButton(stage, layer, vi.fn()); // build button to exercise destroy
    (button as any).destroy(); // call destroy explicitly
    expect((button as any).buttonGroup.config.destroyed).toBe(true); // group flagged as destroyed
    expect(layer.draw).toHaveBeenCalledTimes(2); // draw once for setup, once for destroy
  });
});
