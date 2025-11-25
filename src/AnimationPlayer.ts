import Konva from 'konva';

// --- HELPER FUNCTION FOR LOADING MULTIPLE IMAGES ---
function loadImages(urls: string[]): Promise<HTMLImageElement[]> {
    const promises = urls.map(url => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(`Failed to load image: ${url} - ${err}`);
            img.src = url;
        });
    });
    return Promise.all(promises);
}

export class AnimationPlayer {
    private layer: Konva.Layer;
    private imagePaths: string[];
    private frameRate: number;
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private loop: boolean;
    private onComplete: (() => void) | null;

    private konvaImage: Konva.Image | null = null;
    private frames: HTMLImageElement[] = [];
    private currentFrameIndex: number = 0;
    private intervalId: number | null = null;
    private isPlaying: boolean = false;
    private isLoaded: boolean = false;

    constructor(
        layer: Konva.Layer,
        imagePaths: string[],
        frameRate: number,
        x: number, y: number,
        width: number, height: number,
        loop: boolean = false,
        onComplete: (() => void) | null = null
    ) {
        this.layer = layer;
        this.imagePaths = imagePaths;
        // Ensure strictly positive frame rate to avoid division by zero
        this.frameRate = frameRate > 0 ? frameRate : 1; 
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.loop = loop;
        this.onComplete = onComplete;
    }

    async load(): Promise<void> {
        if (this.isLoaded) return;
        try {
            this.frames = await loadImages(this.imagePaths);
            if (this.frames.length === 0) {
                throw new Error("No animation frames loaded.");
            }
            this.isLoaded = true;
            console.log(`Animation loaded ${this.imagePaths.length} frames.`);
        } catch (error) {
            console.error("Failed to load animation images:", error);
            throw error;
        }
    }

    start(): void {
        if (!this.isLoaded || this.frames.length === 0 || this.isPlaying) {
            console.warn("Animation not loaded, has no frames, or is already playing.");
            return;
        }

        // Initialize or reset the Konva Image
        if (!this.konvaImage) {
            this.konvaImage = new Konva.Image({
                x: this.x,
                y: this.y,
                image: this.frames[0],
                width: this.width,
                height: this.height,
            });
            this.layer.add(this.konvaImage);
        } else {
            this.konvaImage.image(this.frames[0]);
            this.konvaImage.visible(true);
        }

        this.currentFrameIndex = 0;
        this.layer.batchDraw();
        this.isPlaying = true;

        this.intervalId = window.setInterval(() => {
            if (!this.isPlaying || !this.konvaImage) {
                if (this.intervalId) clearInterval(this.intervalId);
                return;
            }

            this.currentFrameIndex++;

            if (this.currentFrameIndex >= this.frames.length) {
                if (this.loop) {
                    this.currentFrameIndex = 0; // Loop back
                } else {
                    this.stop(); // Stop at the end
                    if (this.onComplete) {
                        this.onComplete();
                    }
                    return;
                }
            }

            // --- FIX FOR TEST: "should handle empty/null frames gracefully" ---
            // Only update the image if the frame exists.
            // Even if the frame is null/undefined, we still batchDraw() to keep loop timing.
            const frame = this.frames[this.currentFrameIndex];
            if (frame) {
                this.konvaImage.image(frame);
            }
            
            this.layer.batchDraw();

        }, 1000 / this.frameRate);
    }

    stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isPlaying = false;
    }

    destroy(): void {
        this.stop();
        if (this.konvaImage) {
            this.konvaImage.destroy();
            this.konvaImage = null;
        }
        this.frames = [];
        this.isLoaded = false;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }
}