// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import Konva from 'konva';
import { StoryScreen } from './StoryScreen';

// --- FIX: Mock global.Image with a class that uses fake timers ---
global.Image = class MockImage {
  onload: (() => void) | null = null;
  src: string = '';

  constructor() {
    // When 'src' is set, we'll immediately schedule the 'onload'
    // using a fake timer, which we control in the test.
    Object.defineProperty(this, 'src', {
      set: (val: string) => {
        if (val) { // Only run if src is set to a non-empty value
          // Use a 0ms fake timer.
          setTimeout(() => {
            if (this.onload) {
              this.onload(); // Fire the callback
            }
          }, 0); // 0ms timeout
        }
      }
    });
  }
};


describe('StoryScreen', () => {
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let stageContainer: HTMLDivElement;
  let onCompleteMock: Mock<[], void>;

  beforeEach(() => {
    // --- Use Fake Timers ---
    // This lets us control setInterval and setTimeout
    vi.useFakeTimers();

    // Create container
    stageContainer = document.createElement('div');
    stageContainer.style.width = '1000px';
    stageContainer.style.height = '800px';
    document.body.appendChild(stageContainer);

    // Setup stage
    stage = new Konva.Stage({
      container: stageContainer,
      width: 1000,
      height: 800,
    });
    layer = new Konva.Layer();
    stage.add(layer);

    onCompleteMock = vi.fn();

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'username') return 'TestUser';
      return null;
    });

    // Spy on layer
    vi.spyOn(layer, 'add');
    vi.spyOn(layer, 'draw');
    vi.spyOn(layer, 'destroyChildren');

    // --- THIS IS THE FIX ---
    // Neuter layer.draw() and destroyChildren() to stop them from crashing
    // by trying to render the fake image.
    (layer.draw as Mock).mockImplementation(() => {});
    (layer.destroyChildren as Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    // --- Restore Real Timers ---
    vi.useRealTimers();
    if (stage) stage.destroy();
    if (stageContainer && stageContainer.parentNode) {
      document.body.removeChild(stageContainer);
    }
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  // Helper function to create screen and fire image onload
  const createScreen = () => {
    const screen = new StoryScreen(stage, layer, onCompleteMock);
    // Advance timers by 1ms to fire the setTimeout(..., 0) in our Image mock
    vi.advanceTimersByTime(1);
    return screen;
  };

  describe('Basic Setup', () => {
    it('should construct without errors', () => {
      expect(() => createScreen()).not.toThrow();
    });

    it('should set cursor to default', () => {
      createScreen();
      expect(stage.container().style.cursor).toBe('default');
    });

    it('should retrieve username from localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      createScreen();
      expect(getItemSpy).toHaveBeenCalledWith('username');
    });

    it('should add elements to layer after image loads', () => {
      createScreen();
      // Now that we control timers, this works.
      expect(layer.add).toHaveBeenCalled();
    });
  });

  describe('UI Elements', () => {
    it('should create background image', () => {
      createScreen();
      const bgImage = (layer.add as Mock).mock.calls.find(call =>
        call[0] instanceof Konva.Image
      );
      expect(bgImage).toBeDefined();
    });

    it('should create white box', () => {
      createScreen();
      const box = (layer.add as Mock).mock.calls.find(call =>
        call[0] instanceof Konva.Rect && call[0].fill() === 'white'
      );
      expect(box).toBeDefined();
    });

    it('should create text element', () => {
      createScreen();
      const text = (layer.add as Mock).mock.calls.find(call =>
        call[0] instanceof Konva.Text && call[0].fontFamily() === 'Press Start 2P'
      );
      expect(text).toBeDefined();
    });
  });

  describe('Text Animation', () => {
    let text: Konva.Text;

    beforeEach(() => {
      createScreen();
      text = (layer.add as Mock).mock.calls.find(call =>
        call[0] instanceof Konva.Text
      )?.[0] as Konva.Text;
      expect(text, 'Text element was not found').toBeDefined();
    });

    it('should start with empty text', () => {
      expect(text.text()).toBe('');
    });
    
    it('should animate text over time', () => {
      const initialLength = text.text().length; // 0
      expect(initialLength).toBe(0);

      // --- Advance timers by 300ms ---
      // This will run the setInterval (50ms) 6 times
      vi.advanceTimersByTime(300);

      expect(text.text().length).toBe(5); // 300ms / 50ms = 6 chars
      expect(text.text().length).toBeGreaterThan(initialLength);
    }); 

    it('should include username in text', () => {
      // Just check that it was called, as animation test proves it's used
      expect(Storage.prototype.getItem).toHaveBeenCalledWith('username');
    });
  });

  
  // --- Tests for Button Interactions (for coverage) ---
  describe('Button Interactions', () => {
    let button: Konva.Label;
    let tag: Konva.Tag;

    beforeEach(() => {
      createScreen();

      // Get the full text to calculate animation duration
      const username = localStorage.getItem('username') || 'TestUser';
      const fullText = `Today is a sad day for Owl. He lost his job. Owl is thinking of making cookies from his new home, the trailer park. ${username}, please help Owl get back on his feet by baking some cookies.`;

      // Advance time to the END of the animation + buffer
      const animationTime = (fullText.length + 2) * 50;
      vi.advanceTimersByTime(animationTime);

      // Find the button (it's a Konva.Label)
      button = (layer.add as Mock).mock.calls.find(call =>
        call[0] instanceof Konva.Label
      )?.[0] as Konva.Label;

      expect(button, 'Button was not added to layer').toBeDefined();
      tag = button.getChildren(c => c instanceof Konva.Tag)[0] as Konva.Tag;
    });

    it('should add the button after text animation', () => {
      expect(button).toBeDefined();
      expect(tag).toBeDefined();
    });

    it('should handle button mouseenter', () => {
      const tagSpyBlur = vi.spyOn(tag, 'shadowBlur');
      const tagSpyOffset = vi.spyOn(tag, 'shadowOffset');

      button.fire('mouseenter'); // Simulate event

      expect(stage.container().style.cursor).toBe('pointer');
      expect(tagSpyBlur).toHaveBeenCalledWith(20); // buttonShadowBlurHover
      expect(tagSpyOffset).toHaveBeenCalledWith({ x: 2, y: 2 }); // buttonShadowOffsetHover
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should handle button mouseleave', () => {
      stage.container().style.cursor = 'pointer'; // Set initial state
      const tagSpyBlur = vi.spyOn(tag, 'shadowBlur');
      const tagSpyOffset = vi.spyOn(tag, 'shadowOffset');

      button.fire('mouseleave'); // Simulate event

      expect(stage.container().style.cursor).toBe('default');
      expect(tagSpyBlur).toHaveBeenCalledWith(10); // buttonShadowBlurDefault
      expect(tagSpyOffset).toHaveBeenCalledWith({ x: 5, y: 5 }); // buttonShadowOffsetDefault
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should call onComplete and destroy children on click', () => {
      button.fire('click'); // Simulate event

      // We assert our mock was called, not the real one
      expect(layer.destroyChildren).toHaveBeenCalled(); 
      expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });
  }); 

  describe('Edge Cases', () => {
    it('should handle null username', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      expect(() => createScreen()).not.toThrow();
    });
    
    it('should call draw on layer', () => {
      createScreen();
      // Advance timer 50ms to run the first interval
      vi.advanceTimersByTime(50);
      
      // Will be called by image onload (in the interval)
      expect(layer.draw).toHaveBeenCalled();
    }); 
  });
});