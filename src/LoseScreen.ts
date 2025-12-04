import Konva from "konva";
import { getAssetPath } from "./utils";

interface LoseScreenOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onReturnHome: () => void; 
}

export class LoseScreen {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private opts: LoseScreenOptions;

  constructor(stage: Konva.Stage, layer: Konva.Layer, opts: LoseScreenOptions) {
    this.stage = stage;
    this.layer = layer;
    this.opts = opts;
    this.setupUI();
  }

  private setupUI(): void {
    this.layer.destroyChildren();

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    const imageObj = new Image();
    imageObj.onload = () => {
      const bg = new Konva.Image({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        image: imageObj,
        opacity: 1,
      });

      this.layer.add(bg);
      bg.moveToBottom();
      this.layer.draw();
    };
    imageObj.src = getAssetPath('lose-background.png');

    const loseMessage = new Konva.Text({
      x: 0,
      y: stageHeight * 0.35,
      width: stageWidth,
      text: "Owl needs to make more cookies.",
      fontSize: Math.min(stageWidth * 0.03, 16),
      fontStyle: "bold",
      fill: "#9d3231ff",
      align: "center",
      fontFamily: '"Press Start 2P", cursive',
    });
    this.layer.add(loseMessage);

    const infoText = new Konva.Text({
      x: 0,
      y: stageHeight * 0.4,
      width: stageWidth,
      text:
        `Total Days Played: ${this.opts.totalDaysPlayed}\n` +
        `Final Balance: $${this.opts.cashBalance.toFixed(2)}`,
      fontSize: Math.min(stageWidth * 0.05, 24),
      fontStyle: "bold",
      fill: "#da5552", 
      align: "center",
      lineHeight: 1.5,
      fontFamily: '"Press Start 2P", cursive',
    });
    this.layer.add(infoText);

    const buttonWidth = Math.min(stageWidth * 0.4, 250);
    const buttonHeight = Math.min(stageHeight * 0.08, 80);

    const returnGroup = new Konva.Group({
      x: (stageWidth - buttonWidth) / 2,
      y: stageHeight * 0.72,
    });

    const returnRect = new Konva.Rect({
      width: buttonWidth,
      height: buttonHeight,
      fill: "#FFAA00", 
      cornerRadius: 15,
      shadowColor: "black",
      shadowBlur: 15,
      shadowOpacity: 0.3,
      shadowOffset: { x: 0, y: 5 },
    });

    const returnText = new Konva.Text({
      width: buttonWidth,
      height: buttonHeight,
      text: "RETURN\nTO LOGIN", 
      fontSize: Math.min(stageWidth * 0.03, 20),
      fontFamily: '"Press Start 2P", cursive',
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      lineHeight: 1.4,
      listening: false
    });

    returnGroup.add(returnRect);
    returnGroup.add(returnText);

    returnGroup.on("click tap", () => {
      this.opts.onReturnHome();
    });

    returnGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      returnRect.fill("#E69900"); 
      this.layer.draw();
    });

    returnGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      returnRect.fill("#FFAA00"); 
      this.layer.draw();
    });

    this.layer.add(returnGroup);
    this.layer.draw();
  }
}
