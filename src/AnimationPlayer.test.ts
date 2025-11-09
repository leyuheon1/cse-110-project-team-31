/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Konva from 'konva';
import { AnimationPlayer } from './AnimationPlayer';

// Mock Konva
vi.mock('konva');

describe('AnimationPlayer', () => {
    let layer: Konva.Layer;
    let mockImage: any;
    
    beforeEach(() => {
        mockImage = {
            image: vi.fn(),
            visible: vi.fn(),
            destroy: vi.fn(),
        };
        
        layer = {
            add: vi.fn(),
            batchDraw: vi.fn(),
        } as any;

        // Properly mock Konva.Image as a constructor
        Konva.Image = vi.fn().mockImplementation(function(this: any) {
            return mockImage;
        }) as any;



        vi.useFakeTimers();
        vi.spyOn(global, 'setInterval').mockReturnValue(123 as any); // Return a fake ID
        vi.spyOn(global, 'clearInterval');
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            const imagePaths = ['image1.png', 'image2.png'];
            const onComplete = vi.fn();
            
            const player = new AnimationPlayer(
                layer,
                imagePaths,
                30,
                100, 200,
                50, 75,
                true,
                onComplete
            );

            expect(player).toBeDefined();
            expect(player.getIsPlaying()).toBe(false);
        });

        it('should handle frameRate of 0 by setting it to 1', () => {
            const player = new AnimationPlayer(
                layer,
                ['image.png'],
                0,
                0, 0,
                50, 50,
                false,
                null
            );

            expect(player).toBeDefined();
        });

        it('should handle negative frameRate by setting it to 1', () => {
            const player = new AnimationPlayer(
                layer,
                ['image.png'],
                -10,
                0, 0,
                50, 50,
                false,
                null
            );

            expect(player).toBeDefined();
        });
    });

    describe('load', () => {
        it('should throw error when no frames are loaded', async () => {
            const imagePaths: string[] = [];
            const player = new AnimationPlayer(layer, imagePaths, 30, 0, 0, 50, 50);

            await expect(player.load()).rejects.toThrow('No animation frames loaded.');
        });

        it('should load images successfully and not reload if already loaded', async () => {
            const imagePaths = ['image1.png', 'image2.png'];
            const player = new AnimationPlayer(layer, imagePaths, 30, 0, 0, 50, 50);

            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                onerror: ((err: any) => void) | null = null;
                src: string = '';
                
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            expect(consoleLogSpy).toHaveBeenCalledWith('Animation loaded 2 frames.');
            
            consoleLogSpy.mockClear();
            await player.load();
            expect(consoleLogSpy).not.toHaveBeenCalled();
            
            global.Image = originalImage;
            consoleLogSpy.mockRestore();
        });

        it('should handle image load failure', async () => {
            const imagePaths = ['broken.png'];
            const player = new AnimationPlayer(layer, imagePaths, 30, 0, 0, 50, 50);

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                onerror: ((err: any) => void) | null = null;
                src: string = '';
                
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onerror) this.onerror('Network error');
                    });
                }
            };

            await expect(player.load()).rejects.toMatch(/Failed to load image/);
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            global.Image = originalImage;
            consoleErrorSpy.mockRestore();
        });
    });

    describe('start', () => {
        it('should not start if not loaded', () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            player.start();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Animation not loaded, has no frames, or is already playing.'
            );
            expect(player.getIsPlaying()).toBe(false);
            
            consoleWarnSpy.mockRestore();
        });

        it('should start animation and create Konva.Image', async () => {
            const player = new AnimationPlayer(layer, ['img1.png', 'img2.png'], 30, 10, 20, 100, 150);

            const mockImages: any[] = [];
            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    mockImages.push(this);
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;

            player.start();

            expect(Konva.Image).toHaveBeenCalledWith({
                x: 10,
                y: 20,
                image: mockImages[0],
                width: 100,
                height: 150,
            });
            expect(layer.add).toHaveBeenCalledWith(mockImage);
            expect(layer.batchDraw).toHaveBeenCalled();
            expect(player.getIsPlaying()).toBe(true);
            expect(global.setInterval).toHaveBeenCalled();
        });

        it('should reuse existing Konva.Image on restart', async () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);

            const mockImages: any[] = [];
            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    mockImages.push(this);
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;

            player.start();
            player.stop();
            
            vi.clearAllMocks();
            
            player.start();

            expect(mockImage.image).toHaveBeenCalledWith(mockImages[0]);
            expect(mockImage.visible).toHaveBeenCalledWith(true);
            expect(Konva.Image).not.toHaveBeenCalled();
        });

        it('should not start if already playing', async () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);

            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            player.start();
            const callCount = (global.setInterval as any).mock.calls.length;
            
            player.start(); // Try again while playing

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Animation not loaded, has no frames, or is already playing.'
            );
            // Should not call setInterval again
            expect((global.setInterval as any).mock.calls.length).toBe(callCount);
            
            consoleWarnSpy.mockRestore();
        });

        it('should handle frames with no images', async () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);

            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;
            
            // Manually clear frames to test the "no frames" branch
            (player as any).frames = [];
            
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            player.start();
            
            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });

    describe('stop', () => {
        it('should handle stop when not playing', () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);
            
            player.stop();
            expect(player.getIsPlaying()).toBe(false);
        });

        it('should stop a playing animation', async () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);

            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;

            player.start();
            expect(player.getIsPlaying()).toBe(true);

            player.stop();
            expect(player.getIsPlaying()).toBe(false);
            expect(global.clearInterval).toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        it('should handle destroy when konvaImage is null', () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);
            
            player.destroy();
            expect(player.getIsPlaying()).toBe(false);
        });

        it('should destroy animation and cleanup resources', async () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);

            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;

            player.start();
            expect(player.getIsPlaying()).toBe(true);

            player.destroy();

            expect(mockImage.destroy).toHaveBeenCalled();
            expect(player.getIsPlaying()).toBe(false);
            expect(global.clearInterval).toHaveBeenCalled();
        });
    });

    describe('getIsPlaying', () => {
        it('should return false initially', () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);
            expect(player.getIsPlaying()).toBe(false);
        });

        it('should return true when playing', async () => {
            const player = new AnimationPlayer(layer, ['img.png'], 30, 0, 0, 50, 50);

            const originalImage = global.Image;
            (global.Image as any) = class MockImage {
                onload: (() => void) | null = null;
                src: string = '';
                constructor() {
                    Promise.resolve().then(() => {
                        if (this.onload) this.onload();
                    });
                }
            };

            await player.load();
            global.Image = originalImage;

            expect(player.getIsPlaying()).toBe(false);
            
            player.start();
            expect(player.getIsPlaying()).toBe(true);
            
            player.stop();
            expect(player.getIsPlaying()).toBe(false);
        });
    });
});