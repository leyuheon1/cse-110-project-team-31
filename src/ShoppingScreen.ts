import Konva from "konva";
import { ExitButton } from "./ui/ExitButton";
import { InfoButton } from "./ui/InfoButton";

interface IngredientItem {
  name: string;
  price: number;
  inputValue: string;
  unit: string;
}

export class ShoppingScreen {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private onPurchaseComplete: (
    purchases: Map<string, number>,
    totalCost: number
  ) => void;
  private onViewRecipe: () => void;

  private currentFunds: number;

  private focusedInput: string | null = null;
  private focusedInputBox: Konva.Rect | null = null;
  private cursor: Konva.Rect | null = null;
  private cursorInterval: number | null = null;
  private currentPriceText: Konva.Text | null = null;

  private ingredients: IngredientItem[] = [
    { name: "Flour", price: 0.5, inputValue: "0", unit: "cup" },
    { name: "Sugar", price: 0.75, inputValue: "0", unit: "cup" },
    { name: "Butter", price: 0.25, inputValue: "0", unit: "tbsp" },
    { name: "Chocolate", price: 3, inputValue: "0", unit: "cup" },
    { name: "Baking Soda", price: 0.5, inputValue: "0", unit: "tsp" },
  ];

  private inputTexts: Map<string, Konva.Text> = new Map();
  private totalCostText: Konva.Text | null = null;
  private keyboardHandler: (e: KeyboardEvent) => void;

  constructor(
    stage: Konva.Stage,
    layer: Konva.Layer,
    currentFunds: number,
    currentDay: number,
    onPurchaseComplete: (
      purchases: Map<string, number>,
      totalCost: number
    ) => void,
    onViewRecipe: () => void
  ) {
    this.stage = stage;
    this.layer = layer;
    this.currentFunds = currentFunds;
    this.onPurchaseComplete = onPurchaseComplete;
    this.onViewRecipe = onViewRecipe;
    this.keyboardHandler = this.handleKeyPress.bind(this);

    this.setupUI();
    this.setupKeyboardInput();
  }

  private setupUI(): void {
    this.layer.destroyChildren();
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // --- Background ---
    const image = new Image();
    image.src = "./Shopping.png";
    image.onload = () => {
      const background = new Konva.Image({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        image: image,
      });
      this.layer.add(background);
      background.moveToBottom();
      this.layer.draw();
    };

    // --- Current Funds ---
    this.currentPriceText = new Konva.Text({
      x: 545,
      y: 65,
      text: `Current Balance: $${this.currentFunds.toFixed(2)}`,
      fontSize: 30,
      fill: "white",
      fontFamily: "Bakbak one",
      fontStyle: "bold",
    });
    this.layer.add(this.currentPriceText);

    // --- Ingredients ---
    const xPositions = [310, 490, 685, 890, 1090];
    const yPositions = [300, 417, 300, 417, 312];
    const xBox = [330, 510, 710, 920, 1120];
    const yBox = [550, 550, 550, 550, 550];

    this.ingredients.forEach((ingredient, index) => {
      // Price Text
      const priceText = new Konva.Text({
        x: xPositions[index],
        y: yPositions[index],
        text: `$${ingredient.price.toFixed(2)}`,
        fontSize: 24,
        fill: "white",
        fontFamily: "Bakbak one",
      });
      this.layer.add(priceText);

      // Input box row
      this.createIngredientRow(
        stageWidth,
        yBox[index],
        ingredient,
        xBox[index]
      );
    });

    // --- Total Cost ---
    const currentY = stageHeight * 0.22;
    this.totalCostText = new Konva.Text({
      x: 950,
      y: 675,
      fontSize: Math.min(stageWidth * 0.025, 30),
      fontStyle: "bold",
    });
    this.layer.add(this.totalCostText);

    // --- Buttons ---
    this.createPurchaseButton(stageWidth, currentY + stageHeight * 0.1);
    this.createViewRecipeButton(stageWidth, stageHeight);

    // --- Exit & Info ---
    new ExitButton(this.stage, this.layer, () => {
      this.cleanup();
      window.location.href = "/login.html";
    });
    new InfoButton(this.stage, this.layer);

    this.layer.draw();
  }

