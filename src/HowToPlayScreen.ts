import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';
import { VolumeButton } from './ui/VolumeButton';


export class HowToPlayScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onStartGame: () => void;
    private animationFrameId: number | null = null;
    private currentRenderId: number = 0;
    private isActive: boolean = true; 

    private volumeButton?: VolumeButton;
    public volume: number = 0.5;  // current value (0–1)
    public volumeChangeCallback?: (v: number) => void;
    public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volumeButton) {
      this.volumeButton.setVolume(this.volume); // move knob to match
    }
  }

    constructor(stage: Konva.Stage, layer: Konva.Layer, onStartGame: () => void) {
        this.stage = stage;
        this.layer = layer;
        this.onStartGame = onStartGame;
        
        this.handleResize = this.handleResize.bind(this);
        
        this.setupUI();
        window.addEventListener('resize', this.handleResize);
        
    }

    private handleResize = (): void => {
        if (!this.isActive) return;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = requestAnimationFrame(() => {
            if (!this.isActive) return;
            this.layer.destroyChildren();
            this.setupUI();
        });
    };

    private setupUI(): void {
        if (!this.isActive) return;

        this.currentRenderId++;
        const myRenderId = this.currentRenderId;

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        const modalX = stageWidth * 0.1;
        const modalY = stageHeight * 0.125;
        const modalW = stageWidth * 0.8;
        const modalH = stageHeight * 0.75; 

        const modalGroup = new Konva.Group();

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

        this.loadInstructions(stageWidth, stageHeight, modalY, modalH, myRenderId);

        this.createStartButton(stageWidth, stageHeight, modalY, modalH);


        const getGlobalBgmVolume = (window as any).getGlobalBgmVolume;
        const setGlobalBgmVolume = (window as any).setGlobalBgmVolume;

        let initialVolume = 0.5;
        if (typeof getGlobalBgmVolume === 'function') {
            const v = getGlobalBgmVolume();
            if (typeof v === 'number' && !Number.isNaN(v)) {
                initialVolume = Math.max(0, Math.min(1, v));
            }
        }

        // keep local field in sync
        this.volume = initialVolume;

        this.volumeButton = new VolumeButton(
            this.stage,
            this.layer,
            initialVolume
        );
        
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
            
            if (!this.isActive || this.currentRenderId !== renderId) return;

            let text = await response.text();

            if (!this.isActive || this.currentRenderId !== renderId) return;

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

                const glowLayer1 = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY + mainHeight + 5,
                    width: textBoxWidth,
                    text: 'TIPS FOR SUCCESS',
                    fontSize: fontSize + 2,
                    fontFamily: 'Press Start 2P',
                    fontStyle: 'bold',
                    fill: '#FFA500',
                    align: 'center',
                    shadowColor: '#FF8C00',
                    shadowBlur: 25,
                    shadowOpacity: 0.8,
                    opacity: 0.6
                });

                const glowLayer2 = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY + mainHeight + 5,
                    width: textBoxWidth,
                    text: 'TIPS FOR SUCCESS',
                    fontSize: fontSize + 2,
                    fontFamily: 'Press Start 2P',
                    fontStyle: 'bold',
                    fill: '#FFD700',
                    align: 'center',
                    shadowColor: '#FFA500',
                    shadowBlur: 15,
                    shadowOpacity: 0.9
                });

                const tipsHeader = new Konva.Text({
                    x: textBoxX,
                    y: textBoxY + mainHeight + 5,
                    width: textBoxWidth,
                    text: 'TIPS FOR SUCCESS',
                    fontSize: fontSize + 2,
                    fontFamily: 'Press Start 2P',
                    fontStyle: 'bold',
                    fill: '#FFEB3B',
                    align: 'center',
                    stroke: '#FF8C00',
                    strokeWidth: 1
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
                this.layer.add(glowLayer1);
                this.layer.add(glowLayer2);
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

            if (this.isActive) {
                this.layer.draw();
            }

        } catch (error) {
            console.error('Could not load instructions:', error);
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

        buttonGroup.on('click', () => {
            this.cleanup();
            this.onStartGame();
        });

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
        this.isActive = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.volumeButton) {
            this.volumeButton.destroy();
        }
        
        window.removeEventListener('resize', this.handleResize);
        
        this.layer.destroyChildren(); 
    }
}