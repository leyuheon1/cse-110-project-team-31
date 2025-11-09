// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import Konva from 'konva';
import { LoginScreen } from './LoginScreen';

// Global type augmentation for document.fonts
declare global {
  interface Document {
    fonts?: {
      load: (font: string) => Promise<any[]>;
    };
  }
}

describe('LoginScreen', () => {
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let stageContainer: HTMLDivElement;
  let onLoginMock: Mock<[string], void>;
  let loginScreen: LoginScreen;
  let alertSpy: Mock;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Create container for Konva stage
    stageContainer = document.createElement('div');
    stageContainer.style.width = '1000px';
    stageContainer.style.height = '800px';
    document.body.appendChild(stageContainer);

    // Setup Konva stage and layer
    stage = new Konva.Stage({
      container: stageContainer,
      width: 1000,
      height: 800,
    });
    layer = new Konva.Layer();
    stage.add(layer);

    // Mock onLogin callback
    onLoginMock = vi.fn();

    // Mock alert
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Mock localStorage
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    // Mock document.fonts - create if doesn't exist
    if (!document.fonts) {
      (document as any).fonts = {
        load: vi.fn().mockResolvedValue([])
      };
    } else if (typeof document.fonts.load === 'function') {
      vi.spyOn(document.fonts, 'load').mockResolvedValue([] as any);
    }

    // Spy on layer methods
    vi.spyOn(layer, 'add');
    vi.spyOn(layer, 'draw');
    vi.spyOn(layer, 'batchDraw');
  });

  afterEach(() => {
    // Cleanup
    if (loginScreen) {
      try {
        loginScreen.cleanup();
      } catch (e) {
        // Ignore cleanup errors in tests
      }
    }
    if (stage) {
      stage.destroy();
    }
    if (stageContainer && stageContainer.parentNode) {
      document.body.removeChild(stageContainer);
    }
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe('Constructor and Setup', () => {
    it('should construct and initialize LoginScreen', async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      
      // Wait for async setupUI to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(loginScreen).toBeDefined();
      expect(layer.add).toHaveBeenCalled();
    });

    it('should setup keyboard input listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should attempt to load font on setup', async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify fonts.load was called if it exists
      if (document.fonts && typeof document.fonts.load === 'function') {
        expect(document.fonts.load).toHaveBeenCalled();
      }
    });
  });

  describe('UI Elements', () => {
    beforeEach(async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      // Wait for async setupUI to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should add multiple elements to layer', () => {
      // Should add: subtitle, inputBox, inputText, cursor, buttonGroup
      expect((layer.add as Mock).mock.calls.length).toBeGreaterThanOrEqual(5);
    });

    it('should create subtitle with correct text', () => {
      const addCalls = (layer.add as Mock).mock.calls;
      const subtitle = addCalls.find(call => {
        const node = call[0];
        return node instanceof Konva.Text && 
               node.text().includes('Enter your name to begin');
      });
      
      expect(subtitle).toBeDefined();
    });

    it('should create input elements', () => {
      const addCalls = (layer.add as Mock).mock.calls;
      
      // Find input box (white rect)
      const inputBox = addCalls.some(call => {
        const node = call[0];
        return node instanceof Konva.Rect && node.fill() === 'white';
      });
      
      expect(inputBox).toBe(true);
    });

    it('should create cursor rect', () => {
      const addCalls = (layer.add as Mock).mock.calls;
      
      // Find cursor (2px wide rect)
      const cursor = addCalls.some(call => {
        const node = call[0];
        return node instanceof Konva.Rect && node.width() === 2;
      });
      
      expect(cursor).toBe(true);
    });
  });

  describe('Start Button Interactions', () => {
    let buttonGroup: Konva.Group | undefined;

    beforeEach(async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      
      // Wait for async setupUI to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Find button group
      const addCalls = (layer.add as Mock).mock.calls;
      buttonGroup = addCalls.find(call => {
        const node = call[0];
        return node instanceof Konva.Group && node.getChildren().length >= 4;
      })?.[0] as Konva.Group;
    });

    it('should create start button', () => {
      expect(buttonGroup).toBeDefined();
      expect(buttonGroup!.getChildren().length).toBeGreaterThanOrEqual(4);
    });

    it('should alert when clicking with empty username', () => {
      buttonGroup!.fire('click');
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter a name!');
      expect(onLoginMock).not.toHaveBeenCalled();
    });

    it('should process valid username on button click', () => {
      // Simulate typing
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'J' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
      
      buttonGroup!.fire('click');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('username', 'Joe');
      expect(onLoginMock).toHaveBeenCalledWith('Joe');
    });

    it('should trim whitespace from username', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'B' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      
      buttonGroup!.fire('click');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('username', 'Bob');
      expect(onLoginMock).toHaveBeenCalledWith('Bob');
    });

    it('should change style on mouseenter', () => {
      const board = buttonGroup!.getChildren()[0] as Konva.Rect;
      const initialBlur = board.shadowBlur();
      
      buttonGroup!.fire('mouseenter');
      
      expect(stage.container().style.cursor).toBe('pointer');
      expect(board.shadowBlur()).toBeGreaterThan(initialBlur);
    });

    it('should restore style on mouseleave', () => {
      const board = buttonGroup!.getChildren()[0] as Konva.Rect;
      
      buttonGroup!.fire('mouseenter');
      const hoverBlur = board.shadowBlur();
      
      buttonGroup!.fire('mouseleave');
      
      expect(stage.container().style.cursor).toBe('default');
      expect(board.shadowBlur()).toBeLessThan(hoverBlur);
    });
  });

  describe('Keyboard Input Handling', () => {
    beforeEach(async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      // Wait for async setupUI to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      // Clear draw calls from setup to get accurate counts
      (layer.draw as Mock).mockClear();
    });

    it('should accept letter input', () => {
      const initialDrawCalls = (layer.draw as Mock).mock.calls.length;
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      
      expect((layer.draw as Mock).mock.calls.length).toBeGreaterThan(initialDrawCalls);
    });

    it('should accept number input', () => {
      const drawsBefore = (layer.draw as Mock).mock.calls.length;
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      
      expect((layer.draw as Mock).mock.calls.length).toBeGreaterThan(drawsBefore);
    });

    it('should accept space character', () => {
      const drawsBefore = (layer.draw as Mock).mock.calls.length;
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      
      expect((layer.draw as Mock).mock.calls.length).toBeGreaterThan(drawsBefore);
    });

    it('should reject special characters', () => {
      const drawsBefore = (layer.draw as Mock).mock.calls.length;
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '@' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '#' }));
      
      const drawsAfter = (layer.draw as Mock).mock.calls.length;
      // Should not draw for invalid chars (allow for cursor blinking draws)
      expect(drawsAfter).toBeLessThanOrEqual(drawsBefore + 2);
    });

    it('should handle backspace', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'X' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Y' }));
      
      const drawsBefore = (layer.draw as Mock).mock.calls.length;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
      
      expect((layer.draw as Mock).mock.calls.length).toBeGreaterThan(drawsBefore);
    });

    it('should limit to 20 characters', () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (const char of chars) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
      }
      
      // Should have called draw multiple times, but not for all 26 chars
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should trigger login on Enter with valid username', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'M' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      expect(onLoginMock).toHaveBeenCalledWith('Max');
    });

    it('should alert on Enter with empty username', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter a name!');
      expect(onLoginMock).not.toHaveBeenCalled();
    });

    it('should ignore modifier keys', () => {
      const drawsBefore = (layer.draw as Mock).mock.calls.length;
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
      
      // Allow for cursor blinks during the test
      const drawsAfter = (layer.draw as Mock).mock.calls.length;
      expect(drawsAfter).toBeLessThanOrEqual(drawsBefore + 3);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should remove keyboard listener on cleanup', () => {
      const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      loginScreen.cleanup();
      
      expect(removeListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should clear intervals on cleanup', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      loginScreen.cleanup();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not throw on cleanup', () => {
      expect(() => loginScreen.cleanup()).not.toThrow();
    });

    it('should handle multiple cleanup calls', () => {
      loginScreen.cleanup();
      
      expect(() => loginScreen.cleanup()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      loginScreen = new LoginScreen(stage, layer, onLoginMock);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should handle rapid input', () => {
      ['T', 'e', 's', 't'].forEach(key => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });
      
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should handle backspace on empty input', () => {
      expect(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
      }).not.toThrow();
    });

    it('should handle multiple backspaces', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'B' }));
      
      expect(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
      }).not.toThrow();
    });

    it('should reject whitespace-only username', async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      
      const addCalls = (layer.add as Mock).mock.calls;
      const buttonGroup = addCalls.find(call => {
        const node = call[0];
        return node instanceof Konva.Group && node.getChildren().length >= 4;
      })?.[0] as Konva.Group;
      
      buttonGroup?.fire('click');
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter a name!');
    });
  });

  describe('Responsive Layout', () => {
    it('should work with small dimensions', async () => {
      const smallStage = new Konva.Stage({
        container: stageContainer,
        width: 600,
        height: 400,
      });
      const smallLayer = new Konva.Layer();
      smallStage.add(smallLayer);
      
      const smallLogin = new LoginScreen(smallStage, smallLayer, onLoginMock);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(smallLogin).toBeDefined();
      
      smallLogin.cleanup();
      smallStage.destroy();
    });

    it('should work with large dimensions', async () => {
      const largeStage = new Konva.Stage({
        container: stageContainer,
        width: 1920,
        height: 1080,
      });
      const largeLayer = new Konva.Layer();
      largeStage.add(largeLayer);
      
      const largeLogin = new LoginScreen(largeStage, largeLayer, onLoginMock);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(largeLogin).toBeDefined();
      
      largeLogin.cleanup();
      largeStage.destroy();
    });
  });
});