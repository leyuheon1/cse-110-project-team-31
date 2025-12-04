import Konva from "konva";
import { VolumeSlider } from './VolumeSlider';
import { getAssetPath } from '../utils';


export class InfoButton {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private isPopupOpen: boolean = false;
    private customText?: string;

    private volumeSlider?: VolumeSlider;
    public volume: number = 0.5;                         // 0–1
    public volumeChangeCallback?: (v: number) => void;

    public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volumeSlider) {
      this.volumeSlider.setVolume(this.volume);
    }
    }

    constructor(stage: Konva.Stage, layer: Konva.Layer, customText?: string) {
        this.stage = stage;
        this.layer = layer;
        this.customText = customText;

        

        // --- FIX 1: Make the button smaller ---
        // Reduced from 0.035 to 0.025
        const buttonRadius = Math.min(stage.width(), stage.height()) * 0.025;

        this.group = new Konva.Group({
            x: stage.width() - buttonRadius * 2.5,
            y: buttonRadius * 2.5, // Adjusted Y to not stick too close to top
        });

        // Circle background
        const circle = new Konva.Circle({
            radius: buttonRadius,
            fill: "#357ca5",
            shadowColor: "black",
            shadowBlur: 5,
            shadowOpacity: 0.3,
            shadowOffset: { x: 2, y: 2 },
        });

        // Info Button "?" text
        const text = new Konva.Text({
            text: "?",
            fontSize: buttonRadius * 1.2,
            fontFamily: "Press Start 2P", 
            fill: "white",
            align: 'center',
            verticalAlign: 'middle'
        });

        // Center text
        text.offsetX(text.width() / 2);
        text.offsetY(text.height() / 2);

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
            if (this.isPopupOpen) return; 
            this.showPopup()
        });
    }

    private async showPopup() {
        if(this.isPopupOpen) return;
        this.isPopupOpen = true;

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        let instructions = "";

        if (this.customText) {
            instructions = this.customText;
        } else {
            try {
                const response = await fetch(getAssetPath('howtoplaypopup.txt'));
                instructions = await response.text();
            } catch (error) {
                instructions = "Instructions could not be loaded.";
            }
        }

        // --- FIX 2: Paper Style Modal ---
        const modalWidth = Math.min(stageWidth * 0.8, 800);
        const modalHeight = Math.min(stageHeight * 0.8, 600);
        const modalX = (stageWidth - modalWidth) / 2;
        const modalY = (stageHeight - modalHeight) / 2;

        const modalLayer = new Konva.Layer();
        const modalGroup = new Konva.Group();

        // 1. Dark Overlay
        const overlay = new Konva.Rect({
            width: stageWidth,
            height: stageHeight,
            fill: 'rgba(0,0,0,0.5)'
        });
        // Click background to close
        overlay.on('click', () => {
            modalLayer.destroy();
            this.layer.draw();
            this.isPopupOpen = false;
        });

        // 2. Paper Background (Beige with Stroke)
        const paper = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalWidth,
            height: modalHeight,
            fill: '#F5F1E8', // Beige paper color
            stroke: '#E8E1C9', // Darker beige stroke
            strokeWidth: 4,
            cornerRadius: 20,
            shadowColor: 'black',
            shadowBlur: 20,
            shadowOpacity: 0.4,
            shadowOffset: { x: 0, y: 10 }
        });

        // 3. Gradient Highlight (Glassy effect)
        const highlight = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalWidth,
            height: modalHeight,
            cornerRadius: 20,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: modalHeight },
            fillLinearGradientColorStops: [0, 'rgba(255,255,255,0.5)', 1, 'rgba(255,255,255,0)'],
            opacity: 0.6,
            listening: false
        });

        // 4. Crease Line (Optional, adds to the paper feel)
        const crease = new Konva.Line({
            points: [modalX + 20, modalY + modalHeight * 0.15, modalX + modalWidth - 20, modalY + modalHeight * 0.15],
            stroke: 'rgba(0,0,0,0.05)',
            strokeWidth: 2,
            listening: false
        });

        // 5. Title
        const title = new Konva.Text({
            x: modalX,
            y: modalY + 30,
            width: modalWidth,
            text: "HOW TO PLAY",
            fontSize: Math.min(stageWidth * 0.04, 32),
            fontFamily: "Press Start 2P",
            fontStyle: "bold",
            fill: "#2C3E50",
            align: "center",
        });

        // 6. Content Text (Nunito font for readability)
        const content = new Konva.Text({
            x: modalX + 40,
            y: modalY + 90,
            width: modalWidth - 80,
            text: instructions,
            fontSize: Math.min(stageWidth * 0.02, 20),
            fontFamily: "Nunito, sans-serif", // Changed from VT323 to match typical UI
            fill: "#2C3E50",
            align: "center",
            lineHeight: 1.6,
        });

        // --- FIX 3: Red Circle Close Button ---
        const closeRadius = 16;
        const padding = 16;

        const closeGroup = new Konva.Group({
            x: modalX + padding + closeRadius,
            y: modalY + padding + closeRadius
        });

        const closeCircle = new Konva.Circle({
            radius: closeRadius,
            fill: '#e74c3c', // Red
            shadowColor: 'black',
            shadowBlur: 4,
            shadowOpacity: 0.3
        });

        const closeX = new Konva.Text({
            text: 'X',
            fontSize: 14,
            fontFamily: 'Press Start 2P',
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            offsetX: 7, // Approx half width
            offsetY: 7  // Approx half height
        });

        closeGroup.add(closeCircle, closeX);

        // Hover effects
        closeGroup.on("mouseenter", () => {
            this.stage.container().style.cursor = "pointer";
            closeCircle.fill('#c0392b');
            modalLayer.draw();
        });
        closeGroup.on("mouseleave", () => {
            this.stage.container().style.cursor = "default";
            closeCircle.fill('#e74c3c');
            modalLayer.draw();
        });

        // Close action
        closeGroup.on("click", () => {
            modalLayer.destroy();
            this.layer.draw();
            this.isPopupOpen = false;
        });

        // Add everything to modal layer
        modalGroup.add(overlay, paper, highlight, crease, title, content, closeGroup);
        modalLayer.add(modalGroup);
        const getGlobalBgmVolume = (window as any).getGlobalBgmVolume;
        const setGlobalBgmVolume = (window as any).setGlobalBgmVolume;

        // If GameManager already set a global volume, use that, otherwise fallback to 0.5
        let initialVolume = 0.5;
        if (typeof getGlobalBgmVolume === 'function') {
            const v = getGlobalBgmVolume();
            if (typeof v === 'number' && !Number.isNaN(v)) {
            initialVolume = Math.max(0, Math.min(1, v));
            }
        }
        // Add modal layer to stage
        this.stage.add(modalLayer);
        this.volumeSlider = new VolumeSlider(
        this.stage,
        modalLayer,
        initialVolume,
        (v: number) => {
            this.volume = v;

            // Call per-instance callback if someone set it (optional)
            if (typeof setGlobalBgmVolume === 'function') {
                setGlobalBgmVolume(v);
            }
            // Global event so GameManager can react
            window.dispatchEvent(
            new CustomEvent<number>('bgm-volume-change', { detail: v })
            );
        }
        );

        // Center the volume slider at bottom of modal
        this.volumeSlider.setPosition(
        modalX + (modalWidth - this.volumeSlider.getWidth()) / 2,
        modalY + modalHeight - 70
        );

        modalLayer.draw();
    }
}
