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
  private currentDayDemand: number;
  private currentDay: number;
  private customerOrders: Array<{customerNum: number, cookieCount: number}>;

  private focusedInput: string | null = null;
  private focusedInputBox: Konva.Rect | null = null;
  private currentPriceText: Konva.Text | null = null;
  
  // Image caching
  private priceTagImageObj: HTMLImageElement | null = null; 

  // Resize Handling
  private resizeHandler: () => void;
  private animationFrameId: number | null = null;
  private currentRenderId: number = 0;
  

  // --- UPDATED ORDER: Flour, Butter, Sugar, Chocolate, Baking Soda ---
  private ingredients: IngredientItem[] = [
    { name: "Flour", price: 0.5, inputValue: "0", unit: "cup" },
    { name: "Butter", price: 0.25, inputValue: "0", unit: "tbsp" }, // Moved up (Index 1)
    { name: "Sugar", price: 0.75, inputValue: "0", unit: "cup" },   // Moved down (Index 2)
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
    currentDayDemand: number,
    customerOrders: Array<{customerNum: number, cookieCount: number}>,
    onPurchaseComplete: (
      purchases: Map<string, number>,
      totalCost: number
    ) => void,
    onViewRecipe: () => void,
    savedInputValues: Map<string, string> | undefined = undefined
  ) {
    this.stage = stage;
    this.layer = layer;
    this.currentFunds = currentFunds;
    this.currentDay = currentDay;
    this.currentDayDemand = currentDayDemand;
    this.customerOrders = customerOrders;
    this.onPurchaseComplete = onPurchaseComplete;
    this.onViewRecipe = onViewRecipe;
    
    this.keyboardHandler = this.handleKeyPress.bind(this);
    this.resizeHandler = this.handleResize.bind(this);

    if(savedInputValues){
      this.ingredients.forEach(ingredient => {
        const savedValue = savedInputValues.get(ingredient.name);
        if(savedValue !== undefined){
          ingredient.inputValue = savedValue;
        }
      });
    }

    this.setupUI();
    this.setupKeyboardInput();

    window.addEventListener('resize', this.resizeHandler);
  }

  private handleResize(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    this.animationFrameId = requestAnimationFrame(() => {
        this.layer.destroyChildren();
        this.setupUI();
    });
  }

  // ... (Rest of the class methods remain exactly the same) ...

  private setupUI(): void {
    this.currentRenderId++;
    const myRenderId = this.currentRenderId;

    this.layer.destroyChildren();
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    const backgroundImage = new Image();
    backgroundImage.src = "./Shopping.png";
    backgroundImage.onload = () => {
      if (this.currentRenderId !== myRenderId) return;

      const background = new Konva.Image({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        image: backgroundImage,
      });
      this.layer.add(background);
      background.moveToBottom();
      this.layer.draw();

      this.loadPriceTagImage(() => {
        if (this.currentRenderId !== myRenderId) return;
        this.drawDynamicUI();
        this.layer.draw();
      });
    };
  }
  
  private loadPriceTagImage(callback: () => void): void {
    if (this.priceTagImageObj) {
        callback(); 
        return;
    }

    this.priceTagImageObj = new Image();
    this.priceTagImageObj.onload = callback;
    this.priceTagImageObj.onerror = () => {
        console.warn("Failed to load price-tag.png. Using Konva.Rect fallback.");
        callback(); 
    };
    this.priceTagImageObj.src = "/price-tag.png";
  }

  private createIngredientNameText(stageWidth: number, y: number, name: string, center_X: number): void {
    const nameText = new Konva.Text({
      x: center_X,
      y: y,
      text: name.toUpperCase(),
      fontSize: Math.min(stageWidth * 0.01, 12),
      fill: 'white',
      fontStyle: 'bold',
      fontFamily: "Press Start 2P",
      align: 'center',
      width: stageWidth * 0.1,
      offsetX: stageWidth * 0.05,
    });
    this.layer.add(nameText);
  }

  private drawDynamicUI(): void {
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    this.createBalanceGroup(stageWidth, stageHeight);

    const itemXPercentages = [0.22, 0.363, 0.5, 0.637, 0.77]; 
    const inputY = stageHeight * 0.68;
    const nameY = stageHeight * 0.65;

    this.ingredients.forEach((ingredient, index) => {
        if (index >= itemXPercentages.length) return;

        const center_X = stageWidth * itemXPercentages[index];
        this.createIngredientNameText(stageWidth, nameY, ingredient.name, center_X);
        this.createPriceTagGroup(stageWidth, stageHeight, ingredient, center_X); 
        this.createIngredientRow(stageWidth, inputY, ingredient, center_X);
    });
    
    this.updateTotalCost();

    this.createViewRecipeButton(stageWidth, stageHeight); 
    this.createViewOrdersButton(stageWidth, stageHeight);
    this.createPurchaseButton(stageWidth, 0); 

    new ExitButton(this.stage, this.layer, () => {
      this.cleanup();
      window.location.href = "/login.html";
    });
    new InfoButton(this.stage, this.layer);
  }

  private createBalanceGroup(stageWidth: number, stageHeight: number): void {
    const balanceBoxWidth = stageWidth * 0.25;
    const balanceBoxHeight = stageHeight * 0.1;
    const balanceBoxY = stageHeight * 0.1; 
    const balanceBoxX = stageWidth * 0.5 - balanceBoxWidth / 2;

    const balanceGroup = new Konva.Group({
        x: balanceBoxX,
        y: balanceBoxY,
    });

    const balanceBackgroundRect = new Konva.Rect({
        width: balanceBoxWidth,
        height: balanceBoxHeight,
        fill: "#C94040",
        cornerRadius: 10,
    });
    balanceGroup.add(balanceBackgroundRect);

    const balanceFontSize = Math.min(stageWidth * 0.01, 12);
    
    this.currentPriceText = new Konva.Text({
        x: balanceBoxWidth * 0.05,
        width: balanceBoxWidth * 0.9,
        height: balanceBoxHeight / 2,
        text: `Current Balance: $${this.currentFunds.toFixed(2)}`,
        fontSize: balanceFontSize,
        fill: "white",
        fontFamily: "Press Start 2P",
        align: 'center',
        verticalAlign: 'middle',
    });
    balanceGroup.add(this.currentPriceText);

    this.totalCostText = new Konva.Text({
        x: balanceBoxWidth * 0.05,
        y: balanceBoxHeight / 2,
        width: balanceBoxWidth * 0.9,
        height: balanceBoxHeight / 2,
        text: `Total Cost: $${(0).toFixed(2)}`,
        fontSize: balanceFontSize,
        fill: "white",
        fontFamily: "Press Start 2P",
        align: 'center',
        verticalAlign: 'middle',
    });
    balanceGroup.add(this.totalCostText); 
    
    this.layer.add(balanceGroup);
  }

  private createPriceTagGroup(stageWidth: number, stageHeight: number, ingredient: IngredientItem, center_X: number): void {
    const desiredWidth = stageWidth * 0.09;
    let desiredHeight = stageHeight * 0.07;

    if (this.priceTagImageObj && this.priceTagImageObj.width) {
        const aspectRatio = this.priceTagImageObj.width / this.priceTagImageObj.height;
        desiredHeight = desiredWidth / aspectRatio;
    }
    
    const priceTagY = stageHeight * 0.35;

    const priceTagGroup = new Konva.Group({
      x: center_X - desiredWidth / 2,
      y: priceTagY - desiredHeight / 2,
    });

    if (this.priceTagImageObj && this.priceTagImageObj.width) {
      const priceTagImage = new Konva.Image({
        image: this.priceTagImageObj,
        width: desiredWidth,
        height: desiredHeight,
      });
      priceTagGroup.add(priceTagImage);
    } else {
      priceTagGroup.add(new Konva.Rect({
        width: desiredWidth,
        height: desiredHeight,
        fill: "#c94040",
        cornerRadius: 10,
      }));
    }

    const priceText = new Konva.Text({
      width: desiredWidth,
      height: desiredHeight,
      text: `$${ingredient.price.toFixed(2)}`,
      fontSize: Math.min(stageWidth * 0.01, 12),
      fill: "white",
      fontFamily: "Press Start 2P",
      align: 'center',
      verticalAlign: 'middle',
    });
    priceTagGroup.add(priceText);
    this.layer.add(priceTagGroup);
  }

  private createViewRecipeButton(
    stageWidth: number,
    stageHeight: number
  ): void {
    const buttonWidth = stageWidth * 0.12; 
    const buttonHeight = stageWidth * 0.03; 
    const footerY = stageHeight * 0.75;

    const buttonGroup = new Konva.Group({
        x: stageWidth * 0.3, 
        y: footerY,
        offsetX: buttonWidth / 2,
    });

    const rect = new Konva.Rect({
        width: buttonWidth,
        height: buttonHeight,
        fill: "#ff9500",
        cornerRadius: 10,
    });

    const text = new Konva.Text({
        width: buttonWidth,
        height: buttonHeight,
        text: "VIEW RECIPE",
        fontSize: Math.min(stageWidth * 0.01, 12),
        fill: "white",
        align: "center",
        verticalAlign: 'middle',
        fontFamily: "Press Start 2P",
        fontStyle: "bold",
    });

    buttonGroup.add(rect);
    buttonGroup.add(text);
    text.listening(false);

    rect.on("click", () => {
      const currentValues = this.getIngredientValues();
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

  private createViewOrdersButton(stageWidth: number, stageHeight: number): void {
    const buttonWidth = stageWidth * 0.12; 
    const buttonHeight = stageWidth * 0.03; 
    const footerY = stageHeight * 0.75;

    const buttonGroup = new Konva.Group({
        x: stageWidth * 0.5, 
        y: footerY,
        offsetX: buttonWidth / 2,
    });

    const rect = new Konva.Rect({
        width: buttonWidth,
        height: buttonHeight,
        fill: "#3498db",
        cornerRadius: 10,
    });

    const text = new Konva.Text({
        width: buttonWidth,
        height: buttonHeight,
        text: "VIEW ORDERS",
        fontSize: Math.min(stageWidth * 0.01, 12),
        fill: "white",
        align: "center",
        verticalAlign: 'middle',
        fontFamily: "Press Start 2P",
        fontStyle: "bold",
    });

    buttonGroup.add(rect);
    buttonGroup.add(text);
    text.listening(false);

    rect.on("click", () => {
      this.showReceiptModal();
    });
    rect.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      rect.fill("#5dade2");
      this.layer.draw();
    });
    rect.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      rect.fill("#3498db");
      this.layer.draw();
    });

    this.layer.add(buttonGroup);
    buttonGroup.moveToTop();
    this.layer.draw();
  }

  private showReceiptModal(): void {
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    const modalLayer = new Konva.Layer();
    
    const overlay = new Konva.Rect({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        fill: 'rgba(0, 0, 0, 0.7)',
    });
    overlay.on('click', () => modalLayer.destroy());
    modalLayer.add(overlay);

    const imageObj = new Image();
    imageObj.onload = () => {
        const aspectRatio = imageObj.width / imageObj.height;
        const receiptWidth = stageWidth * 0.3;
        const receiptHeight = receiptWidth / aspectRatio;

        // Modal Coordinates
        const modalX = (stageWidth - receiptWidth) / 2;
        const modalY = (stageHeight - receiptHeight) / 2 - stageHeight * 0.05;

        // Layout Constants
        const V_PAD_HEADER = receiptHeight * 0.05;
        const V_STEP_ORDER = receiptHeight * 0.035;
        const X_PAD_LEFT = receiptWidth * 0.1;
        const X_PAD_RIGHT = receiptWidth * 0.55;

        const receiptGroup = new Konva.Group({
            x: modalX,
            y: modalY,
        });
        
        const receipt = new Konva.Image({
            image: imageObj,
            width: receiptWidth,
            height: receiptHeight
        });
        receiptGroup.add(receipt);

        let currentY = receiptHeight * 0.14;

        const dayText = new Konva.Text({
            x: receiptWidth * 0.1,
            y: currentY,
            width: receiptWidth * 0.8,
            text: `DAY ${this.currentDay}`,
            fontSize: Math.min(stageWidth * 0.015, 18),
            fill: 'black',
            align: 'center',
            fontFamily: 'Doto',
            fontStyle: 'bold'
        });
        receiptGroup.add(dayText);
        
        currentY += stageHeight * 0.04;

        const fontSize = Math.min(stageWidth * 0.013, 15);

        this.customerOrders.forEach(order => {
            const customerName = new Konva.Text({
                x: X_PAD_LEFT,
                y: currentY,
                text: `${order.customerNum}. CUSTOMER ${order.customerNum}`,
                fontSize: fontSize,
                fontFamily: 'Doto',
                fill: 'black'
            });
            receiptGroup.add(customerName);
            
            const cookieCountText = new Konva.Text({
                x: X_PAD_RIGHT, 
                y: currentY,
                width: receiptWidth * 0.35, 
                text: `${order.cookieCount} COOKIES`,
                fontSize: fontSize, 
                fill: 'black',
                fontFamily: 'Doto',
                align: 'right'
            });
            receiptGroup.add(cookieCountText);
            currentY += V_STEP_ORDER;
        });
        
        const totalY = currentY + V_PAD_HEADER * 0.5;

        const totalText = new Konva.Text({
            x: receiptWidth * 0.1,
            y: totalY,
            width: receiptWidth * 0.8,
            text: `TOTAL: ${this.currentDayDemand} COOKIES`,
            fontSize: Math.min(stageWidth * 0.016, 18),
            fontStyle: 'bold',
            fontFamily: 'Doto',
            fill: 'black',
            align: 'center'
        });
        receiptGroup.add(totalText);

        modalLayer.add(receiptGroup);

        // --- FIXED CLOSE BUTTON POSITIONING ---
        // Size: 5.5% of receipt width
        const closeButtonDiameter = receiptWidth * 0.055;
        const radius = closeButtonDiameter / 2;
        
        // PADDING FIX: 
        // X Padding: Standard 4.5% to clear the left edge
        // Y Padding: Reduced to 2% to move the button HIGHER (visually even with left)
        const paddingX = receiptWidth * 0.05;
        const paddingY = receiptWidth * 0.012;

        const closeGroup = new Konva.Group({
            x: modalX + paddingX + radius, 
            y: modalY + paddingY + radius, 
        });

        const closeCircle = new Konva.Circle({
            radius: radius,
            fill: '#e74c3c',
            shadowColor: 'black',
            shadowBlur: 4,
            shadowOpacity: 0.3
        });

        const closeX = new Konva.Text({
            text: 'X',
            fontSize: radius,
            fill: 'white',
            fontFamily: 'Press Start 2P',
            fontStyle: 'bold',
            align: 'center',
            verticalAlign: 'middle'
        });
        
        // Perfect Center
        closeX.offsetX(closeX.width() / 2);
        closeX.offsetY(closeX.height() / 2);

        closeGroup.add(closeCircle);
        closeGroup.add(closeX);

        closeGroup.on('click', () => {
            modalLayer.destroy();
        });

        closeGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            closeCircle.fill('#c0392b');
            modalLayer.draw();
        });

        closeGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            closeCircle.fill('#e74c3c');
            modalLayer.draw();
        });

        modalLayer.add(closeGroup);
        modalLayer.draw();
    };

    imageObj.src = '/start-receipt.png';
    this.stage.add(modalLayer);
  }

  private createIngredientRow(stageWidth: number, y: number, ingredient: IngredientItem, center_X: number): void {
    const boxWidth = stageWidth * 0.07;
    const boxHeight = stageWidth * 0.03;

    const inputBox = new Konva.Rect({
      x: center_X - boxWidth / 2,
      y: y,
      width: boxWidth,
      height: boxHeight,
      fill: "white",
      stroke: "#3498db",
      strokeWidth: 2,
      cornerRadius: 5,
    });

    const inputText = new Konva.Text({
      x: center_X - boxWidth / 2,
      y: y + (boxHeight * 0.3), 
      text: ingredient.inputValue,
      fontSize: Math.min(stageWidth * 0.015, 18),
      fontFamily: 'Press Start 2P',
      fill: "black",
      width: boxWidth,
      align: 'center'
    });
    this.layer.add(inputBox);
    this.layer.add(inputText);

    this.inputTexts.set(ingredient.name, inputText);

    inputBox.on("click", () => this.focusInput(ingredient.name, inputBox, inputText));
    inputBox.on("mouseenter", () => this.stage.container().style.cursor = "pointer");
    inputBox.on("mouseleave", () => this.stage.container().style.cursor = "default");

    inputText.listening(false);
    inputText.on("click", () => this.focusInput(ingredient.name, inputBox, inputText));
  }

  private focusInput(ingredientName: string, inputBox: Konva.Rect, inputText: Konva.Text): void {
    if (this.focusedInputBox) {
      this.focusedInputBox.stroke("#3498db");
      this.focusedInputBox.strokeWidth(2);
    }

    this.focusedInput = ingredientName;
    this.focusedInputBox = inputBox;
    inputBox.stroke("#27ae60");
    inputBox.strokeWidth(3);

    this.layer.draw();
  }

  private setupKeyboardInput(): void {
    window.addEventListener("keydown", this.keyboardHandler);
  }

  private handleKeyPress(e: KeyboardEvent): void {
    if (!this.focusedInput) return;
    const ingredient = this.ingredients.find((i) => i.name === this.focusedInput);
    if (!ingredient) return;

    if (e.key >= "0" && e.key <= "9") {
      ingredient.inputValue = ingredient.inputValue === "0" ? e.key : ingredient.inputValue + e.key;
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
    const buttonWidth = stageWidth * 0.12;
    const buttonHeight = stageWidth * 0.03;
    const footerY = this.stage.height() * 0.75;

    const buttonGroup = new Konva.Group({
      x: stageWidth * 0.7,
      y: footerY, 
      offsetX: buttonWidth / 2, 
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
      fontSize: Math.min(stageWidth * 0.01, 12),
      fontFamily: "Press Start 2P",
      fill: "white",
      align: "center",
      verticalAlign: "middle",
      fontStyle: "bold",
    });

    buttonGroup.add(rect);
    buttonGroup.add(label);

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

      this.currentFunds -= totalCost;

      if (this.currentPriceText) {
        this.currentPriceText.text(`Current Balance: $${this.currentFunds.toFixed(2)}`);
        this.layer.draw();
      }

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
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  public getIngredientValues(): Map<string, string>{
    const value = new Map<string, string>();
    this.ingredients.forEach(ingredient => {
      value.set(ingredient.name, ingredient.inputValue);
    });
    return value;
  }
}