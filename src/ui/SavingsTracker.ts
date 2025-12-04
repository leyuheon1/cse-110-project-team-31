import Konva from "konva";
import { ConfigManager } from '../config';
import { getAssetPath } from '../utils';

//Display progress bar to show player how close they are to reaching the win threshold
export class SavingsTracker {
    private layer: Konva.Layer;
    private stage: Konva.Stage;

    //Progress bar components
    private progressBarBG!: Konva.Rect;
    private progressBarHighlight!: Konva.Rect;
    private progressBarFill!: Konva.Rect;
    private cookieIcon!: Konva.Image;
    private labelText !: Konva.Text;

    //tracking values
    private savingsGoal: number; //stores win threshold pulled from config
    private progress: number = 0; //stores progress based off of win threshold


    constructor(layer: Konva.Layer, stage: Konva.Stage) {
        this.layer = layer;
        this.stage = stage;

        //load win threshold from config
        const config = ConfigManager.getInstance().getConfig();
        this.savingsGoal = config.winThreshold;

        // build UI elements
        this.setupUI();
    }

    private setupUI() {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        //progress bar position and size
        const barWidth = stageWidth * 0.45;
        const barHeight = 40;

        const barX = stageWidth * 0.10;
        const barY = stageHeight * 0.20;

        //for consistent bar radius
        const radius = 14;

        // progress bar background
        this.progressBarBG = new Konva.Rect({
            x: barX,
            y: barY,
            width: barWidth,
            height: barHeight,
            fillLinearGradientStartPoint: {x:0, y:0},
            fillLinearGradientEndPoint: {x: 0, y: barHeight},
            fillLinearGradientColorStops:[0, "#eeeeee", 1, "#cccccc"], //added to have gradient feature in progress bar
            cornerRadius: radius,
        });

        //gloss highlight to have top shine
        this.progressBarHighlight = new Konva.Rect({
            x: 0,
            y: 0,
            width: barWidth,
            height: barHeight * 0.45,
            cornerRadius: [radius, radius, 0, 0],
            fill: "white",
            opacity: 0.25,
        });

        // Bar fill
        this.progressBarFill = new Konva.Rect({
            x: barX,
            y: barY,
            width: 0, //starts empty, consistently updates, with the update() function
            height: barHeight,
            cornerRadius: radius,
            fillLinearGradientStartPoint: {x:0, y:0},
            fillLinearGradientEndPoint: {x: 0, y: barHeight},
            fillLinearGradientColorStops:[0, "#ffd27a", 1, "#e6a837"], //added to have gradient feature in progress bar
        });

        //progress bar label - consistently updates balance through update() function
        this.labelText = new Konva.Text({
            x: barX,
            y: barY - 30,
            width: barWidth,
            text: "Savings Progress",
            fontSize: 25,
            fontFamily: "Press Start 2P",
            fill: "#06488aff",
            align: "center",
        });

        this.layer.add(this.labelText);

        // Cookie Icon, used as an indication of the progres
        this.cookieIcon = new Konva.Image({
            x: barX,
            y: barY - 45,
            width: 130,
            height: 145,
            image: undefined as any,
        });

        //load cookie image and add bounce animation
        const img = new window.Image();
        img.src = getAssetPath('cookie.png');
        img.onload = () => {
            this.cookieIcon.image(img);
            this.layer.batchDraw();

            //bounce animation (up and down motion)
            let bounceOffset = 0;
            let bounceDirection = 1;

            const bounceAnim = new Konva.Animation((frame) => {
                const bounceHeight = 2.5; //how far up/down icon moves
                const bounceSpeed = 0.01; //speed of bounce

                //move bounce offset, controls the bouncing of cookie based on direction and speed
                bounceOffset += bounceDirection * bounceSpeed * frame.timeDiff;

                //reverse bounce direction when at height limit
                if(bounceOffset > bounceHeight){
                    bounceDirection = -1;
                }
                if(bounceOffset < -bounceHeight){
                    bounceDirection = 1;
                }

                //apply vertical offset to cookie position, so it aligns with the progress bar
                this.cookieIcon.y(barY - 53 + bounceOffset);

            }, this.layer);

            bounceAnim.start();
        };

        // Add to layer
        this.layer.add(this.progressBarBG);
        this.layer.add(this.progressBarHighlight);
        this.layer.add(this.progressBarFill);
        this.layer.add(this.cookieIcon);
    }

    //update progress bar, label, and cookie position
    public update(currentFunds: number) {
        //convert funds into a percentage based off of win threshold
        const rawProgress = currentFunds / this.savingsGoal;

        // fix percent range to be [0,1], so bar won't go out of bounds
        this.progress = Math.min(1, Math.max(0, rawProgress));

        const barX = this.progressBarBG.x(); //used to update cookie position to align with progress
        const barWidth = this.progressBarBG.width();

        // Update bar fill based on progress
        this.progressBarFill.width(barWidth * this.progress);
        this.progressBarHighlight.width(barWidth) //added for bar highlights

        // Move cookie along the bar
        const cookieX = barX + (barWidth * this.progress) - (this.cookieIcon.width() / 2);
        this.cookieIcon.x(cookieX);

        //update current funds in text label
        this.labelText.text(`Savings: $${currentFunds.toFixed(2)} / $${this.savingsGoal}`);

        this.layer.batchDraw();
    }
}
