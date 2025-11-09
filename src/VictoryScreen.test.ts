// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import Konva from 'konva';
import { VictoryScreen } from './VictoryScreen';

// Mock options for the VictoryScreen
interface MockOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onExit: Mock<[], void>;
  onReturnHome: Mock<[], void>;
}

describe('VictoryScreen', () => {
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let mockOpts: MockOptions;
  let victoryScreen: VictoryScreen;
  let stageContainer: HTMLDivElement;

  beforeEach(() => {
    // 1. Create a DOM element for Konva to attach to (required by jsdom)
    stageContainer = document.createElement('div');
    document.body.appendChild(stageContainer);

    // 2. Setup mock stage and layer
    stage = new Konva.Stage({
      container: stageContainer,
      width: 1000,
      height: 800,
    });
    layer = new Konva.Layer();
    stage.add(layer);

    // Spy on layer methods to ensure they are called
    vi.spyOn(layer, 'add');
    vi.spyOn(layer, 'draw');

    // 3. Setup mock options with spy functions
    mockOpts = {
      cashBalance: 1234.56,
      totalDaysPlayed: 20,
      onExit: vi.fn(),
      onReturnHome: vi.fn(),
    };

    // 4. Instantiate the class under test
    victoryScreen = new VictoryScreen(stage, layer, mockOpts);
  });

  it('should construct and setup UI correctly', () => {
    // 1. Modal background
    // 2. Title
    // 3. Info text
    // 4. Exit group
    // 5. Return Home group
    expect(layer.add).toHaveBeenCalledTimes(5);
    expect(layer.draw).toHaveBeenCalled();
  });

  it('should display correct stats in the info text', () => {
    // Find the info text node. Based on setupUI, it's the 3rd item added.
    const infoText = (layer.add as Mock).mock.calls[2][0] as Konva.Text;

    expect(infoText).toBeDefined();
    expect(infoText.text()).toContain(`Final Cash: $${mockOpts.cashBalance.toFixed(2)}`);
    expect(infoText.text()).toContain(`Total Days Played: ${mockOpts.totalDaysPlayed}`);
    expect(infoText.text()).toContain('$1234.56'); // Check toFixed(2)
  });

  describe('Exit Button', () => {
    let exitGroup: Konva.Group;
    let exitRect: Konva.Rect;
    let initialFill: string;

    beforeEach(() => {
      // The Exit group is the 4th item added to the layer
      exitGroup = (layer.add as Mock).mock.calls[3][0] as Konva.Group;
      exitRect = exitGroup.findOne('Rect') as Konva.Rect;
      initialFill = exitRect.fill();
    });

    it('should call onExit when clicked', () => {
      // Simulate a click event
      exitGroup.fire('click');
      expect(mockOpts.onExit).toHaveBeenCalledTimes(1);
      expect(mockOpts.onReturnHome).not.toHaveBeenCalled();
    });

    it('should change style on mouseenter', () => {
      // Simulate a mouseenter event
      exitGroup.fire('mouseenter');

      expect(stage.container().style.cursor).toBe('pointer');
      expect(exitRect.fill()).not.toBe(initialFill);
      expect(exitRect.fill()).toBe('#b13535');
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should revert style on mouseleave', () => {
      // First, fire mouseenter to change it
      exitGroup.fire('mouseenter');
      expect(exitRect.fill()).toBe('#b13535');

      // Now, fire mouseleave to revert it
      exitGroup.fire('mouseleave');

      expect(stage.container().style.cursor).toBe('default');
      expect(exitRect.fill()).toBe(initialFill); // Reverts to original color
      expect(layer.draw).toHaveBeenCalled();
    });
  });

  describe('Return Home Button', () => {
    let returnGroup: Konva.Group;
    let returnRect: Konva.Rect;
    let initialFill: string;

    beforeEach(() => {
      // The Return Home group is the 5th (last) item added
      returnGroup = (layer.add as Mock).mock.calls[4][0] as Konva.Group;
      returnRect = returnGroup.findOne('Rect') as Konva.Rect;
      initialFill = returnRect.fill();
    });

    it('should call onReturnHome when clicked', () => {
      // Simulate a click event
      returnGroup.fire('click');
      expect(mockOpts.onReturnHome).toHaveBeenCalledTimes(1);
      expect(mockOpts.onExit).not.toHaveBeenCalled();
    });

    it('should change style on mouseenter', () => {
      // Simulate a mouseenter event
      returnGroup.fire('mouseenter');

      expect(stage.container().style.cursor).toBe('pointer');
      expect(returnRect.fill()).not.toBe(initialFill);
      expect(returnRect.fill()).toBe('#45a049');
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should revert style on mouseleave', () => {
      // First, fire mouseenter to change it
      returnGroup.fire('mouseenter');
      expect(returnRect.fill()).toBe('#45a049');

      // Now, fire mouseleave to revert it
      returnGroup.fire('mouseleave');

      expect(stage.container().style.cursor).toBe('default');
      expect(returnRect.fill()).toBe(initialFill); // Reverts to original color
      expect(layer.draw).toHaveBeenCalled();
    });
  });

  it('should run cleanup function without error', () => {
    // This test ensures the cleanup function is called for coverage,
    // even if it's empty.
    expect(() => victoryScreen.cleanup()).not.toThrow();
  });
});