import Konva from "konva";

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
    // 1) CLEAR THE LAYER
    this.layer.destroyChildren();

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // 2) Background Image
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
    imageObj.src = "/lose-background.png";

    // 3) Stats Text
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

    // 4) Return to Login Button
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
      listening: false // Optimization: let clicks pass through text to the rect/group
    });

    returnGroup.add(returnRect);
    returnGroup.add(returnText);

    // Interaction Logic
    returnGroup.on("click tap", () => {
      this.opts.onReturnHome();
    });

    // FIXED: Removed scaling logic, kept color change
    returnGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      returnRect.fill("#E69900"); // Darker orange
      this.layer.draw();
    });

    // FIXED: Removed scaling reset logic
    returnGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      returnRect.fill("#FFAA00"); // Original orange
      this.layer.draw();
    });

    this.layer.add(returnGroup);
    this.layer.draw();
  }
}