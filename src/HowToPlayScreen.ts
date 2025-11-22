import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';

export class HowToPlayScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onStartGame: () => void;
    private animationFrameId: number | null = null;
    private currentRenderId: number = 0; // Tracks the current valid render pass

    constructor(stage: Konva.Stage, layer: Konva.Layer, onStartGame: () => void) {
        this.stage = stage;
        this.layer = layer;
        this.onStartGame = onStartGame;
        this.setupUI();
        
        // Add the listener correctly
        window.addEventListener('resize', this.handleResize);
    }

    // FIX 1: Defined as an arrow function property so 'this' is preserved 
    // and we can remove it correctly in cleanup()
    private handleResize = (): void => {
        // Cancel any pending frame to prevent stacking
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // FIX 2: Use requestAnimationFrame instead of setTimeout.
        // This updates INSTANTLY (60fps) so the background never disappears.
        this.animationFrameId = requestAnimationFrame(() => {
            this.layer.destroyChildren();
            this.setupUI();
        });
    };

    private setupUI(): void {
        // Increment render ID. Old async text loads will see this changed and stop.
        this.currentRenderId++;
        const myRenderId = this.currentRenderId;

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Dimensions
        const modalX = stageWidth * 0.1;
        const modalY = stageHeight * 0.125;
        const modalW = stageWidth * 0.8;
        const modalH = stageHeight * 0.75; 

        const modalGroup = new Konva.Group();

        // Paper Background
        const paper = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalW,
            height: modalH,
            cornerRadius: 26,
            fill: '#F5F1E8',
            stroke: '#E8E1C9',
            strokeWidth: 3,
            shadowColor: 'rgba(0,0,0,0.35)',
            shadowBlur: 20,
            shadowOffset: { x: 0, y: 12 },
            shadowOpacity: 0.35
        });

        // Gloss/Highlight
        const highlight = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalW,
            height: modalH,
            cornerRadius: 26,
            listening: false,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: modalH },
            fillLinearGradientColorStops: [0, 'rgba(255,255,255,0.55)', 1, 'rgba(255,255,255,0)'],
            opacity: 0.6
        });

        modalGroup.add(paper, highlight);
        this.layer.add(modalGroup);

        // Title
        const title = new Konva.Text({
            x: modalX,
            y: modalY + 30,
            width: modalW,
            text: 'HOW TO PLAY',
            fontSize: Math.min(stageWidth * 0.06, 36),
            fontStyle: 'bold',
            fontFamily: 'Press Start 2P',
            fill: 'black',
            align: 'center'
        });
        this.layer.add(title);

        // Load instructions (Async)
        this.loadInstructions(stageWidth, stageHeight, modalY, modalH, myRenderId);

        // Start button
        this.createStartButton(stageWidth, stageHeight, modalY, modalH);

        // Exit button
        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.html';
        });

        this.layer.draw();
    }

    private async loadInstructions(
        stageWidth: number, 
        stageHeight: number, 
        modalY: number, 
        modalH: number, 
        renderId: number
    ): Promise<void> {
        try {
            const response = await fetch('/howtoplay.txt');
            let text = await response.text();

            // FIX 3: renderId Check
            // If the user resized the window while we were fetching, this ID will not match.
            // We stop immediately to prevent adding text to a destroyed/new layer.
            if (this.currentRenderId !== renderId) {
                return;
            }

            text = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n');
            text = text.replace(/Tips for Success:/gi, 'TIPS FOR SUCCESS');

            const textBoxX = stageWidth * 0.15;
            const textBoxY = modalY + (modalH * 0.18); 
            const textBoxWidth = stageWidth * 0.7;
            
            const lineHeight = 1.4; 
            const fontSize = Math.min(stageWidth * 0.022, 20);

            const hasTips = text.includes('TIPS FOR SUCCESS');
            
            if (hasTips) {
                const parts = text.split('TIPS FOR SUCCESS');
                
                const mainInstructions = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY,
                    width: textBoxWidth,
                    text: parts[0],
                    fontSize: fontSize,
                    fontFamily: 'Nunito, sans-serif',
                    fill: '#2C3E50',
                    lineHeight: lineHeight,
                    wrap: 'word',
                    align: 'center',
                    padding: 5
                });

                const mainHeight = mainInstructions.height();

                const tipsHeader = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY + mainHeight + 5,
                    width: textBoxWidth,
                    text: 'TIPS FOR SUCCESS',
                    fontSize: fontSize + 2,
                    fontFamily: 'Press Start 2P',
                    fontStyle: 'bold',
                    fill: '#FFAA00',
                    align: 'center',
                    shadowColor: '#FFD700',
                    shadowBlur: 2,
                    shadowOpacity: 0.5
                });

                const tipsContent = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY + mainHeight + tipsHeader.height() + 5,
                    width: textBoxWidth,
                    text: parts[1],
                    fontSize: fontSize,
                    fontFamily: 'Nunito, sans-serif',
                    fill: '#2C3E50',
                    lineHeight: lineHeight,
                    wrap: 'word',
                    align: 'center',
                    padding: 5
                });

                this.layer.add(mainInstructions);
                this.layer.add(tipsHeader);
                this.layer.add(tipsContent);
            } else {
                const instructions = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY,
                    width: textBoxWidth,
                    text,
                    fontSize: fontSize,
                    fontFamily: 'Nunito, sans-serif',
                    fill: '#2C3E50',
                    lineHeight: lineHeight,
                    wrap: 'word',
                    align: 'center',
                    padding: 5
                });
                this.layer.add(instructions);
            }

            // Draw the layer again to show the text
            this.layer.draw();

        } catch (error) {
            if (this.currentRenderId === renderId) {
                console.error('Could not load instructions:', error);
            }
        }
    }

    private createStartButton(stageWidth: number, stageHeight: number, modalY: number, modalH: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);

        const buttonY = (modalY + modalH) - buttonHeight - 30;

        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2,
            y: buttonY
        });

        const rect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#4CAF50',
            cornerRadius: 10
        });

        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'START GAME',
            fontSize: Math.min(stageWidth * 0.022, 28),
            fontFamily: 'Press Start 2P',
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold'
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);

        buttonGroup.on('click', this.onStartGame);
        buttonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#45a049');
            this.layer.draw();
        });
        buttonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#4CAF50');
            this.layer.draw();
        });

        this.layer.add(buttonGroup);
    }

    public cleanup(): void {
        // FIX 4: Correctly remove the specific listener function
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener('resize', this.handleResize);
    }
}