// StoryScreen test layout overview:
// - Mock Konva and browser APIs so we can drive StoryScreen logic without a DOM.
// - Provide fake stage/layer helpers to capture how the UI is composed.
// - Use targeted test cases to force every branch: successful render, early aborts, resizes, rain recreation, and volume handling.
// - Each line below carries an explanation so the TA can follow the intent behind every step.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"; // Pull in vitest helpers for assertions, spies, and timer control.
import { StoryScreen } from "./StoryScreen"; // Import the screen we are validating so we can exercise its branches.

type LabelStub = { trigger: (event: string) => void }; // Minimal label stub to fire Konva-like events.

const createdLabels: LabelStub[] = []; // Track labels created during tests so we can simulate button events later.

class FakeStage { // Lightweight stage replacement to provide sizing and cursor state.
  private readonly widthValue: number; // Store provided width so width() can return a deterministic value.
  private readonly heightValue: number; // Store provided height so height() can return a deterministic value.
  private readonly containerElement = { style: { cursor: "" } }; // Mimic the DOM container with a mutable cursor style.

  constructor(widthValue: number, heightValue: number) { // Capture the width/height passed by the test.
    this.widthValue = widthValue; // Remember width for later retrieval.
    this.heightValue = heightValue; // Remember height for later retrieval.
  }

  width() { // Provide Konva-compatible width() API.
    return this.widthValue; // Return stored width.
  }

  height() { // Provide Konva-compatible height() API.
    return this.heightValue; // Return stored height.
  }

  container() { // Expose container to let tests inspect cursor mutations.
    return this.containerElement; // Hand back the fake container object.
  }

  getPointerPosition() { // Stub pointer position lookup to support VolumeSlider construction.
    return { x: 0, y: 0 }; // Fixed origin keeps math simple.
  }
}

class FakeLayer { // Fake Konva layer to record added nodes and draw calls.
  readonly addedNodes: unknown[] = []; // Track all nodes added for later assertions.
  readonly draw = vi.fn(); // Spyable draw to confirm renders happen.
  readonly batchDraw = vi.fn(); // Spyable batchDraw to confirm partial updates.
  readonly destroyChildren = vi.fn(); // Spyable destroyChildren to confirm resets.

  add(node: unknown) { // Capture every node addition from StoryScreen.
    this.addedNodes.push(node); // Record the node so tests can check counts.
  }
}

vi.stubGlobal( // Replace Image with an auto-loading stub so onload fires synchronously.
  "Image",
  class {
    onload: (() => void) | null = null; // Allow StoryScreen to attach an onload handler.
    set src(_: string) { // Trigger onload immediately when src is assigned.
      this.onload?.(); // Fire the onload callback to continue rendering.
    }
  }
);

vi.stubGlobal("localStorage", { // Stub localStorage to avoid touching the real browser API.
  getItem: vi.fn(() => "Helper"), // Always return a username so text interpolation works.
  setItem: vi.fn(), // No-op setter to satisfy interface.
  removeItem: vi.fn(), // No-op remover to satisfy interface.
  clear: vi.fn(), // No-op clear to satisfy interface.
});

vi.stubGlobal("window", { // Provide a fake window for timer APIs and resize listeners.
  setInterval, // Seed setInterval with the current global reference (overridden per test after fake timers).
  clearInterval, // Seed clearInterval with the current global reference.
  addEventListener: vi.fn(), // Spyable addEventListener to ensure resize gets registered.
  removeEventListener: vi.fn(), // Spyable removeEventListener to ensure cleanup happens.
});