  private createViewRecipeButton(
    stageWidth: number,
    stageHeight: number
  ): void {
    const buttonWidth = 190;
    const buttonHeight = 87;

    const buttonGroup = new Konva.Group({
      x: 630,
      y: 117,
    });

    const rect = new Konva.Rect({
      width: buttonWidth,
      height: buttonHeight,
      fill: "#ff9500",
      cornerRadius: 5,
    });

    const text = new Konva.Text({
      width: buttonWidth,
      height: buttonHeight,
      text: "View Recipe",
      fontSize: 40,
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      fontFamily: "Bakbak one",
      fontStyle: "bold",
    });

    buttonGroup.add(rect);
    buttonGroup.add(text);
    text.listening(false);

    rect.on("click", () => {
      this.cleanup();
      this.onViewRecipe();
    });
    rect.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      rect.fill("#fcbf49");
      this.layer.draw();
    });
    rect.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      rect.fill("#f77f00");
      this.layer.draw();
    });

    this.layer.add(buttonGroup);
    buttonGroup.moveToTop();
    this.layer.draw();
  }

  private createIngredientRow(
    stageWidth: number,
    y: number,
    ingredient: IngredientItem,
    x: number
  ): void {
    const boxWidth = 100;
    const boxHeight = 40;

    const inputBox = new Konva.Rect({
      x: x - boxWidth / 2,
      y: y + 30,
      width: boxWidth,
      height: boxHeight,
      fill: "white",
      stroke: "#3498db",
      strokeWidth: 2,
      cornerRadius: 5,
    });

    const inputText = new Konva.Text({
      x: x - boxWidth / 2 + 10,
      y: y + 40,
      text: ingredient.inputValue,
      fontSize: 20,
      fill: "black",
      width: boxWidth - 20,
    });

    this.layer.add(inputBox);
    this.layer.add(inputText);

    this.inputTexts.set(ingredient.name, inputText);

    inputBox.on("click", () =>
      this.focusInput(ingredient.name, inputBox, inputText)
    );
    inputText.on("click", () =>
      this.focusInput(ingredient.name, inputBox, inputText)
    );
  }

  private focusInput(
    ingredientName: string,
    inputBox: Konva.Rect,
    inputText: Konva.Text
  ): void {
    if (this.focusedInputBox) {
      this.focusedInputBox.stroke("#3498db");
      this.focusedInputBox.strokeWidth(2);
    }
    if (this.cursor) {
      this.cursor.destroy();
      this.cursor = null;
    }
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
    }

    this.focusedInput = ingredientName;
    this.focusedInputBox = inputBox;
    inputBox.stroke("#27ae60");
    inputBox.strokeWidth(3);

    const textWidth = inputText.getTextWidth();
    this.cursor = new Konva.Rect({
      x: inputText.x() + textWidth + 2,
      y: inputText.y(),
      width: 2,
      height: inputText.fontSize(),
      fill: "black",
    });
    this.layer.add(this.cursor);

    let visible = true;
    this.cursorInterval = window.setInterval(() => {
      if (this.cursor) {
        this.cursor.visible(visible);
        visible = !visible;
        this.layer.draw();
      }
    }, 500);

    this.layer.draw();
  }

  private setupKeyboardInput(): void {
    window.addEventListener("keydown", this.keyboardHandler);
  }

  private handleKeyPress(e: KeyboardEvent): void {
    if (!this.focusedInput) return;
    const ingredient = this.ingredients.find(
      (i) => i.name === this.focusedInput
    );
    if (!ingredient) return;

    if (e.key >= "0" && e.key <= "9") {
      ingredient.inputValue =
        ingredient.inputValue === "0" ? e.key : ingredient.inputValue + e.key;
      this.updateInputDisplay(ingredient.name);
      this.updateTotalCost();
    } else if (e.key === "Backspace") {
      ingredient.inputValue = ingredient.inputValue.slice(0, -1) || "0";
      this.updateInputDisplay(ingredient.name);
      this.updateTotalCost();
    }
  }

  private updateInputDisplay(ingredientName: string): void {
    const ingredient = this.ingredients.find((i) => i.name === ingredientName);
    const inputText = this.inputTexts.get(ingredientName);
    if (ingredient && inputText) {
      inputText.text(ingredient.inputValue);
      if (this.cursor && this.focusedInput === ingredientName) {
        this.cursor.x(inputText.x() + inputText.getTextWidth() + 2);
      }
      this.layer.draw();
    }
  }

  private updateTotalCost(): void {
    const total = this.ingredients.reduce((sum, ing) => {
      const qty = parseInt(ing.inputValue) || 0;
      return sum + qty * ing.price;
    }, 0);

    if (this.totalCostText) {
      this.totalCostText.text(`Total Cost: $${total.toFixed(2)}`);
      this.totalCostText.fill(total > this.currentFunds ? "red" : "white");
      this.layer.draw();
    }
  }

  private createPurchaseButton(stageWidth: number, y: number): void {
    const buttonWidth = Math.min(stageWidth * 0.25, 300);
    const buttonHeight = Math.min(this.stage.height() * 0.08, 60);

    const buttonGroup = new Konva.Group({
      x: 950, // keep your current x
      y: 730, // keep your current y
    });

    const rect = new Konva.Rect({
      width: buttonWidth,
      height: buttonHeight,
      fill: "#4CAF50",
      cornerRadius: 10,
    });

    const label = new Konva.Text({
      width: buttonWidth,
      height: buttonHeight,
      text: "PURCHASE",
      fontSize: Math.min(stageWidth * 0.022, 28),
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      fontStyle: "bold",
    });

    buttonGroup.add(rect);
    buttonGroup.add(label);

    // Click handler
    buttonGroup.on("click", () => {
      let totalCost = 0;

      this.ingredients.forEach((ing) => {
        const qty = parseInt(ing.inputValue) || 0;
        totalCost += qty * ing.price;
      });

      if (totalCost > this.currentFunds) {
        alert("Not enough funds!");
        return;
      }

      // Deduct total cost from current funds
      this.currentFunds -= totalCost;

      // Update displayed balance
      if (this.currentPriceText) {
        this.currentPriceText.text(
          `Current Balance: $${this.currentFunds.toFixed(2)}`
        );
        this.layer.draw();
      }

      // Call your existing callback
      const purchases = new Map<string, number>();
      this.ingredients.forEach((ing) => {
        const qty = parseInt(ing.inputValue) || 0;
        if (qty > 0) purchases.set(ing.name, qty);
      });

      this.cleanup();
      this.onPurchaseComplete(purchases, totalCost);
    });

    buttonGroup.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      rect.fill("#45a049");
      this.layer.draw();
    });

    buttonGroup.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      rect.fill("#4CAF50");
      this.layer.draw();
    });

    this.layer.add(buttonGroup);
  }

  public cleanup(): void {
    window.removeEventListener("keydown", this.keyboardHandler);
    if (this.cursorInterval) clearInterval(this.cursorInterval);
  }
}
