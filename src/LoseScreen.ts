import Konva from "konva";

interface LoseScreenOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onReturnHome: () => void; // Single exit action
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
    // Remove previous game objects so they don't show through transparency
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
    // Placed above the owl (approx 40% down)
    const infoText = new Konva.Text({
      x: 0,
      y: stageHeight * 0.4,
      width: stageWidth,
      text:
        `Total Days Played: ${this.opts.totalDaysPlayed}\n` +
        `Final Balance: $${this.opts.cashBalance.toFixed(2)}`,
      fontSize: Math.min(stageWidth * 0.05, 24),
      fontStyle: "bold",
      fill: "#da5552", // Dark brown matches the aesthetic better than pure black
      align: "center",
      lineHeight: 1.5,
      fontFamily: '"Press Start 2P", cursive',
    });
    this.layer.add(infoText);

    // 4) Return to Login Button
    // Placed below the owl (approx 72% down)
    const buttonWidth = Math.min(stageWidth * 0.4, 250);
    const buttonHeight = Math.min(stageHeight * 0.08, 80);

    const returnGroup = new Konva.Group({
      x: (stageWidth - buttonWidth) / 2,
      y: stageHeight * 0.72,
    });

    const returnRect = new Konva.Rect({
      width: buttonWidth,
      height: buttonHeight,
      fill: "#FFAA00", // Orange match
      cornerRadius: 15,
      shadowColor: "black",
      shadowBlur: 15,
      shadowOpacity: 0.3,
      shadowOffset: { x: 0, y: 5 },
    });

    const returnText = new Konva.Text({
      width: buttonWidth,
      height: buttonHeight,
      text: "RETURN\nTO LOGIN", // Stacked text
      fontSize: Math.min(stageWidth * 0.03, 20),
      fontFamily: '"Press Start 2P", cursive',
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      lineHeight: 1.4,
    });

    returnGroup.add(returnRect);
    returnGroup.add(returnText);

    // Interaction Logic
    returnGroup.on("click", () => {
      this.opts.onReturnHome();
    });

    returnGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      returnRect.fill("#E69900"); // Darker orange
      returnRect.scale({ x: 1.05, y: 1.05 });

      // Recenter logic
      const offsetX = (buttonWidth * 0.05) / 2;
      const offsetY = (buttonHeight * 0.05) / 2;
      returnRect.x(-offsetX);
      returnRect.y(-offsetY);
      returnText.x(-offsetX);
      returnText.y(-offsetY);

      this.layer.draw();
    });

    returnGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      returnRect.fill("#FFAA00");
      returnRect.scale({ x: 1, y: 1 });
      returnRect.x(0);
      returnRect.y(0);
      returnText.x(0);
      returnText.y(0);
      
      this.layer.draw();
    });

    this.layer.add(returnGroup);
    this.layer.draw();
  }
}