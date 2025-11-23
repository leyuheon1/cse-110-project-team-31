// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import Konva from 'konva';
import { LoseScreen } from './LoseScreen';

// Mock options for the LoseScreen
interface MockOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onExit: Mock<[], void>;
  onRetry: Mock<[], void>; // Renamed from onReturnHome
}

describe.skip('LoseScreen', () => {
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let mockOpts: MockOptions;
  let loseScreen: LoseScreen;
  let stageContainer: HTMLDivElement;

  beforeEach(() => {
    // 1. Create a DOM element for Konva to attach to
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

    // Spy on layer methods
    vi.spyOn(layer, 'add');
    vi.spyOn(layer, 'draw');

    // 3. Setup mock options with spy functions
    mockOpts = {
      cashBalance: 1.99, // Use a different value to test
      totalDaysPlayed: 15,
      onExit: vi.fn(),
      onRetry: vi.fn(), // Use onRetry
    };

    // 4. Instantiate the class under test
    loseScreen = new LoseScreen(stage, layer, mockOpts);
  });

  it('should construct and setup UI correctly', () => {
    // 1. Modal
    // 2. Title
    // 3. Info text
    // 4. Exit group
    // 5. Retry group
    expect(layer.add).toHaveBeenCalledTimes(5);
    expect(layer.draw).toHaveBeenCalled();
  });

  it('should display correct stats in the info text', () => {
    // Find the info text node (3rd item added)
    const infoText = (layer.add as Mock).mock.calls[2][0] as Konva.Text;

    expect(infoText).toBeDefined();
    expect(infoText.text()).toContain(`Cash Balance: $${mockOpts.cashBalance.toFixed(2)}`);
    expect(infoText.text()).toContain(`Total Days Played: ${mockOpts.totalDaysPlayed}`);
    expect(infoText.text()).toContain('$1.99'); // Check toFixed(2)
  });

  describe('Exit Button', () => {
    let exitGroup: Konva.Group;
    let exitRect: Konva.Rect;
    let initialFill: string;

    beforeEach(() => {
      // The Exit group is the 4th item added
      exitGroup = (layer.add as Mock).mock.calls[3][0] as Konva.Group;
      exitRect = exitGroup.findOne('Rect') as Konva.Rect;
      initialFill = exitRect.fill();
    });

    it('should call onExit when clicked', () => {
      exitGroup.fire('click');
      expect(mockOpts.onExit).toHaveBeenCalledTimes(1);
      expect(mockOpts.onRetry).not.toHaveBeenCalled();
    });

    it('should change style on mouseenter', () => {
      exitGroup.fire('mouseenter');

      expect(stage.container().style.cursor).toBe('pointer');
      expect(exitRect.fill()).toBe('#b13535'); // Hover color
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should revert style on mouseleave', () => {
      exitGroup.fire('mouseenter'); // Set hover state
      exitGroup.fire('mouseleave'); // Revert

      expect(stage.container().style.cursor).toBe('default');
      expect(exitRect.fill()).toBe(initialFill); // Original color
      expect(layer.draw).toHaveBeenCalled();
    });
  });

  describe('Retry Button', () => {
    let retryGroup: Konva.Group;
    let retryRect: Konva.Rect;
    let initialFill: string;

    beforeEach(() => {
      // The Retry group is the 5th (last) item added
      retryGroup = (layer.add as Mock).mock.calls[4][0] as Konva.Group;
      retryRect = retryGroup.findOne('Rect') as Konva.Rect;
      initialFill = retryRect.fill();
    });

    it('should call onRetry when clicked', () => {
      retryGroup.fire('click');
      expect(mockOpts.onRetry).toHaveBeenCalledTimes(1);
      expect(mockOpts.onExit).not.toHaveBeenCalled();
    });

    it('should change style on mouseenter', () => {
      retryGroup.fire('mouseenter');

      expect(stage.container().style.cursor).toBe('pointer');
      expect(retryRect.fill()).toBe('#45a049'); // Hover color
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should revert style on mouseleave', () => {
      retryGroup.fire('mouseenter'); // Set hover state
      retryGroup.fire('mouseleave'); // Revert

      expect(stage.container().style.cursor).toBe('default');
      expect(retryRect.fill()).toBe(initialFill); // Original color
      expect(layer.draw).toHaveBeenCalled();
    });
  });

  it('should run cleanup function without error', () => {
    // Call the function for 100% line coverage
    expect(() => loseScreen.cleanup()).not.toThrow();
  });
});
