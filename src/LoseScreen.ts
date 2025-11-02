import Konva from "konva";

interface LoseScreenOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onExit: () => void;   // red EXIT
  onRetry: () => void;  // restart / go to how-to-play
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
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // 1) modal background
    const modal = new Konva.Rect({
      x: stageWidth * 0.1,
      y: stageHeight * 0.1,
      width: stageWidth * 0.8,
      height: stageHeight * 0.7,
      fill: "#D62828",
      strokeWidth: 8,
      cornerRadius: 20,
    });
    this.layer.add(modal);

    // 2) title
    const title = new Konva.Text({
      x: stageWidth * 0.1,
      y: stageHeight * 0.13,
      width: stageWidth * 0.8,
      text: "You Lose :(",
      fontSize: Math.min(stageWidth * 0.08, 70),
      fontStyle: "bold",
      fill: "#000000",
      align: "center",
    });
    this.layer.add(title);

    // 3) info text
    const infoText = new Konva.Text({
      x: stageWidth * 0.15,
      y: stageHeight * 0.25,
      width: stageWidth * 0.7,
      text:
        `Cash Balance: $${this.opts.cashBalance.toFixed(2)}\n` +
        `Total Days Played: ${this.opts.totalDaysPlayed}\n\n`,
      fontSize: Math.min(stageWidth * 0.04, 30),
      fill: "black",
      lineHeight: 1.5,
      align: "left",
    });
    this.layer.add(infoText);

    // 4) bottom buttons (OUTSIDE modal)
    const buttonWidth = Math.min(stageWidth * 0.22, 140);
    const retryButtonWidth = Math.min(stageWidth * 0.28, 200);
    const buttonHeight = Math.min(stageHeight * 0.07, 55);
    const bottomMargin = 20;                 // distance from bottom
    const sideMargin = 20;                   // distance from left/right
    const buttonsY = stageHeight - buttonHeight - bottomMargin;

    // EXIT - bottom LEFT
    const exitGroup = new Konva.Group({
      x: sideMargin,
      y: buttonsY,
    });

    const exitRect = new Konva.Rect({
      width: buttonWidth,
      height: buttonHeight,
      fill: "#C94040",
      cornerRadius: 10,
    });

    const exitLabel = new Konva.Text({
      width: buttonWidth,
      height: buttonHeight,
      text: "EXIT",
      fontSize: Math.min(stageWidth * 0.022, 28),
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      fontStyle: "bold",
    });

    exitGroup.add(exitRect);
    exitGroup.add(exitLabel);

    exitGroup.on("click", () => {
      this.opts.onExit();
    });
    exitGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      exitRect.fill("#b13535");
      this.layer.draw();
    });
    exitGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      exitRect.fill("#C94040");
      this.layer.draw();
    });
    this.layer.add(exitGroup);

    // RETRY / RETURN - bottom RIGHT
    const retryGroup = new Konva.Group({
      x: stageWidth - buttonWidth - sideMargin-60,
      y: buttonsY,
    });

    const retryRect = new Konva.Rect({
      width: retryButtonWidth,
      height: buttonHeight,
      fill: "#4CAF50",
      cornerRadius: 10,
    });

    const retryLabel = new Konva.Text({
      width: retryButtonWidth,
      height: buttonHeight,
      text: "Return to home",
      // 如果你一定要写 "Return to home" 那就把 buttonWidth 调大，或者改成两行
      fontSize: Math.min(stageWidth * 0.022, 24),
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      fontStyle: "bold",
    });

    retryGroup.add(retryRect);
    retryGroup.add(retryLabel);

    retryGroup.on("click", () => {
      this.opts.onRetry();
    });
    retryGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      retryRect.fill("#45a049");
      this.layer.draw();
    });
    retryGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      retryRect.fill("#4CAF50");
      this.layer.draw();
    });
    this.layer.add(retryGroup);

    this.layer.draw();
  }

  public cleanup(): void {
    // later: destroy layer/group if needed
  }
}