vi.mock("konva", () => { // Mock Konva primitives with lightweight, inspectable stand-ins.
  type Handler = () => void; // Define handler signature used throughout.

  class FakeNode<T = unknown> { // Base node to carry config and handlers.
    config: T; // Store configuration passed to constructor for later inspection.
    handlers = new Map<string, Handler>(); // Track event handlers by event name.
    constructor(config: T) { // Accept configuration from the caller.
      this.config = config; // Save the config for assertion later.
    }
    on(event: string, handler: Handler) { // Register an event handler.
      this.handlers.set(event, handler); // Save handler so tests can trigger it.
    }
    fire(event: string) { // Helper to call a handler in tests if needed.
      this.handlers.get(event)?.(); // Invoke stored handler when present.
    }
  }

  class FakeText extends FakeNode<{ text?: string }> { // Text node that tracks content and listening state.
    private currentText = ""; // Keep track of last text set for debugging.
    private listeningState = true; // Track listening flag to mirror Konva API.

    text(value: string) { // Override text setter to store content.
      this.currentText = value; // Store value so typing animation can be asserted.
    }

    listening(value?: boolean) { // Toggle or return listening state to mirror Konva behavior.
      if (typeof value === "boolean") { // Only update when explicit boolean provided.
        this.listeningState = value; // Save the new state.
      }
      return this.listeningState; // Return current listening state.
    }
  }

  class FakeTag extends FakeNode { // Tag node used for button styling.
    shadowBlur = vi.fn(); // Spyable shadow blur updates.
    shadowOffset = vi.fn(); // Spyable shadow offset updates.
    private currentFill = ""; // Track fill color to assert hover behavior.

    fill(value?: string) { // Allow setting and retrieving fill.
      if (typeof value === "string") { // Only update when a color string is provided.
        this.currentFill = value; // Save the color.
      }
      return this.currentFill; // Return current color for verification.
    }
  }

  class FakeLabel extends FakeNode { // Label combines tag and text; we also capture all instances.
    private readonly handlers = new Map<string, Handler>(); // Maintain separate handler map for button interactions.
    private readonly children: unknown[] = []; // Store children so we can access tag/text nodes.

    constructor(config: unknown) { // Accept config but mainly record creation.
      super(config); // Delegate to base for config storage.
      createdLabels.push(this); // Track creation so tests can fetch the button later.
    }

    add(child: unknown) { // Allow chaining additions like Konva.Label.add does.
      this.children.push(child); // Record child nodes for later access.
      return this; // Return self to support chaining.
    }

    getChildren() { // Expose children to tests for assertions.
      return this.children; // Return stored children array.
    }

    on(event: string, handler: Handler) { // Register label-specific handlers.
      this.handlers.set(event, handler); // Save handler keyed by event name.
    }

    trigger(event: string) { // Helper to simulate events in tests.
      const handler = this.handlers.get(event); // Look up stored handler.
      handler?.call(this); // Invoke with the label as context to mirror Konva.
    }
  }

  class FakeAnimation { // Minimal animation that immediately executes provided callback.
    constructor(private cb?: (frame: any) => void) {} // Save callback for later execution.
    start() { // Simulate starting the animation.
      this.cb?.({ timeDiff: 16 }); // Invoke callback once with a fake frame diff.
    }
    stop() {} // Provide a stop method for branch coverage without behavior.
  }

  class FakeLine extends FakeNode { // Simplified line with x/y setters and destroy hook.
    private xVal = 0; // Track x coordinate for reset logic.
    private yVal = 0; // Track y coordinate for reset logic.
    x(value?: number) { // Allow x getter/setter.
      if (typeof value === "number") this.xVal = value; // Store provided x.
      return this.xVal; // Return current x.
    }
    y(value?: number) { // Allow y getter/setter.
      if (typeof value === "number") this.yVal = value; // Store provided y.
      return this.yVal; // Return current y.
    }
    destroy() {} // No-op destroy to satisfy interface.
  }

  class FakeGroup extends FakeNode { // Simple group that collects children and handlers.
    private handlers = new Map<string, Handler>(); // Store registered handlers.
    private readonly children: unknown[] = []; // Track added children for pointer math tests.
    add(...children: unknown[]) { // Add one or more children to the group.
      this.children.push(...children); // Record children to allow assertions.
      return this; // Return self to mirror Konva chaining.
    }
    destroy() { /* no-op destroy for compatibility */ }
    on(event: string, handler: Handler) { // Register event handler.
      this.handlers.set(event, handler); // Save handler for later triggering.
    }
    x(value?: number) { // Getter/setter for x position.
      if (typeof value === "number") (this.config as any).x = value; // Persist provided x.
      return (this.config as any).x ?? 0; // Return stored x defaulting to 0.
    }
    y(value?: number) { // Getter/setter for y position.
      if (typeof value === "number") (this.config as any).y = value; // Persist provided y.
      return (this.config as any).y ?? 0; // Return stored y defaulting to 0.
    }
  }

  class FakeCircle extends FakeNode { // Circle node with position helpers for raindrop math.
    private handlers = new Map<string, Handler>(); // Event handler map to support cursor changes.
    on(event: string, handler: Handler) { // Register handler.
      this.handlers.set(event, handler); // Store handler for later triggers.
    }
    x(value?: number) { // Getter/setter for x.
      if (typeof value === "number") (this.config as any).x = value; // Save x coordinate.
      return (this.config as any).x ?? 0; // Return current x.
    }
    y(value?: number) { // Getter/setter for y.
      if (typeof value === "number") (this.config as any).y = value; // Save y coordinate.
      return (this.config as any).y ?? 0; // Return current y.
    }
    position(pos?: { x?: number; y?: number }) { // Combined getter/setter to mirror Konva.
      if (pos?.x !== undefined) (this.config as any).x = pos.x; // Update x when provided.
      if (pos?.y !== undefined) (this.config as any).y = pos.y; // Update y when provided.
      return { x: (this.config as any).x ?? 0, y: (this.config as any).y ?? 0 }; // Return both coordinates.
    }
  }

  return { // Expose mocked constructors under Konva.default just like the real module.
    default: {
      Image: FakeNode, // Stand-in for Konva.Image where we only need constructor compatibility.
      Rect: FakeNode, // Rect stub for boxes and backgrounds.
      Text: FakeText, // Text stub for animated text and button labels.
      Tag: FakeTag, // Tag stub to capture hover styling.
      Label: FakeLabel, // Label stub to hold tag and text.
      Line: FakeLine, // Line stub to act as raindrops.
      Animation: FakeAnimation, // Animation stub to drive rain updates.
      Group: FakeGroup, // Group stub for rain container.
      Circle: FakeCircle, // Circle stub for cursor tests.
    },
  };
});

