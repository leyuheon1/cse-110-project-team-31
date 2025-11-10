import Konva from "konva";
import { HowToPlayScreen } from "./HowToPlayScreen";

export class StoryScreen {
  constructor(stage: Konva.Stage, layer: Konva.Layer, onComplete: () => void) {
    const cursorDefault = "default";
    const cursorPointer = "pointer";

    const bgSrc = "/Storyline.png";

    // Box
    const boxX = 145;
    const boxY = 106;
    const boxWidth = 1179;
    const boxHeight = 217;
    const boxFill = "white";
    const boxStroke = "black";
    const boxStrokeWidth = 2;
    const boxCornerRadius = 10;

    // Text
    const textX = 190;
    const textY = 150;
    const textWidth = 1073;
    const textHeight = 227;
    const textFontSize = 24;
    const textFontFamily = "Tilt Warp";
    const textFontStyle = "bold";
    const username = localStorage.getItem("username");
    const fullText = `Today is a sad day for Owl. He lost his job. Owl is thinking of making cookies from his new home, the trailer park. ${username}, please help the Owl get back on his feet by baking some cookies.`;

    // Button
    const buttonX = 596;
    const buttonY = 222;
    const buttonWidth = 270;
    const buttonHeight = 65;
    const buttonFill = "#F77F00";
    const buttonText = "HELP OWL!";
    const buttonTextFontFamily = "Tilt Warp";
    const buttonTextFontSize = 48;
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
    stage.container().style.cursor = cursorDefault;

    // ---------------------------
    // Load background image
    // ---------------------------
    const image = new Image();
    image.onload = () => {
      const bg = new Konva.Image({
        x: 0,
        y: 0,
        width: stage.width(),
        height: stage.height(),
        image: image,
      });
      layer.add(bg);

      // ---------------------------
      // Add box
      // ---------------------------
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
      layer.add(box);

      // ---------------------------
      // Add animated text
      // ---------------------------
      const text = new Konva.Text({
        x: textX,
        y: textY,
        width: textWidth,
        height: textHeight,
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        fontStyle: textFontStyle,
      });
      layer.add(text);

      let index = 0;
      const interval = setInterval(() => {
        text.text(fullText.slice(0, index));
        layer.draw();
        index++;

        if (index > fullText.length) {
          clearInterval(interval);

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

          layer.add(button);
          layer.draw();

          button.on("mouseenter", function () {
            stage.container().style.cursor = cursorPointer;
            const tag = this.getChildren()[0] as Konva.Tag;
            tag.shadowBlur(buttonShadowBlurHover);
            tag.shadowOffset(buttonShadowOffsetHover);
            layer.draw();
          });
          
          button.on("mouseleave", function () {
            stage.container().style.cursor = cursorDefault;
            const tag = this.getChildren()[0] as Konva.Tag;
            tag.shadowBlur(buttonShadowBlurDefault);
            tag.shadowOffset(buttonShadowOffsetDefault);
            layer.draw();
          });

          button.on("click", () => {
            layer.destroyChildren();
            onComplete();
          });
        }
      }, 10);
    };

    image.src = bgSrc;
  }
}
