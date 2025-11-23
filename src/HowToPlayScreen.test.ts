// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import Konva from 'konva';
import { HowToPlayScreen } from './HowToPlayScreen';

// Mock fetch globally
global.fetch = vi.fn();

describe('HowToPlayScreen', () => {
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let stageContainer: HTMLDivElement;
  let onStartGameMock: Mock<[], void>;
  let howToPlayScreen: HowToPlayScreen;

  beforeEach(() => {
    // Create a DOM element for Konva to attach to
    stageContainer = document.createElement('div');
    document.body.appendChild(stageContainer);

    // Setup mock stage and layer
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
    vi.spyOn(layer, 'batchDraw');

    // Setup mock callback
    onStartGameMock = vi.fn();

    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as Location;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.removeChild(stageContainer);
  });

  describe('Constructor and UI Setup', () => {
    it('should construct and setup UI correctly with successful fetch', async () => {
      const mockInstructions = 'Test instructions\nLine 2\nLine 3';
      
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockInstructions,
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      // Wait for async operations to complete
      await vi.waitFor(() => {
        // Should add: modalGroup, title, instructions, buttonGroup, exitButton group
        expect(layer.add).toHaveBeenCalled();
      });

      expect(layer.draw).toHaveBeenCalled();
    });

    it('should create modal with paper, highlight, and crease', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });

      // Find the modal group (first item added)
      const modalGroup = (layer.add as Mock).mock.calls[0][0] as Konva.Group;
      expect(modalGroup).toBeInstanceOf(Konva.Group);
      
      // Modal group should have paper, highlight, and crease
      expect(modalGroup.getChildren().length).toBe(3);
    });

    it('should create title with correct text and styling', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });

      // Find the title (second item added)
      const title = (layer.add as Mock).mock.calls[1][0] as Konva.Text;
      expect(title.text()).toBe('HOW TO PLAY');
      expect(title.fontFamily()).toBe('Press Start 2P');
      expect(title.fontStyle()).toBe('bold');
      expect(title.fill()).toBe('black');
      expect(title.align()).toBe('center');
    });
  });

  describe('loadInstructions', () => {
    it('should load and display instructions from file successfully', async () => {
      const mockInstructions = 'Step 1: Do this\nStep 2: Do that\nStep 3: Finish';
      
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockInstructions,
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        const calls = (layer.add as Mock).mock.calls;
        const instructionsText = calls.find(call => {
          const node = call[0];
          return node instanceof Konva.Text && node.text() === mockInstructions;
        });
        expect(instructionsText).toBeDefined();
      });

      expect(global.fetch).toHaveBeenCalledWith('/howtoplay.txt');
    });

    it('should display fallback text when fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        const calls = (layer.add as Mock).mock.calls;
        const fallbackText = calls.find(call => {
          const node = call[0];
          return node instanceof Konva.Text && 
                 node.text().includes('Instructions could not be loaded');
        });
        expect(fallbackText).toBeDefined();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Could not load instructions:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should create instructions text with correct styling', async () => {
      const mockInstructions = 'Test instructions';
      
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockInstructions,
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        const calls = (layer.add as Mock).mock.calls;
        const instructionsNode = calls.find(call => {
          const node = call[0];
          return node instanceof Konva.Text && node.text() === mockInstructions;
        })?.[0] as Konva.Text;

        if (instructionsNode) {
          expect(instructionsNode.fontFamily()).toBe('VT323, monospace');
          expect(instructionsNode.fill()).toBe('black');
          expect(instructionsNode.lineHeight()).toBe(1.5);
          expect(instructionsNode.wrap()).toBe('word');
          expect(instructionsNode.align()).toBe('left');
        }
      });
    });

    it('should create fallback text with correct styling on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as Mock).mockRejectedValueOnce(new Error('Fetch failed'));

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        const calls = (layer.add as Mock).mock.calls;
        const fallbackNode = calls.find(call => {
          const node = call[0];
          return node instanceof Konva.Text && 
                 node.text().includes('Instructions could not be loaded');
        })?.[0] as Konva.Text;

        if (fallbackNode) {
          expect(fallbackNode.fill()).toBe('red');
          expect(fallbackNode.lineHeight()).toBe(1.8);
          expect(fallbackNode.align()).toBe('center');
        }
      });
    });
  });

  describe('Start Button', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });
    });

    it('should create start button with correct text', () => {
      const calls = (layer.add as Mock).mock.calls;
      const buttonGroup = calls.find(call => {
        const node = call[0];
        if (node instanceof Konva.Group) {
          const text = node.findOne('Text');
          return text && (text as Konva.Text).text() === 'START GAME';
        }
        return false;
      })?.[0] as Konva.Group;

      expect(buttonGroup).toBeDefined();
      const buttonText = buttonGroup.findOne('Text') as Konva.Text;
      expect(buttonText.text()).toBe('START GAME');
      expect(buttonText.fill()).toBe('white');
      expect(buttonText.fontStyle()).toBe('bold');
      expect(buttonText.align()).toBe('center');
      expect(buttonText.verticalAlign()).toBe('middle');
    });

    it('should call onStartGame when clicked', () => {
      const calls = (layer.add as Mock).mock.calls;
      const buttonGroup = calls.find(call => {
        const node = call[0];
        if (node instanceof Konva.Group) {
          const text = node.findOne('Text');
          return text && (text as Konva.Text).text() === 'START GAME';
        }
        return false;
      })?.[0] as Konva.Group;

      buttonGroup.fire('click');
      expect(onStartGameMock).toHaveBeenCalledTimes(1);
    });

    it('should change cursor and fill on mouseenter', () => {
      const calls = (layer.add as Mock).mock.calls;
      const buttonGroup = calls.find(call => {
        const node = call[0];
        if (node instanceof Konva.Group) {
          const text = node.findOne('Text');
          return text && (text as Konva.Text).text() === 'START GAME';
        }
        return false;
      })?.[0] as Konva.Group;

      const rect = buttonGroup.findOne('Rect') as Konva.Rect;
      const initialFill = rect.fill();

      buttonGroup.fire('mouseenter');

      expect(stage.container().style.cursor).toBe('pointer');
      expect(rect.fill()).toBe('#45a049');
      expect(rect.fill()).not.toBe(initialFill);
      expect(layer.draw).toHaveBeenCalled();
    });

    it('should revert cursor and fill on mouseleave', () => {
      const calls = (layer.add as Mock).mock.calls;
      const buttonGroup = calls.find(call => {
        const node = call[0];
        if (node instanceof Konva.Group) {
          const text = node.findOne('Text');
          return text && (text as Konva.Text).text() === 'START GAME';
        }
        return false;
      })?.[0] as Konva.Group;

      const rect = buttonGroup.findOne('Rect') as Konva.Rect;

      buttonGroup.fire('mouseenter');
      buttonGroup.fire('mouseleave');

      expect(stage.container().style.cursor).toBe('default');
      expect(rect.fill()).toBe('#4CAF50');
      expect(layer.draw).toHaveBeenCalled();
    });
  });

  describe('Exit Button', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });
    });

    it('should create exit button', () => {
      const calls = (layer.add as Mock).mock.calls;
      const exitGroup = calls.find(call => {
        const node = call[0];
        if (node instanceof Konva.Group) {
          const text = node.findOne('Text');
          return text && (text as Konva.Text).text() === 'EXIT';
        }
        return false;
      })?.[0] as Konva.Group;

      expect(exitGroup).toBeDefined();
    });

    it('should navigate to login page and cleanup when exit button is clicked', () => {
      const cleanupSpy = vi.spyOn(howToPlayScreen, 'cleanup');
      
      const calls = (layer.add as Mock).mock.calls;
      const exitGroup = calls.find(call => {
        const node = call[0];
        if (node instanceof Konva.Group) {
          const text = node.findOne('Text');
          return text && (text as Konva.Text).text() === 'EXIT';
        }
        return false;
      })?.[0] as Konva.Group;

      const exitRect = exitGroup.findOne('Rect') as Konva.Rect;
      exitRect.fire('click');

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe('/login.html');
    });
  });

  describe('Responsive Design', () => {
    it('should handle small stage dimensions', async () => {
      stage.width(400);
      stage.height(300);

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });

      // Verify modal dimensions are relative to stage
      const modalGroup = (layer.add as Mock).mock.calls[0][0] as Konva.Group;
      expect(modalGroup).toBeDefined();
    });

    it('should handle large stage dimensions', async () => {
      stage.width(2000);
      stage.height(1500);

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });

      // Verify elements are properly sized
      const title = (layer.add as Mock).mock.calls[1][0] as Konva.Text;
      expect(title.fontSize()).toBeLessThanOrEqual(40); // Should cap at 40
    });
  });

  describe('cleanup', () => {
    it('should run cleanup function without error', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Instructions',
      } as Response);

      howToPlayScreen = new HowToPlayScreen(stage, layer, onStartGameMock);

      await vi.waitFor(() => {
        expect(layer.add).toHaveBeenCalled();
      });

      expect(() => howToPlayScreen.cleanup()).not.toThrow();
    });
  });
});