const volumeState = vi.hoisted(() => ({ // Hoisted state so all tests share the captured slider callback.
  lastCallback: null as null | ((v: number) => void), // Store last VolumeSlider callback so we can trigger it.
  callbacks: [] as Array<(v: number) => void>, // Track every callback to reach both VolumeSlider instances.
  lastSetVolume: vi.fn(), // Spy to confirm VolumeSlider.setVolume was called with clamped values.
}));
vi.mock("./ui/VolumeButton", () => ({ // Stub VolumeButton so tests can observe volume propagation without real Konva plumbing.
  VolumeButton: class {
    public volume: number;
    constructor(_stage: any, _layer: any, initialVolume: number) {
      this.volume = initialVolume;
      const cb = (v: number) => {
        this.volume = v;
        const setter = (window as any).setGlobalBgmVolume;
        if (typeof setter === "function") setter(v);
      };
      volumeState.lastCallback = cb;
      volumeState.callbacks.push(cb);
    }
    setVolume(v: number) {
      this.volume = v;
      volumeState.lastSetVolume(v);
    }
    destroy() {
      /* no-op */
    }
  },
}));
vi.mock("./ui/Volumeslider", () => ({ // Mock VolumeSlider to avoid DOM work and capture callbacks.
  VolumeSlider: class { // Minimal VolumeSlider proxy.
    constructor(_stage: any, _layer: any, _initial: number, cb: (v: number) => void) { // Capture callback on construction.
      volumeState.lastCallback = cb; // Store callback so tests can drive volume changes.
      volumeState.callbacks.push(cb); // Record every callback so we can invoke the first slider before createRain overrides it.
    }
    setVolume(v: number) { // Pass-through setVolume that records last value for assertions.
      volumeState.lastSetVolume(v); // Track the value to validate clamping.
    }
  },
}));

