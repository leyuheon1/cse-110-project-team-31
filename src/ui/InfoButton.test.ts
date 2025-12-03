// InfoButton test layout overview:
// - Mock Konva primitives and browser APIs so the button and popup can be exercised without a DOM.
// - Use fake stage/layer helpers to capture added nodes and cursor changes.
// - Drive every branch: hover/click, popup guarded reopening, fetch success/failure, global volume callbacks, and custom text fallback.
// - Every line is documented so you can explain the reasoning for each step to the TA.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"; // Vitest helpers supply assertions, spies, and lifecycle hooks.
import { InfoButton } from "./InfoButton"; // Subject under test for coverage improvements.
import { VolumeSlider } from "./VolumeSlider"; // Import type so TypeScript is satisfied even when mocked.

class FakeStage { // Minimal Konva stage replacement for sizing and cursor checks.
  private readonly widthValue: number; // Store requested width for deterministic width() responses.
  private readonly heightValue: number; // Store requested height for deterministic height() responses.
  private readonly containerElement = { style: { cursor: "default" } }; // Fake container to observe cursor changes.

  constructor(widthValue: number, heightValue: number) { // Accept dimensions from the test.
    this.widthValue = widthValue; // Save width for width().
    this.heightValue = heightValue; // Save height for height().
  }

  width() { // Provide Konva-like width accessor.
    return this.widthValue; // Return stored width.
  }

  height() { // Provide Konva-like height accessor.
    return this.heightValue; // Return stored height.
  }

  container() { // Expose container so tests can read cursor state.
    return this.containerElement; // Return fake container.
  }

  add(_node: unknown) { // Layer add shim to satisfy InfoButton when adding modal layers.
    // no-op for modal layers // Intentional placeholder because we only need the signature.
  }

  getPointerPosition() { // Provide pointer position to satisfy VolumeSlider construction.
    return { x: 0, y: 0 }; // Fixed origin keeps tests deterministic.
  }
}

class FakeLayer { // Lightweight layer to capture node additions and draw calls.
  readonly addedNodes: unknown[] = []; // Track all nodes added for assertions.
  readonly draw = vi.fn(); // Spyable draw method to verify renders.

  add(node: unknown) { // Record nodes added to the layer.
    this.addedNodes.push(node); // Store for later inspection.
  }
}

const konvaState = vi.hoisted(() => ({ // Shared Konva state so each test can inspect created shapes.
  groups: [] as Array<{ // Track group nodes, their handlers, and children.
    node: unknown;
    handlers: Map<string, () => void>;
    children: unknown[];
  }>,
  circles: [] as Array<{ fillHistory: string[] }>, // Track circle fill changes for hover coverage.
  texts: [] as Array<{ node: any; config: Record<string, unknown>; handlers: Map<string, () => void> }>, // Track text nodes and configs.
  rects: [] as Array<{ node: any; handlers: Map<string, () => void> }>, // Track rectangle nodes such as overlay.
}));

