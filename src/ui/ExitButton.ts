import Konva from 'konva';

export class ExitButton{
    private buttonGroup: Konva.Group;

    constructor(
        private stage: Konva.Stage,
        private layer: Konva.Layer,
        private onExit: () => void,
    ){
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        //button size and position
        const buttonWidth = Math.min(stageWidth*0.12, 110);
        const buttonHeight = Math.min(stageHeight*0.08, 40);

        const marginX = stageWidth * 0.03;
        const marginY = stageHeight * 0.04;

        const x = marginX
        const y = stageHeight - buttonHeight - marginY;

        this.buttonGroup = new Konva.Group({
            x: x,
            y: y,
        });

        //Button rectangle
        const buttonRect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#da5552',
            cornerRadius: 5,
            shadowColor: 'black',
            shadowBlur: 6,
            shadowOpacity: 0.3,
            shadowOffset: { x: 2, y: 2 },
        });

        //Button text
        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'EXIT',
            fontSize: Math.min(stageWidth*0.022,20),
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#FFFFFF',
            align: 'center',
            verticalAlign: 'middle',
            listening: false,
        });

        //add both to group
        this.buttonGroup.add(buttonRect);
        this.buttonGroup.add(text);

        //add hover effect
        buttonRect.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            buttonRect.fill('#ff7775');
        });
        
        buttonRect.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            buttonRect.fill('#da5552');
        });

        //Add click event
        buttonRect.on('click', () => {
            this.onExit();
        });

        //add to layer
        this.layer.add(this.buttonGroup);
        this.layer.draw();
    }

    public destroy(){
        this.buttonGroup.destroy();
        this.layer.draw();
    }
}