import Konva from "konva";
import { ConfigManager } from "./config"; // Import ConfigManager
import { VolumeButton } from './ui/VolumeButton';
import { getAssetPath } from "./utils";

export class StoryScreen {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private onComplete: () => void;

  private volumeButton?: VolumeButton;
  public volume: number = 0.5;

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volumeButton) {
      this.volumeButton.setVolume(this.volume);
    }
  }
  
  // Resizing & State variables
  private resizeHandler: () => void;
  private animationFrameId: number | null = null;
  private typingInterval: number | null = null;
  private currentRenderId: number = 0;
  private rainAnimation: Konva.Animation | null = null;
  private raindrops: Konva.Line[] = [];

  constructor(stage: Konva.Stage, layer: Konva.Layer, onComplete: () => void) {
    this.stage = stage;
    this.layer = layer;
    this.onComplete = onComplete;

    // Bind resize handler
    this.resizeHandler = this.handleResize.bind(this);

    this.setupUI();

    // Add listener
    window.addEventListener('resize', this.resizeHandler);
  }

  private handleResize(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    this.animationFrameId = requestAnimationFrame(() => {
        // Stop typing immediately on resize
        if (this.typingInterval) clearInterval(this.typingInterval);
        
        this.layer.destroyChildren();
        this.setupUI();
    });
  }

  private setupUI(): void {
    this.currentRenderId++;
    const myRenderId = this.currentRenderId;

    const cursorDefault = "default";
    const cursorPointer = "pointer";
    const bgSrc = getAssetPath('Storyline.png');


    const getGlobalBgmVolume = (window as any).getGlobalBgmVolume;
    const setGlobalBgmVolume = (window as any).setGlobalBgmVolume;

    let initialVolume = 0.2;
    if (typeof getGlobalBgmVolume === 'function') {
      const v = getGlobalBgmVolume();
      if (typeof v === 'number' && !Number.isNaN(v)) {
        initialVolume = Math.max(0, Math.min(1, v));
      }
    }

    this.volume = initialVolume;

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // Box Dimensions
    const boxRatioWidth = 0.8;
    const boxRatioHeight = 0.35;
    const boxWidth = stageWidth * boxRatioWidth;
    const boxHeight = stageHeight * boxRatioHeight;

    // Calculate Centering
    const boxX = (stageWidth - boxWidth) / 2;
    const boxY = stageHeight * 0.12;

    // Box Style
    const boxFill = "white";
    const boxStroke = "black";
    const boxStrokeWidth = 2;
    const boxCornerRadius = 10;

    // Text
    const textPadding = boxWidth * 0.05;
    const textX = boxX + textPadding;
    const textY = boxY + boxHeight * 0.12;
    const textWidth = boxWidth - (textPadding * 2);
    const textFontSize = Math.min(stageWidth * 0.015, 18);
    const textFontFamily = "Press Start 2P"; 
    const textFontStyle = "bold";
    const username = localStorage.getItem("username");

    // --- DYNAMIC WIN THRESHOLD ---
    const config = ConfigManager.getInstance().getConfig();
    const winAmount = config.winThreshold;

    const fullText = `Today is a sad day for Owl. He lost his job and now lives in a small trailer park. Owl dreams of buying a cozy little house, but he needs $${winAmount} to make it happen. ${username}, please help Owl get back on his feet by baking some cookies!`;

    // Button 
    const buttonWidth = Math.min(stageWidth * 0.45, 250);
    const buttonHeight = Math.min(stageHeight * 0.08, 150);
    const buttonX = (stageWidth - buttonWidth) / 2;
    const buttonY = boxY + boxHeight * 0.65; // Keeping your original Y position
    const buttonFill = "#F77F00";
    const buttonText = "HELP OWL!";
    const buttonTextFontFamily = textFontFamily;
    const buttonTextFontSize = 24;
    const buttonTextFill = "white";
    const buttonShadowColor = "black";
    const buttonShadowBlurDefault = 10;
    const buttonShadowBlurHover = 20;
    const buttonShadowOffsetDefault = { x: 5, y: 5 };
    const buttonShadowOffsetHover = { x: 2, y: 2 };
    const buttonShadowOpacity = 0.5;
    const buttonCornerRadius = 10;
    const buttonPadding = 5;

    // Stage default cursor
    this.stage.container().style.cursor = cursorDefault;

    const image = new Image();
    image.onload = () => {
      // Safety check: stop if resized while loading
      if (this.currentRenderId !== myRenderId) return;

      const bg = new Konva.Image({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        image: image,
      });
      this.layer.add(bg);

      this.createRain(stageWidth, stageHeight);

      this.volumeButton = new VolumeButton(
        this.stage,
        this.layer,
        initialVolume
      );
      
      const box = new Konva.Rect({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        fill: boxFill,
        stroke: boxStroke,
        strokeWidth: boxStrokeWidth,
        cornerRadius: boxCornerRadius,
      });
      this.layer.add(box);

      // ---------------------------
      // Add animated text
      // ---------------------------
      const text = new Konva.Text({
        x: textX,
        y: textY,
        width: textWidth,
        height: boxHeight * 0.6,
        align: 'center', 
        lineHeight: 1.5, 
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        fontStyle: textFontStyle,
        text: "" // Start empty
      });
      this.layer.add(text);
      this.layer.draw();

      let index = 0;
      
      // Clear any existing interval
      if (this.typingInterval) clearInterval(this.typingInterval);

      this.typingInterval = window.setInterval(() => {
        // Safety check inside interval
        if (this.currentRenderId !== myRenderId) {
            if (this.typingInterval) clearInterval(this.typingInterval);
            return;
        }

        text.text(fullText.slice(0, index));
        this.layer.batchDraw();
        index++;

        if (index > fullText.length) {
          if (this.typingInterval) clearInterval(this.typingInterval);
          this.typingInterval = null;

          // ---------------------------
          // Add button
          // ---------------------------
          const button = new Konva.Label({
            x: buttonX,
            y: buttonY,
          });

          button.add(
            new Konva.Tag({
              fill: buttonFill,
              cornerRadius: buttonCornerRadius,
              lineJoin: "round",
              shadowColor: buttonShadowColor,
              shadowBlur: buttonShadowBlurDefault,
              width: buttonWidth,
              height: buttonHeight,
              shadowOffset: buttonShadowOffsetDefault,
              shadowOpacity: buttonShadowOpacity,
            })
          );

          button.add(
            new Konva.Text({
              width: buttonWidth,
              height: buttonHeight,
              text: buttonText,
              fontFamily: buttonTextFontFamily,
              fontSize: buttonTextFontSize,
              padding: buttonPadding,
              fill: buttonTextFill,
              align: "center",
              verticalAlign: "middle",
            })
          );

          this.layer.add(button);
          this.layer.batchDraw();

          // Fix cursor with inner text not blocking events
          (button.getChildren()[1] as Konva.Text).listening(false);

          // Mouse hover
          button.on("mouseenter", () => {
            this.stage.container().style.cursor = cursorPointer;
            const tag = button.getChildren()[0] as Konva.Tag;
            tag.shadowBlur(buttonShadowBlurHover);
            tag.shadowOffset(buttonShadowOffsetHover);
            tag.fill("#fcbf49");
            this.layer.batchDraw();
          });

          button.on("mouseleave", () => {
            this.stage.container().style.cursor = cursorDefault;
            const tag = button.getChildren()[0] as Konva.Tag;
            tag.shadowBlur(buttonShadowBlurDefault);
            tag.shadowOffset(buttonShadowOffsetDefault);
            tag.fill("#F77F00");
            this.layer.batchDraw();
          });

          button.on("click", () => {
            this.cleanup(); // Clean listeners
            this.layer.destroyChildren();
            this.onComplete();
          });
        }
      }, 50);
    };

    image.src = bgSrc;
  }

  private createRain(stageWidth: number, stageHeight: number): void {
    // Clear existing raindrops
    this.raindrops.forEach(drop => drop.destroy());
    this.raindrops = [];

    // Create rain particles
    const numDrops = 100;
    
    for (let i = 0; i < numDrops; i++) {
      const raindrop = new Konva.Line({
        points: [0, 0, -8, 15], // Gentle left slant
        stroke: 'rgba(220, 240, 255, 0.8)',
        strokeWidth: 2,
        lineCap: 'round',
        x: Math.random() * (stageWidth + 100) - 50,
        y: Math.random() * stageHeight,
      });
      
      // Store initial speed for each raindrop
      (raindrop as any).speed = 3 + Math.random() * 4;
      
      this.layer.add(raindrop);
      this.raindrops.push(raindrop);
    }

    // Animate rain
    if (this.rainAnimation) this.rainAnimation.stop();
    
    this.rainAnimation = new Konva.Animation(() => {
      this.raindrops.forEach((drop) => {
        const speed = (drop as any).speed;
        drop.y(drop.y() + speed);
        drop.x(drop.x() - speed * 0.3); // Horizontal movement to the left
        
        // Reset to top when it goes off screen
        if (drop.y() > stageHeight || drop.x() < -50) {
          drop.y(-20);
          drop.x(Math.random() * (stageWidth + 100) - 50);
        }
      });
    }, this.layer);
    
    this.rainAnimation.start();
    const getGlobalBgmVolume = (window as any).getGlobalBgmVolume;
    const setGlobalBgmVolume = (window as any).setGlobalBgmVolume;

    let initialVolume = 0.2;
    if (typeof getGlobalBgmVolume === 'function') {
      const v = getGlobalBgmVolume();
      if (typeof v === 'number' && !Number.isNaN(v)) {
        initialVolume = Math.max(0, Math.min(1, v));
      }
    }

    this.volume = initialVolume;
  }

  public cleanup() {
    if (this.typingInterval) clearInterval(this.typingInterval);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.rainAnimation) this.rainAnimation.stop();
    if (this.volumeButton) this.volumeButton.destroy();
    this.raindrops.forEach(drop => drop.destroy());
    this.raindrops = [];
    window.removeEventListener('resize', this.resizeHandler);
  }
}
