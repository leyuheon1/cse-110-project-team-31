import Konva from "konva";

interface VictoryScreenOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onExit: () => void;        // red EXIT
  onReturnHome: () => void;  // go back to how-to-play / home
}

export class VictoryScreen {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private opts: VictoryScreenOptions;

  constructor(stage: Konva.Stage, layer: Konva.Layer, opts: VictoryScreenOptions) {
    this.stage = stage;
    this.layer = layer;
    this.opts = opts;
    this.setupUI();
  }

  private setupUI(): void {
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // 1) modal background (victory theme)
    const modal = new Konva.Rect({
      x: stageWidth * 0.1,
      y: stageHeight * 0.1,
      width: stageWidth * 0.8,
      height: stageHeight * 0.7,
      fill: "#FCBF49",        // teal-ish win color
      strokeWidth: 8,
      cornerRadius: 20,
    });
    this.layer.add(modal);

    // 2) title
    const title = new Konva.Text({
      x: stageWidth * 0.1,
      y: stageHeight * 0.13,
      width: stageWidth * 0.8,
      text: "You Win! 🎉",
      fontSize: Math.min(stageWidth * 0.08, 70),
      fontStyle: "bold",
      fill: "#ffffff",
      align: "center",
      shadowColor: "rgba(0,0,0,0.35)",
      shadowBlur: 6,
      shadowOffset: { x: 0, y: 2 },
    });
    this.layer.add(title);

    // 3) info text
    const infoText = new Konva.Text({
      x: stageWidth * 0.15,
      y: stageHeight * 0.25,
      width: stageWidth * 0.7,
      text:
        `Final Cash: $${this.opts.cashBalance.toFixed(2)}\n` +
        `Total Days Played: ${this.opts.totalDaysPlayed}\n\n`,
      fontSize: Math.min(stageWidth * 0.04, 30),
      fill: "white",
      lineHeight: 1.5,
      align: "left",
    });
    this.layer.add(infoText);

    // 4) bottom buttons (outside modal), same as lose page
    const buttonWidth = Math.min(stageWidth * 0.22, 140);
    const retryButtonWidth = Math.min(stageWidth * 0.28, 200);
    const buttonHeight = Math.min(stageHeight * 0.07, 55);
    const bottomMargin = 20;
    const sideMargin = 20;
    const buttonsY = stageHeight - buttonHeight - bottomMargin;

    // EXIT - bottom LEFT (same)
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

    // RETURN / HOME - bottom RIGHT
    // (note: use retryButtonWidth for the rect, but calc x with that too)
    const actualReturnWidth = retryButtonWidth; // for clarity
    const returnGroup = new Konva.Group({
      x: stageWidth - actualReturnWidth - sideMargin - 60, // same offset you used
      y: buttonsY,
    });

    const returnRect = new Konva.Rect({
      width: actualReturnWidth,
      height: buttonHeight,
      fill: "#4CAF50",
      cornerRadius: 10,
    });

    const returnLabel = new Konva.Text({
      width: actualReturnWidth,
      height: buttonHeight,
      text: "Return to home",
      fontSize: Math.min(stageWidth * 0.022, 24),
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      fontStyle: "bold",
    });

    returnGroup.add(returnRect);
    returnGroup.add(returnLabel);

    returnGroup.on("click", () => {
      this.opts.onReturnHome();
    });
    returnGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      returnRect.fill("#45a049");
      this.layer.draw();
    });
    returnGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      returnRect.fill("#4CAF50");
      this.layer.draw();
    });
    this.layer.add(returnGroup);

    this.layer.draw();
  }

  public cleanup(): void {
    // same as your LoseScreen for now
    // if you later wrap everything in a root group, destroy that here
  }
}