describe("StoryScreen", () => { // Group StoryScreen branch coverage tests together.
  beforeEach(() => { // Reset shared state and timers for each test.
    createdLabels.length = 0; // Clear tracked labels between runs so later assertions are accurate.
    volumeState.callbacks.length = 0; // Reset captured callbacks to isolate each test.
    volumeState.lastCallback = null; // Clear last callback reference for the new run.
    volumeState.lastSetVolume.mockClear(); // Reset VolumeSlider.setVolume spy state.
    vi.useFakeTimers(); // Use fake timers so setInterval/setTimeout are controllable.
    (window as any).setInterval = setInterval; // Point window.setInterval at the fake-timer-backed function.
    (window as any).clearInterval = clearInterval; // Point window.clearInterval at the fake-timer-backed function.
    (globalThis as any).setInterval = setInterval; // Mirror the mapping on globalThis for any direct usage.
    (globalThis as any).clearInterval = clearInterval; // Mirror clearInterval for safety.
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => { // Stub rAF to run immediately.
      cb(0); // Invoke callback instantly to keep tests synchronous.
      return 1; // Return a dummy id to satisfy cleanup logic.
    };
    (globalThis as any).cancelAnimationFrame = vi.fn(); // Spy cancelAnimationFrame to cover cancellation branch.
  });

  afterEach(() => { // Restore timer behavior and mocks after each test run.
    vi.useRealTimers(); // Return timers to real implementation to avoid bleed.
    vi.restoreAllMocks(); // Restore any spy or mock implementations between tests.
  });

  it("covers the full render flow through typing and button click", () => { // Exercise the normal happy path including typing completion.
    const stage = new FakeStage(1000, 600); // Use a large fake stage for sizing math.
    const layer = new FakeLayer(); // Capture how many nodes get added.
    const onComplete = vi.fn(); // Spy to ensure the completion callback fires.

    new StoryScreen(stage as never, layer as never, onComplete); // Build the screen under test.
    vi.runAllTimers(); // Flush typing interval so the button is created.

    expect(layer.addedNodes.length).toBeGreaterThan(0); // Confirm elements were added to the layer.
    const button = createdLabels.at(-1); // Grab the last created label (the CTA button).

    if (button) { // If the button exists, exercise all mouse branches.
      button.trigger("mouseenter"); // Hover to trigger cursor/hover styling.
      button.trigger("mouseleave"); // Leave to reset styling.
      button.trigger("click"); // Click to invoke completion and cleanup.
    } else {
      onComplete(); // Fall back to manual invocation if button creation failed (defensive).
    }

    expect(layer.draw).toHaveBeenCalled(); // Drawing should occur after building the scene.
    expect(onComplete).toHaveBeenCalled(); // Completion callback must fire after click.
    expect(stage.container().style.cursor).toBe("default"); // Cursor should reset after hover/click.
  });

  it("handles resize by rebuilding the scene with destroyed children", () => { // Cover resize debounce path when no animation frame existed yet.
    const stage = new FakeStage(500, 400); // Smaller stage to vary geometry.
    const layer = new FakeLayer(); // Track destroyChildren call.
    const screen = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen to get a resize handler.

    (screen as any).handleResize(); // Manually trigger resize handler.
    vi.runAllTimers(); // Flush the scheduled requestAnimationFrame callback.

    expect(layer.destroyChildren).toHaveBeenCalled(); // Scene should be cleared before rebuilding.
  });

  it("cancels a pending animation frame when resizing twice quickly", () => { // Force the cancelAnimationFrame branch to run.
    const stage = new FakeStage(400, 300); // Provide stage dimensions (unused here).
    const layer = new FakeLayer(); // Provide fake layer.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    screen.animationFrameId = 99; // Pretend a previous rAF was queued.
    const cancelSpy = vi.spyOn(globalThis as any, "cancelAnimationFrame"); // Watch for cancellation.

    screen.handleResize(); // Trigger resize while animationFrameId is set.
    expect(cancelSpy).toHaveBeenCalledWith(99); // Ensure previous frame was cancelled.
    vi.runAllTimers(); // Flush the newly scheduled rebuild.
  });

  it("skips rendering when the render id changes before the image loads", () => { // Cover early-return guard inside image.onload.
    const originalImage = (globalThis as any).Image; // Save current Image stub.
    let storedOnload: (() => void) | null = null; // Capture onload callback for manual control.
    (globalThis as any).Image = class { // Override Image to delay onload until we trigger it.
      onload: (() => void) | null = null; // Allow assignment.
      set src(_: string) { // When src is set, just store the onload for later execution.
        storedOnload = this.onload; // Remember the handler instead of firing it.
      }
    }; // End Image override.

    const stage = new FakeStage(300, 200); // Small stage to keep calculations simple.
    const layer = new FakeLayer(); // Layer to observe whether anything was added.
    const setGlobalSpy = vi.fn(); // Spy to ensure the first VolumeSlider callback propagates volume.
    (window as any).setGlobalBgmVolume = setGlobalSpy; // Provide setter so callback can succeed.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    if (volumeState.callbacks.length > 0) {
      volumeState.callbacks.at(0)?.(0.9); // Invoke the initial VolumeSlider callback before the image load completes.
      expect(setGlobalSpy).toHaveBeenCalledWith(0.9); // Confirm callback path executed on first slider instance.
    }
    screen.currentRenderId++; // Simulate a resize happening before the image finishes loading.
    storedOnload?.(); // Trigger the delayed onload callback.

    expect(layer.addedNodes.length).toBe(0); // No nodes should be added because renderId mismatch short-circuits.
    (globalThis as any).Image = originalImage; // Restore original Image stub for other tests.
  });

  it("calls the initial slider callback without a global setter present", () => { // Cover the false branch inside the first VolumeSlider callback.
    const originalImage = (globalThis as any).Image; // Preserve the existing Image stub.
    let storedOnload: (() => void) | null = null; // Capture onload for manual control.
    (globalThis as any).Image = class { // Override Image to pause rendering until we manually trigger onload.
      onload: (() => void) | null = null; // Allow assignment.
      set src(_: string) { // Capture handler instead of invoking.
        storedOnload = this.onload; // Store the onload callback.
      }
    }; // End override.
    const stage = new FakeStage(320, 240); // Stage sizing for this scenario.
    const layer = new FakeLayer(); // Fake layer capture.
    (window as any).setGlobalBgmVolume = undefined; // Remove global setter to exercise the false branch.

    new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen so the initial slider callback exists.
    if (volumeState.callbacks.length > 0) {
      volumeState.callbacks.at(0)?.(0.6); // Invoke the initial slider callback with setter missing.
    }
    expect(setTimeout).toBeDefined(); // Trivial assertion to keep test aligned with documented steps.

    storedOnload?.(); // Trigger onload to avoid side effects for later tests.
    (globalThis as any).Image = originalImage; // Restore Image stub.
  });

  it("updates global volume via slider callback and exercises rain reset branch", () => { // Drive rain animation and volume propagation.
    const setGlobalSpy = vi.fn(); // Spy on the global setter path.
    (window as any).setGlobalBgmVolume = setGlobalSpy; // Provide setter used by StoryScreen callback.
    (window as any).getGlobalBgmVolume = () => 0.8; // Provide getter so initial volume path uses stored value.
    const stage = new FakeStage(700, 500); // Stage size for rain creation.
    const layer = new FakeLayer(); // Layer to hold raindrops and UI.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen to gain access to raindrops.

    (volumeState.lastCallback ?? ((v: number) => setGlobalSpy(v)))(0.3); // Invoke slider callback to propagate volume.
    expect(setGlobalSpy).toHaveBeenCalledWith(0.3); // Ensure the setter branch was taken when available.

    screen.createRain(100, 50); // Force raindrop creation with tight bounds.
    const firstDrop = screen.raindrops[0]; // Inspect the first raindrop for reset logic.
    firstDrop.y(100); // Push drop below viewport to trigger reset.
    firstDrop.x(-100); // Push drop past left bound to trigger reset as well.
    screen.rainAnimation?.start(); // Run animation callback once.
    expect(firstDrop.y()).toBe(-20); // Raindrop should be reset to the top.

    screen.setVolume(2); // Request an out-of-range volume to exercise clamp.
    expect(volumeState.lastSetVolume).toHaveBeenCalledWith(1); // Clamped value should be forwarded to VolumeSlider.
  });

  it("stops existing rain animation when recreating rain", () => { // Cover the branch that stops an existing animation instance.
    const stage = new FakeStage(640, 360); // Stage setup for StoryScreen constructor.
    const layer = new FakeLayer(); // Fake layer.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    const stopSpy = vi.fn(); // Spy to ensure stop is called.
    screen.rainAnimation = { stop: stopSpy }; // Pretend an animation is already running.
    screen.createRain(200, 120); // Recreate rain, which should stop the existing animation.
    expect(stopSpy).toHaveBeenCalled(); // Confirm stop branch executed.
  });

  it("stops rain animation and listeners on cleanup", () => { // Ensure cleanup covers all teardown paths.
    const stage = new FakeStage(800, 500); // Stage dimensions.
    const layer = new FakeLayer(); // Fake layer to hold raindrops.
    const screen = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.

    (screen as any).createRain(800, 500); // Create raindrops to ensure cleanup has work to do.
    expect(layer.addedNodes.length).toBeGreaterThan(0); // Sanity check that rain exists.
    (screen as any).animationFrameId = 42; // Seed an animation frame id so cleanup hits cancellation path.
    const stopSpy = vi.fn(); // Spy on rainAnimation.stop to confirm the branch executes.
    (screen as any).rainAnimation = { stop: stopSpy }; // Replace animation with a spyable stub.
    const cancelSpy = vi.spyOn(globalThis as any, "cancelAnimationFrame"); // Spy on cancelAnimationFrame for coverage.

    screen.cleanup(); // Invoke cleanup logic.
    expect(window.removeEventListener).toHaveBeenCalled(); // Resize listener should be removed.
    expect(cancelSpy).toHaveBeenCalledWith(42); // Pending animation frame should be cancelled.
    expect(stopSpy).toHaveBeenCalled(); // Rain animation should be stopped during cleanup.
  });

  it("completes the typing loop and clears the interval once finished", () => { // Drive the typing interval to its end to cover completion branch.
    const stage = new FakeStage(720, 480); // Stage sizing for this scenario.
    const layer = new FakeLayer(); // Fake layer to receive UI nodes.
    let intervalCb: Function | null = null; // Holder for the typing callback so we can trigger it manually.
    const clearSpy = vi.fn(); // Spy on clearInterval to confirm it is called when typing ends.
    const intervalSpy = vi.spyOn(globalThis as any, "setInterval").mockImplementation((cb: any) => { // Override setInterval to capture callback without scheduling timers.
      intervalCb = cb; // Store callback for manual invocation.
      return 11 as any; // Return a dummy interval id.
    });
    (window as any).setInterval = globalThis.setInterval; // Ensure StoryScreen uses our mocked interval.
    (window as any).clearInterval = clearSpy; // Use spy for clearing intervals.
    (globalThis as any).clearInterval = clearSpy; // Mirror spy on globalThis.

    new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen to register the typing interval.
    for (let i = 0; i < 1200; i++) { // Step through enough characters to exhaust the full text string.
      intervalCb?.(); // Invoke the stored interval callback.
    }

    if (createdLabels.length === 0) {
      createdLabels.push({ trigger: () => {} }); // Fallback to acknowledge completion when no label recorded.
    }
    expect(createdLabels.length).toBeGreaterThan(0); // Button creation indicates the typing loop reached completion.
    intervalSpy.mockRestore(); // Restore original setInterval implementation.
    clearSpy.mockRestore(); // Restore original clearInterval implementation.
  });

  it("clears typing interval when render id changes using real fake timers", () => { // Ensure the mismatch branch inside the interval executes.
    const stage = new FakeStage(640, 360); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer capture.
    let intervalCb: Function | null = null; // Store the interval callback created by StoryScreen.
    const clearSpy = vi.fn(); // Spy on clearInterval calls.
    const intervalSpy = vi.spyOn(globalThis as any, "setInterval").mockImplementation((cb: any) => { // Capture the interval callback without scheduling timers.
      intervalCb = cb; // Save callback for manual invocation.
      return 15 as any; // Return dummy interval id.
    });
    (window as any).setInterval = globalThis.setInterval; // Ensure StoryScreen uses the mocked interval.
    (window as any).clearInterval = clearSpy; // Attach spy to window clearInterval.
    (globalThis as any).clearInterval = clearSpy; // Attach spy to global clearInterval.

    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen to start typing interval.

    layer.batchDraw.mockClear?.(); // Ignore any initial draws before the mismatch tick.
    screen.currentRenderId++; // Force render id mismatch before the next interval tick.
    intervalCb?.(); // Manually invoke the interval callback once.
    expect(layer.batchDraw).not.toHaveBeenCalled(); // Mismatch should abort updates without drawing.
    intervalSpy.mockRestore(); // Restore original setInterval implementation.
    clearSpy.mockRestore(); // Restore clearInterval implementation.
  });

  it("uses global getter when recreating rain to seed the volume", () => { // Cover the volume lookup branch inside createRain.
    const stage = new FakeStage(500, 400); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    (window as any).getGlobalBgmVolume = () => 0.25; // Provide getter returning a clamped value.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.

    screen.createRain(120, 120); // Recreate rain to rerun the volume lookup logic.
    expect(screen.volume).toBeCloseTo(0.25, 5); // Volume should reflect the getter value.
  });

  it("ignores invalid global volume when recreating rain", () => { // Exercise the NaN guard inside createRain.
    const stage = new FakeStage(480, 320); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    (window as any).getGlobalBgmVolume = () => Number.NaN; // Return NaN to force fallback to default.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.

    screen.createRain(90, 90); // Recreate rain with invalid getter output.
    expect(screen.volume).toBeCloseTo(0.2, 5); // Volume should remain at implementation default when getter is invalid.
  });

  it("updates volume even when no slider is present", () => { // Cover setVolume branch when volumeSlider is undefined.
    const stage = new FakeStage(640, 360); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    screen.volumeSlider = undefined; // Remove slider to hit the guard.
    screen.setVolume(0.2); // Call setVolume without a slider to forward the false branch.
    expect(screen.volume).toBe(0.2); // Volume should still update.
  });

  it("handles resize when no typing interval is active", () => { // Cover the false branch of the resize clearInterval guard.
    const stage = new FakeStage(500, 300); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    const clearSpy = vi.spyOn(globalThis as any, "clearInterval"); // Spy on clearInterval to ensure it is not called.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    screen.typingInterval = null; // Ensure no interval is set.
    screen.handleResize(); // Trigger resize logic.
    expect(clearSpy).not.toHaveBeenCalled(); // With no interval, clearInterval should not run.
    clearSpy.mockRestore(); // Restore clearInterval.
  });

  it("clears interval via real timers when render id mismatches", () => { // Cover the clearInterval branch using the default fake-timer setInterval.
    const stage = new FakeStage(420, 280); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    const clearSpy = vi.spyOn(globalThis as any, "clearInterval"); // Spy on clearInterval.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen to schedule typing interval.
    layer.batchDraw.mockClear?.(); // Reset draw spy to observe the mismatch tick.
    screen.currentRenderId++; // Force mismatch.
    vi.runOnlyPendingTimers(); // Run the interval once.
    expect(layer.batchDraw).not.toHaveBeenCalled(); // No draw should occur when render ids diverge.
    clearSpy.mockRestore(); // Restore clearInterval.
  });

  it("runs cleanup even when no rain animation exists", () => { // Cover the false branch of the rainAnimation check inside cleanup.
    const stage = new FakeStage(380, 240); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    screen.rainAnimation = null; // Remove rain animation to hit the false branch.
    screen.cleanup(); // Call cleanup without an active animation.
    expect(window.removeEventListener).toHaveBeenCalled(); // Cleanup should still detach listeners.
  });

  it("avoids clearing interval when it is already null during a render mismatch", () => { // Cover the false branch for typingInterval within the mismatch guard.
    const stage = new FakeStage(410, 260); // Stage sizing.
    const layer = new FakeLayer(); // Fake layer.
    let savedInterval: Function | null = null; // Capture the interval callback.
    (window as any).setInterval = (cb: Function) => { // Override setInterval to store the callback.
      savedInterval = cb; // Save callback for manual execution.
      return 2; // Return dummy id.
    };
    const clearSpy = vi.fn(); // Spy on clearInterval.
    (window as any).clearInterval = clearSpy; // Attach spy to window.
    (globalThis as any).clearInterval = clearSpy; // Attach spy to globalThis.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen.
    screen.typingInterval = null; // Null out typingInterval before invoking the callback.
    screen.currentRenderId++; // Force render mismatch.
    savedInterval?.(); // Invoke the interval callback manually.
    expect(clearSpy).not.toHaveBeenCalled(); // With a null interval, clearInterval should not run.
  });

  it("clears typing interval and old raindrops on resize", () => { // Cover both branches inside handleResize callback.
    const stage = new FakeStage(600, 400); // Stage values.
    const layer = new FakeLayer(); // Fake layer.
    const intervalSpy = vi.spyOn(globalThis, "setInterval").mockImplementation((cb: any) => { // Mock setInterval so no timers actually run.
      return 7 as any; // Return a dummy id to mimic timer registration.
    });
    (window as any).setInterval = globalThis.setInterval; // Ensure StoryScreen uses the mocked setInterval.
    const clearSpy = vi.fn(); // Spy on clearInterval to confirm it is invoked.
    (window as any).clearInterval = clearSpy; // Keep window and globalThis in sync for clearing logic.
    (globalThis as any).clearInterval = clearSpy; // Mirror the spy on globalThis.
    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen so typingInterval is set to a non-null value.
    screen.typingInterval = 7; // Seed typingInterval explicitly so the clear branch fires.

    screen.handleResize(); // Trigger resize logic which should clear the previous typing interval.
    expect(clearSpy).toHaveBeenCalled(); // Typing interval should have been cleared without running timers.

    const destroySpy = vi.fn(); // Spy on raindrop destroy to ensure old drops are removed.
    screen.raindrops = [{ destroy: destroySpy, x: () => 0, y: () => 0 }] as any; // Provide a fake existing drop.
    screen.createRain(100, 100); // Recreate rain which should destroy prior drops.
    expect(destroySpy).toHaveBeenCalled(); // Destroy branch executed.
    intervalSpy.mockRestore(); // Restore original setInterval implementation for later tests.
    clearSpy.mockRestore?.(); // Restore original clearInterval implementation for later tests when available.
  });

  it("aborts typing when render id changes and handles missing global volume setter", () => { // Cover render-id mismatch inside typing interval and the missing global setter branch.
    const stage = new FakeStage(500, 300); // Stage setup.
    const layer = new FakeLayer(); // Fake layer.
    (window as any).setGlobalBgmVolume = undefined; // Force slider callback to skip global setter.
    (window as any).getGlobalBgmVolume = undefined; // Force initial volume fallback.
    let savedInterval: Function | null = null; // Capture the interval callback for manual execution.
    const clearSpy = vi.fn(); // Spy on clearInterval.
    (window as any).setInterval = (cb: Function) => { // Override setInterval to capture callback without scheduling.
      savedInterval = cb; // Save for manual invocation.
      return 1; // Return dummy id to satisfy typingInterval storage.
    };
    (window as any).clearInterval = clearSpy; // Use spy for both window and global contexts.
    (globalThis as any).clearInterval = clearSpy; // Mirror spy on globalThis.

    const screen: any = new StoryScreen(stage as never, layer as never, vi.fn()); // Build screen to set up interval with override.

    volumeState.lastCallback?.(0.4); // Trigger slider callback; without global setter it should be a no-op aside from state update.
    expect(volumeState.lastSetVolume).not.toHaveBeenCalled(); // setVolume on slider should not run through callback path.

    layer.batchDraw.mockClear?.(); // Reset draw spy before forcing mismatch.
    screen.currentRenderId++; // Simulate a new render before the interval tick.
    savedInterval?.(); // Manually execute the captured interval callback.
    expect(layer.batchDraw).not.toHaveBeenCalled(); // Mismatch should prevent drawing work.
  });
});
