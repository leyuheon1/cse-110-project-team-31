import Konva from "konva";

export class InfoButton {
	private group: Konva.Group;
	private stage: Konva.Stage;
	private layer: Konva.Layer;
	private isPopupOpen: boolean = false;
	private customText?: string;

	constructor(stage: Konva.Stage, layer: Konva.Layer, customText?: string) {
		this.stage = stage;
		this.layer = layer;
		this.customText = customText;

		const buttonRadius = Math.min(stage.width(), stage.height()) * 0.035;

		this.group = new Konva.Group({
			x: stage.width() - buttonRadius * 2.5,
			y: buttonRadius * 1.5,
		});

		// Circle background
		const circle = new Konva.Circle({
			radius: buttonRadius,
			fill: "#357ca5",
			shadowColor: "black",
			shadowBlur: 6,
			shadowOpacity: 0.3,
			shadowOffset: { x: 2, y: 2 },
		});

		// Info Button "?" text
		const text = new Konva.Text({
			text: "?",
			fontSize: buttonRadius * 1.3,
			fontStyle: "bold",
			fill: "white",
		});

		// Proper centering
		text.offsetX(text.width() / 2.15);
		text.offsetY(text.height() / 2.05);

		this.group.add(circle, text);
		this.layer.add(this.group);

		// Hover effects
		this.group.on("mouseenter", () => {
			this.stage.container().style.cursor = "pointer";
			circle.fill("#468fbf");
			this.layer.draw();
		});
		this.group.on("mouseleave", () => {
			this.stage.container().style.cursor = "default";
			circle.fill("#357ca5");
			this.layer.draw();
		});

		// Click handler
		this.group.on("click", () => {
			if (this.isPopupOpen) return; // Prevent multiple popups
			this.showPopup()
			this.isPopupOpen = true;
		});
	}

	/** Show popup with howtoplay.txt or custom text */
	private async showPopup() {
		//check if a popup already exists
		if(this.isPopupOpen) return;
		this.isPopupOpen = true;

		const stageWidth = this.stage.width();
		const stageHeight = this.stage.height();

		let instructions = "";

		// Use custom text if provided, otherwise load from howtoplay.txt
		if (this.customText) {
			instructions = this.customText;
		} else {
			try {
				const response = await fetch("/howtoplaypopup.txt");
				instructions = await response.text();
			} catch (error) {
				instructions = "Instructions could not be loaded.";
			}
		}

		// Modal dimensions and positioning
		const modalWidth = stageWidth * 0.7;
		const modalHeight = stageHeight * 0.6;
		const modalX = (stageWidth - modalWidth) / 2;
		const modalY = (stageHeight - modalHeight) / 2;

		const modalGroup = new Konva.Group();

		// Popup background
		const modalRect = new Konva.Rect({
			x: modalX,
			y: modalY,
			width: modalWidth,
			height: modalHeight,
			fill: "#FFF8DC",
			cornerRadius: 20,
			stroke: "#c49b63",
			strokeWidth: 4,
		});

		// Title
		const title = new Konva.Text({
			x: modalX,
			y: modalY + 25,
			width: modalWidth,
			text: "How to Play",
			fontSize: Math.min(stageWidth * 0.035, 36),
			fontFamily: "Press Start 2P",
			fontStyle: "bold",
			fill: "#2c3e50",
			align: "center",
		});

		// Body text
		const content = new Konva.Text({
			x: modalX + 40,
			y: modalY + 100,
			width: modalWidth - 80,
			text: instructions,
			fontSize: Math.min(stageWidth * 0.02, 22),
			fontFamily: "VT323, monospace",
			fill: "#2c3e50",
			align: "left",
			lineHeight: 1.4,
		});

		// Close button (scaled & centered)
		const closeSize = Math.min(stageWidth, stageHeight) * 0.035;
		const closeButton = new Konva.Text({
			text: "✕",
			fontSize: closeSize,
			fill: "#b33",
			fontStyle: "bold",
		});

		// Positioning close button
		closeButton.x(modalX + modalWidth - closeButton.width() - 18);
		closeButton.y(modalY + 22);
		closeButton.offsetX(closeButton.width() / 2);
		closeButton.offsetY(closeButton.height() / 2);

		// Hover effects for close button
		closeButton.on("mouseenter", () => {
			this.stage.container().style.cursor = "pointer";
			closeButton.fill("#e74c3c");
			this.layer.draw();
		});
		closeButton.on("mouseleave", () => {
			this.stage.container().style.cursor = "default";
			closeButton.fill("#b33");
			this.layer.draw();
		});

		// Close popup on click
		closeButton.on("click", () => {
			modalGroup.destroy();
			this.layer.draw();
			this.isPopupOpen = false;
		});

		// Add all elements to modal group and layer
		modalGroup.add(modalRect, title, content, closeButton);
		this.layer.add(modalGroup);
		this.layer.draw();
	}
}
