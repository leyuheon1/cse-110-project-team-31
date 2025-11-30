import Konva from "konva";


interface VictoryScreenOptions {
  cashBalance: number;
  totalDaysPlayed: number;
  onReturnHome: () => void;
}

interface ConfettiParticle {
  node: Konva.Rect;
  speed: number;
  oscillationSpeed: number;
  oscillationDistance: number;
  angle: number;
}

export class VictoryScreen {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private opts: VictoryScreenOptions;

  private anim: Konva.Animation | null = null;
  private particles: ConfettiParticle[] = [];

  constructor(stage: Konva.Stage, layer: Konva.Layer, opts: VictoryScreenOptions) {
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
      
      this.startConfetti();
      
      this.layer.draw();
    };
    imageObj.src = "/victory-background.png";

    const victoryMessage = new Konva.Text({
      x: 0,
      y: stageHeight * 0.35,
      width: stageWidth,
      text: "Owl made it out of the trailer park!",
      fontSize: Math.min(stageWidth * 0.03, 16),
      fontStyle: "bold",
      fill: "#4CAF50",
      align: "center",
      fontFamily: '"Press Start 2P", cursive',
    });
    this.layer.add(victoryMessage);

    const infoText = new Konva.Text({
      x: 0,
      y: stageHeight * 0.4,
      width: stageWidth,
      text:
        `Total Days Played: ${this.opts.totalDaysPlayed}\n` +
        `Final Balance: $${this.opts.cashBalance.toFixed(2)}`,
      fontSize: Math.min(stageWidth * 0.05, 24),
      fontStyle: "bold",
      fill: "#FFAA00", 
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
      text: "RETURN\nTO HOME",
      fontSize: Math.min(stageWidth * 0.03, 20),
      fontFamily: '"Press Start 2P", cursive',
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      lineHeight: 1.4,
    });

    returnGroup.add(returnRect);
    returnGroup.add(returnText);

    returnGroup.on("click", () => {
      if (this.anim) {
        this.anim.stop();
      }
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

  private startConfetti(): void {
    const colors = ["#da5552", "#b5e48c", "#a8dadc", "#a2d6f9", "#dbbbf5"];
    const count = 75;
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    for (let i = 0; i < count; i++) {
      const startX = Math.random() * stageWidth;
      const startY = Math.random() * stageHeight - stageHeight;

      const rect = new Konva.Rect({
        x: startX,
        y: startY,
        width: 8,
        height: 8,
        fill: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
      });
      this.layer.add(rect);

      this.particles.push({
        node: rect,
        speed: 2 + Math.random() * 3,
        oscillationSpeed: 0.02 + Math.random() * 0.04,
        oscillationDistance: 20 + Math.random() * 40,
        angle: Math.random() * Math.PI * 2,
      });
    }

    this.anim = new Konva.Animation((frame) => {
      if (!frame) return;

      const timeDiff = frame.timeDiff;
      const speedFactor = timeDiff / 16.6;

      this.particles.forEach((p) => {
        const y = p.node.y();
        
        p.node.y(y + p.speed * speedFactor);

        p.angle += p.oscillationSpeed * speedFactor;
        p.node.x(p.node.x() + Math.sin(p.angle) * 2 * speedFactor);

        p.node.rotate(2 * speedFactor);

        if (p.node.y() > stageHeight) {
          p.node.y(-10);
          p.node.x(Math.random() * stageWidth);
        }
      });
    }, this.layer);

    this.anim.start();
  }
}