import Konva from 'konva';

export class ShuffleButton {
    private buttonGroup: Konva.Group;
    private shuffleCountText: Konva.Text;
    private buttonCircle: Konva.Circle;
    private shufflesRemaining: number = 3;
    private readonly MAX_SHUFFLES = 3;

    constructor(
        private stage: Konva.Stage,
        private layer: Konva.Layer,
        private parentGroup: Konva.Group,
        inputBoxWidth: number,
        inputBoxY: number,
        inputBoxHeight: number,
        private onShuffle: () => void,
        spacing: number = 50
    ) {
        const stageWidth = this.stage.width();
        const buttonRadius = Math.min(stageWidth, this.stage.height()) * 0.035;
        
        // Position to the right of input box, vertically centered
        const inputBoxX = (stageWidth - inputBoxWidth) / 2;
        const buttonX = inputBoxX + inputBoxWidth + spacing;
        const buttonY = inputBoxY + (inputBoxHeight / 2); // Vertically centered with input box

        this.buttonGroup = new Konva.Group({
            x: buttonX,
            y: buttonY,
        });

        // Circle background
        this.buttonCircle = new Konva.Circle({
            radius: buttonRadius,
            fill: '#16a085',
            shadowColor: 'black',
            shadowBlur: 6,
            shadowOpacity: 0.3,
            shadowOffset: { x: 2, y: 2 },
        });

        // Shuffle icon (using ⇄ symbol)
        const shuffleIcon = new Konva.Text({
            text: '⇄',
            fontSize: buttonRadius * 1.2,
            fontStyle: 'bold',
            fill: 'white',
        });

        // Proper centering
        shuffleIcon.offsetX(shuffleIcon.width() / 2.15);
        shuffleIcon.offsetY(shuffleIcon.height() / 2.05);

        // Shuffle count text (below the button, centered)
        this.shuffleCountText = new Konva.Text({
            x: buttonX - 35,
            y: buttonY + buttonRadius * 2 + 3,
            text: `Shuffles: ${this.shufflesRemaining}`,
            fontSize: 14,
            fill: '#16a085',
            fontStyle: 'bold',
            align: 'center',
            width: 70,
        });

        this.buttonGroup.add(this.buttonCircle, shuffleIcon);
        this.parentGroup.add(this.buttonGroup);
        this.parentGroup.add(this.shuffleCountText);

        // Hover effects
        this.buttonGroup.on('mouseenter', () => {
            if (this.shufflesRemaining > 0) {
                this.stage.container().style.cursor = 'pointer';
                this.buttonCircle.fill('#138d75');
                this.layer.draw();
            }
        });

        this.buttonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            if (this.shufflesRemaining > 0) {
                this.buttonCircle.fill('#16a085');
            }
            this.layer.draw();
        });

        // Click handler - shuffle to new problem
        this.buttonGroup.on('click tap', () => {
            if (this.shufflesRemaining > 0) {
                this.handleShuffle();
            }
        });
    }

    private handleShuffle(): void {
        // Decrement shuffle count
        this.shufflesRemaining--;
        
        // Update shuffle count display
        this.shuffleCountText.text(`Shuffles: ${this.shufflesRemaining}`);
        
        // Update button appearance if no shuffles remain
        if (this.shufflesRemaining === 0) {
            this.buttonCircle.fill('#95a5a6');
            this.buttonCircle.opacity(0.6);
            this.shuffleCountText.fill('#95a5a6');
        }
        
        this.layer.draw();
        
        // Call the callback to handle the actual shuffle logic
        this.onShuffle();
    }

    public getShufflesRemaining(): number {
        return this.shufflesRemaining;
    }

    public destroy(): void {
        this.buttonGroup.destroy();
        this.shuffleCountText.destroy();
        this.layer.draw();
    }
}