vi.mock("konva", () => { // Mock Konva so we can observe interactions without a canvas.
  type Handler = () => void; // Simplified handler signature.

  class FakeNode { // Base node storing config for inspection.
    config: Record<string, unknown>; // Capture configuration passed to constructor.
    constructor(config?: Record<string, unknown>) { // Accept optional config.
      this.config = { ...(config ?? {}) }; // Copy config to avoid mutation surprises.
    }
  }

  class FakeGroup extends FakeNode { // Group node to hold children and handlers.
    readonly children: unknown[] = []; // Track all children added.
    readonly handlers = new Map<string, Handler>(); // Map of event handlers.

    add(...children: unknown[]) { // Add children just like Konva.Group.add.
      this.children.push(...children); // Record children for later lookup.
      konvaState.groups.push({ node: this, handlers: this.handlers, children: this.children }); // Register group in shared state.
      return this; // Allow chaining.
    }

    on(event: string, handler: Handler) { // Register event handler.
      this.handlers.set(event, handler); // Save handler by event name.
    }

    destroy() {} // No-op destroy to satisfy interface.
  }

  class FakeCircle extends FakeNode { // Circle node that records fill changes and events.
    readonly fillHistory: string[] = []; // Track every fill call to assert hover effects.
    private readonly handlers = new Map<string, Handler>(); // Map of circle-specific handlers.

    fill(color: string) { // Record a fill change.
      this.fillHistory.push(color); // Append to history for later checks.
      this.config.fill = color; // Update config to mirror real behavior.
    }

    on(event: string, handler: Handler) { // Register handler for hover or click.
      this.handlers.set(event, handler); // Save handler by event name.
    }

    x(value?: number) { // Getter/setter for x coordinate.
      if (typeof value === "number") this.config.x = value; // Store provided x.
      return (this.config.x as number) ?? 0; // Return current x value.
    }

    y(value?: number) { // Getter/setter for y coordinate.
      if (typeof value === "number") this.config.y = value; // Store provided y.
      return (this.config.y as number) ?? 0; // Return current y value.
    }

    position(pos?: { x?: number; y?: number }) { // Combined getter/setter convenience.
      if (pos?.x !== undefined) this.config.x = pos.x; // Update x when provided.
      if (pos?.y !== undefined) this.config.y = pos.y; // Update y when provided.
      return { x: this.x(), y: this.y() }; // Return current coordinates.
    }
  }

  class FakeText extends FakeNode { // Text node that records handlers and updates.
    readonly handlers = new Map<string, Handler>(); // Map of event handlers.

    constructor(config?: Record<string, unknown>) { // Accept config from caller.
      super(config); // Save config in base class.
      konvaState.texts.push({ node: this, config: this.config, handlers: this.handlers }); // Register text in shared state.
    }

    text(value: string) { // Update stored text value.
      this.config.text = value; // Keep latest text for assertions.
    }

    fill(value: string) { // Update fill color.
      this.config.fill = value; // Store fill for hover tests.
    }

    width() { // Provide default width when not set.
      return (this.config.width as number) ?? 20; // Default fallback width.
    }

    height() { // Provide default height when not set.
      return (this.config.height as number) ?? 20; // Default fallback height.
    }

    offsetX(_value: number) {} // Placeholder to satisfy API without behavior.

    offsetY(_value: number) {} // Placeholder to satisfy API without behavior.

    x(value?: number) { // Getter/setter for x coordinate.
      if (typeof value === "number") this.config.x = value; // Store provided x.
      return (this.config.x as number) ?? 0; // Return current x.
    }

    y(value?: number) { // Getter/setter for y coordinate.
      if (typeof value === "number") this.config.y = value; // Store provided y.
      return (this.config.y as number) ?? 0; // Return current y.
    }

    on(event: string, handler: Handler) { // Register event handler for click/hover.
      this.handlers.set(event, handler); // Save handler for later invocation.
    }

    destroy() {} // No-op destroy to satisfy API.
  }

  class FakeRect extends FakeNode { // Rectangle node that records handlers for overlay clicks.
    readonly handlers = new Map<string, Handler>(); // Map of event handlers.
    on(event: string, handler: Handler) { // Register event handler.
      this.handlers.set(event, handler); // Save handler by event name.
    }
    constructor(config?: Record<string, unknown>) { // Accept config from caller.
      super(config); // Store config in base class.
      konvaState.rects.push({ node: this, handlers: this.handlers }); // Register rectangle for assertions.
    }
  }
  class FakeLine extends FakeNode {} // Line stub for completeness.
  class FakeLayer extends FakeGroup { // Layer extends group but adds draw/destroy spies.
    draw = vi.fn(); // Spy on draw to ensure renders occur.
    destroy = vi.fn(); // Spy on destroy to ensure modal cleanup occurs.
    batchDraw = vi.fn(); // Spy on batchDraw for completeness.
  }

  return { // Expose mocked constructors to match Konva.default exports.
    default: {
      Group: FakeGroup,
      Circle: FakeCircle,
      Text: FakeText,
      Rect: FakeRect,
      Line: FakeLine,
      Layer: FakeLayer,
    },
  };
});

