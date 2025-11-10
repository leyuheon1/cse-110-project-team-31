import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';

export class HowToPlayScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onStartGame: () => void;

    constructor(stage: Konva.Stage, layer: Konva.Layer, onStartGame: () => void) {
        this.stage = stage;
        this.layer = layer;
        this.onStartGame = onStartGame;
        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Modal box (responsive)
        // Paper-like modal (shadow + subtle highlight + crease)
        const modalX = stageWidth * 0.1;
        const modalY = stageHeight * 0.1;
        const modalW = stageWidth * 0.8;
        const modalH = stageHeight * 0.7;

        const modalGroup = new Konva.Group();

        const paper = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalW,
            height: modalH,
            cornerRadius: 26,
            fill: '#F5F1E8',          // 比纯白更像纸
            stroke: '#E8E1C9',        // 很淡的纸边
            strokeWidth: 3,
            shadowColor: 'rgba(0,0,0,0.35)',
            shadowBlur: 20,
            shadowOffset: { x: 0, y: 12 },
            shadowOpacity: 0.35
        });

        const highlight = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalW,
            height: modalH,
            cornerRadius: 26,
            listening: false,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint:   { x: 0, y: modalH },
            fillLinearGradientColorStops: [0, 'rgba(255,255,255,0.55)', 1, 'rgba(255,255,255,0)'],
            opacity: 0.6
        });

        const crease = new Konva.Line({
            points: [modalX + 16, modalY + modalH * 0.45, modalX + modalW - 16, modalY + modalH * 0.45],
            stroke: 'rgba(0,0,0,0.08)',
            strokeWidth: 2,
            listening: false
        });

        modalGroup.add(paper, highlight, crease);
        this.layer.add(modalGroup);


        // Title (responsive)
        const title = new Konva.Text({
            x: stageWidth * 0.1,
            y: stageHeight * 0.13,
            width: stageWidth * 0.8,
            text: 'HOW TO PLAY',
            fontSize: Math.min(stageWidth * 0.088, 48),
            fontStyle: 'bold',
            fill: 'black',
            align: 'center'
        });
        this.layer.add(title);

        // Load instructions with proper sizing
        this.loadInstructions(stageWidth, stageHeight);

        // Start button (responsive)
        this.createStartButton(stageWidth, stageHeight);

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; //go to login page
        });
        
        this.layer.draw();
    }

    private async loadInstructions(stageWidth: number, stageHeight: number): Promise<void> {
        try {
            const response = await fetch('/howtoplay.txt');
            const text = await response.text();
            
            // Calculate text box dimensions
            const textBoxX = stageWidth * 0.15;
            const textBoxY = stageHeight * 0.22;
            const textBoxWidth = stageWidth * 0.7;
            const textBoxHeight = stageHeight * 0.45;  // Space for text before button
            
            // Create clipping rect so text doesn't overflow
            const clipRect = new Konva.Rect({
                x: textBoxX,
                y: textBoxY,
                width: textBoxWidth,
                // height: textBoxHeight,
                fill: 'transparent'
            });
            
            const instructions = new Konva.Text({
                x: textBoxX,
                y: textBoxY,
                width: textBoxWidth,
                height: textBoxHeight,
                text: text,
                fontSize: Math.min(stageWidth * 0.04, 25),  // Responsive font size
                fill: 'black',
                lineHeight: 1.5,
                wrap: 'word',
                ellipsis: false, 
                align: 'center'
            });
            
            this.layer.add(instructions)
            this.layer.draw();
        } catch (error) {
            console.error('Could not load instructions:', error);
            
            // Fallback text if file doesn't load
            const fallback = new Konva.Text({
                x: stageWidth * 0.15,
                y: stageHeight * 0.25,
                width: stageWidth * 0.7,
                text: 'Instructions could not be loaded.\n\nClick START GAME to begin!',
                fontSize: Math.min(stageWidth * 0.02, 24),
                fill: 'red',
                lineHeight: 1.8,
                align: 'center'
            });
            this.layer.add(fallback);
            this.layer.draw();
        }
    }   

    private createStartButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);
        
        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2,  // Center horizontally
            y: stageHeight * 0.72
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
        // Cleanup if needed
    }
}