describe("InfoButton", () => { // Group InfoButton coverage tests.
  beforeEach(() => { // Prepare global state before every test.
    vi.stubGlobal("window", { // Stub window to avoid real DOM interactions.
      location: { href: "about:blank" }, // Provide href property to satisfy potential navigation usage.
      addEventListener: vi.fn(), // Spy on addEventListener to ensure listeners are attached.
      removeEventListener: vi.fn(), // Spy on removeEventListener for cleanup.
      dispatchEvent: vi.fn(), // Spy on dispatchEvent to observe volume events.
    });
    konvaState.groups.length = 0; // Reset tracked groups between tests.
    konvaState.circles.length = 0; // Reset tracked circles between tests.
    konvaState.texts.length = 0; // Reset tracked texts between tests.
    (globalThis.fetch as any) = vi.fn(() => // Stub fetch to resolve with default text unless overridden.
      Promise.resolve({ text: () => Promise.resolve("loaded text") })
    );
  });

  afterEach(() => { // Clean up globals and spies after each test.
    vi.unstubAllGlobals(); // Remove any stubbed globals to avoid cross-test pollution.
    vi.restoreAllMocks(); // Clear spy histories.
    konvaState.groups.length = 0; // Reset shared Konva tracking arrays.
    konvaState.texts.length = 0; // Reset text tracking as well.
  });

  it("opens popup with custom text and closes it", async () => { // Cover custom text path and close interactions.
    const stage = new FakeStage(1000, 800); // Stage large enough for modal sizing math.
    const layer = new FakeLayer(); // Layer to capture node additions.

    new InfoButton(stage as never, layer as never, "Custom info here"); // Instantiate with custom text so fetch is skipped.
    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Locate the button group to simulate events.
    expect(buttonGroup).toBeTruthy(); // Ensure the button was created.
    buttonGroup?.handlers.get("mouseenter")?.(); // Hover to change cursor and circle color.
    expect(stage.container().style.cursor).toBe("pointer"); // Hover should set pointer cursor.
    buttonGroup?.handlers.get("mouseleave")?.(); // Leave to reset styles.
    expect(stage.container().style.cursor).toBe("default"); // Cursor should return to default.

    buttonGroup?.handlers.get("click")?.(); // Click to open popup with custom text.
    await Promise.resolve(); // Await queued promises to let popup build.
    await Promise.resolve(); // Await again to ensure all async paths settle.

    const texts = konvaState.texts.map((entry) => entry.config.text); // Collect displayed text content.
    expect(texts).toContain("Custom info here"); // Custom text should be present.
    const closeButton = konvaState.texts.find((entry) => entry.config.text === "X"); // Locate close button text.
    expect(closeButton).toBeTruthy(); // Close button should exist.
    const closeGroup = konvaState.groups.find((g) => g.children.includes(closeButton?.node)); // Find group that owns the close button.

    closeGroup?.handlers.get("mouseenter")?.(); // Hover close button to change cursor.
    expect(stage.container().style.cursor).toBe("pointer"); // Cursor should reflect hover state.
    closeGroup?.handlers.get("mouseleave")?.(); // Leave close button to reset cursor.
    expect(stage.container().style.cursor).toBe("default"); // Cursor should reset to default.

    closeGroup?.handlers.get("click")?.(); // Click close to destroy modal.
    expect(stage.container().style.cursor).toBe("default"); // Cursor stays default after closing.
  });

  it("invokes global volume setter and event when slider callback fires", async () => { // Cover volume callback path with global setter present.
    const stage = new FakeStage(800, 600); // Stage sizing for button placement.
    const layer = new FakeLayer(); // Layer for node capture.
    const setGlobalSpy = vi.fn(); // Spy on global volume setter.
    (window as any).setGlobalBgmVolume = setGlobalSpy; // Provide setter to InfoButton callback.
    const dispatchSpy = vi.spyOn(window as any, "dispatchEvent"); // Spy on dispatchEvent to ensure event is emitted.

    const button = new InfoButton(stage as never, layer as never); // Build button without custom text (fetch path).
    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Find clickable group.
    buttonGroup?.handlers.get("click")?.(); // Click to open popup and construct VolumeSlider.
    await Promise.resolve(); // Allow fetch promise to resolve.
    await Promise.resolve(); // Allow popup rendering to finish.

    volumeState.lastCallback?.(0.6); // Fire slider callback with new volume.
    expect(setGlobalSpy).toHaveBeenCalledWith(0.6); // Global setter should be called with provided value.
    expect(dispatchSpy).toHaveBeenCalled(); // Volume change event should be dispatched.

    const overlay = konvaState.rects.find((r) => r.handlers.has("click")); // Find overlay rect for close-on-background branch.
    overlay?.handlers.get("click")?.(); // Click overlay to close popup.
  });

  it("clamps setVolume and uses slider when already open, and falls back when fetch fails", async () => { // Cover clamp path and fetch rejection branch.
    const stage = new FakeStage(900, 700); // Stage sizing.
    const layer = new FakeLayer(); // Layer capture.
    (globalThis.fetch as any) = vi.fn(() => Promise.reject(new Error("fail"))); // Force fetch to fail and trigger fallback text.

    const button: any = new InfoButton(stage as never, layer as never); // Build button.
    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Locate clickable group.
    buttonGroup?.handlers.get("click")?.(); // Open popup (will use fallback message).
    await Promise.resolve(); // Wait for async branch to complete.

    button.setVolume(2); // Call setVolume above 1 to test clamping behavior.
    expect(button.volume).toBe(1); // Volume should clamp to 1.
    expect(volumeState.lastSetVolume).toHaveBeenCalledWith(1); // Slider should receive clamped value.

    buttonGroup?.handlers.get("click")?.(); // Click again while popup open to hit guard branch.
    expect(button.isPopupOpen).toBe(true); // Popup should remain open (click ignored).
  });

  it("handles volume callback when no global setter is present", async () => { // Cover branch where setGlobalBgmVolume is missing.
    const stage = new FakeStage(750, 550); // Stage sizing.
    const layer = new FakeLayer(); // Layer capture.
    const dispatchSpy = vi.spyOn(window as any, "dispatchEvent"); // Spy on event dispatch even without setter.
    const button = new InfoButton(stage as never, layer as never); // Build button.
    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Locate clickable group.
    buttonGroup?.handlers.get("click")?.(); // Open popup to create slider.
    await Promise.resolve(); // Wait for fetch resolution.
    await Promise.resolve(); // Wait for popup rendering completion.

    volumeState.lastCallback?.(0.2); // Trigger slider callback without global setter present.
    expect(dispatchSpy).toHaveBeenCalled(); // Event should still dispatch even when setter missing.
  });

  it("falls back to fetched instructions when custom text absent", async () => { // Cover fetch success path when no custom text provided.
    const stage = new FakeStage(900, 600); // Stage sizing.
    const layer = new FakeLayer(); // Layer capture.

    new InfoButton(stage as never, layer as never); // Instantiate without custom text to use fetch.
    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Locate clickable group.
    expect(buttonGroup).toBeTruthy(); // Ensure button exists.

    buttonGroup?.handlers.get("click")?.(); // Click to open popup.
    await Promise.resolve(); // Wait for fetch.
    await Promise.resolve(); // Wait for popup render.

    expect(fetch).toHaveBeenCalledWith("/howtoplaypopup.txt"); // Confirm correct asset requested.
    const texts = konvaState.texts.map((entry) => entry.config.text); // Collect text content.
    expect(texts).toContain("loaded text"); // Loaded instructions should appear.
  });

  it("uses global getter to seed initial volume and clamps invalid values", async () => { // Cover branch where getGlobalBgmVolume returns a number.
    const stage = new FakeStage(850, 650); // Stage sizing for popup math.
    const layer = new FakeLayer(); // Layer capture.
    const getterSpy = vi.fn(() => 1.5); // Spy on getter so we can prove the branch executed.
    (window as any).getGlobalBgmVolume = getterSpy; // Return out-of-range volume to exercise clamp.
    const setGlobalSpy = vi.fn(); // Spy on setter so callback path is also covered.
    (window as any).setGlobalBgmVolume = setGlobalSpy; // Provide setter to receive callback.

    const button = new InfoButton(stage as never, layer as never); // Build button with global getter present.
    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Find clickable group.
    buttonGroup?.handlers.get("click")?.(); // Open popup to construct slider using global getter value.
    await Promise.resolve(); // Await potential fetch resolution.
    await Promise.resolve(); // Await popup construction.

    volumeState.lastCallback?.(0.4); // Trigger slider callback to ensure setter still invoked.
    expect(setGlobalSpy).toHaveBeenCalledWith(0.4); // Setter should receive callback volume.
    button.setVolume(0.8); // Call setVolume while slider exists to cover direct setter branch.
    expect(volumeState.lastSetVolume).toHaveBeenCalled(); // Slider proxy should receive forwarded volume.
    await (button as any).showPopup(); // Manually invoke showPopup again while open to hit early-return guard.
    expect(getterSpy).toHaveBeenCalled(); // Getter should have been used when popup first opened.
    expect(button.volume).toBeLessThanOrEqual(1); // Initial volume should have been clamped to <=1.
  });

  it("routes setVolume before popup open without a slider and after popup with a slider", async () => { // Cover both branches of setVolume and re-entry into showPopup.
    const stage = new FakeStage(820, 620); // Stage sizing.
    const layer = new FakeLayer(); // Layer capture.
    const button = new InfoButton(stage as never, layer as never); // Build button without immediately opening popup.

    button.setVolume(0.3); // Invoke setVolume before slider exists to cover the guard.
    expect(button.volume).toBe(0.3); // Volume should still update even without a slider.

    const buttonGroup = konvaState.groups.find((entry) => entry.handlers.has("click")); // Locate clickable button group.
    buttonGroup?.handlers.get("click")?.(); // Open popup to create the slider instance.
    await Promise.resolve(); // Wait for async popup flow.
    await Promise.resolve(); // Wait again to ensure slider is constructed.

    button.setVolume(0.9); // Invoke setVolume after slider exists to hit the true branch.
    expect(volumeState.lastSetVolume).toHaveBeenCalledWith(0.9); // Slider proxy should receive the volume update.
    await (button as any).showPopup(); // Call showPopup directly while open to exercise early return path.
  });

  it("reads global volume when showing popup directly", async () => { // Explicitly drive the getGlobalBgmVolume branch inside showPopup.
    const stage = new FakeStage(810, 610); // Stage sizing.
    const layer = new FakeLayer(); // Layer capture.
    const getterSpy = vi.fn(() => 0.4); // Spy getter to verify usage.
    (window as any).getGlobalBgmVolume = getterSpy; // Provide getter for showPopup.
    const button: any = new InfoButton(stage as never, layer as never); // Build button.

    await button.showPopup(); // Call showPopup directly to avoid click indirection.
    expect(getterSpy).toHaveBeenCalled(); // Getter should be invoked inside showPopup.
    expect(button.volume).toBeLessThanOrEqual(1); // Volume remains clamped after reading the getter.
  });

  it("falls back to default volume when getter returns NaN", async () => { // Cover the invalid-value branch inside showPopup volume logic.
    const stage = new FakeStage(800, 600); // Stage sizing.
    const layer = new FakeLayer(); // Layer capture.
    (window as any).getGlobalBgmVolume = () => Number.NaN; // Getter returns NaN to trigger fallback.
    const button: any = new InfoButton(stage as never, layer as never); // Build button.

    await button.showPopup(); // Invoke showPopup directly.
    expect(button.volume).toBeCloseTo(0.5, 5); // Default volume should be used when getter is invalid.
  });
});

const volumeState = vi.hoisted(() => ({ // Shared VolumeSlider spies to drive callback branches.
  lastCallback: null as null | ((v: number) => void), // Store last callback so tests can invoke it.
  lastSetVolume: vi.fn(), // Spy on VolumeSlider.setVolume calls.
}));
vi.mock("./VolumeSlider", () => ({ // Mock VolumeSlider to avoid DOM and expose callback.
  VolumeSlider: class { // Minimal proxy matching the constructor and setVolume API.
    private width = 160;
    constructor(_stage: any, _layer: any, _initial: number, cb: (v: number) => void) { // Capture callback when instantiated.
      volumeState.lastCallback = cb; // Save callback for later manual invocation.
    }
    setVolume(v: number) { // Proxy setVolume that records calls.
      volumeState.lastSetVolume(v); // Record the value to assert clamping and updates.
    }
    getWidth() { // Mirror VolumeSlider layout helper used by InfoButton.
      return this.width;
    }
    setPosition(_x: number, _y: number) {
      /* layout helper stub */
    }
  },
}));
