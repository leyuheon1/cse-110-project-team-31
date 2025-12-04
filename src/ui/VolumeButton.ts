import Konva from 'konva';
import { VolumeSlider } from './VolumeSlider';
import { getAssetPath } from '../utils';

export class VolumeButton {
  private group: Konva.Group;
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private isPopupOpen: boolean = false;
  private volumeSlider?: VolumeSlider;
  public volume: number = 0.5;

  constructor(
    stage: Konva.Stage,
    layer: Konva.Layer,
    initialVolume: number = 0.
  ) {
    this.stage = stage;
    this.layer = layer;
    this.volume = initialVolume;

    const buttonRadius = Math.min(stage.width(), stage.height()) * 0.025;

    // Position: top-right corner, next to info button if it exists
    this.group = new Konva.Group({
      x: stage.width() - buttonRadius * 3,
      y: buttonRadius * 2.5,
    });

    // Circle background
    const circle = new Konva.Circle({
      radius: buttonRadius,
      fill: '#357ca5',
      shadowColor: 'black',
      shadowBlur: 5,
      shadowOpacity: 0.3,
      shadowOffset: { x: 2, y: 2 },
    });

    this.group.add(circle);

    // Load volume icon image
    const imgObj = new Image();
    imgObj.src = getAssetPath('volumeIcon.png');
    imgObj.onload = () => {
      const iconSize = buttonRadius * 2.5;
      const icon = new Konva.Image({
        image: imgObj,
        width: iconSize,
        height: iconSize,
        x: -iconSize / 2,
        y: -iconSize / 2,
        listening: false,
      });
      this.group.add(icon);
      this.layer.batchDraw();
    };

    this.layer.add(this.group);

    // Hover effects
    this.group.on('mouseenter', () => {
      this.stage.container().style.cursor = 'pointer';
      circle.fill('#468fbf');
      this.layer.draw();
    });

    this.group.on('mouseleave', () => {
      this.stage.container().style.cursor = 'default';
      circle.fill('#357ca5');
      this.layer.draw();
    });

    // Click handler
    this.group.on('click', () => {
      if (this.isPopupOpen) return;
      this.showPopup();
    });
  }

  private showPopup(): void {
    if (this.isPopupOpen) return;
    this.isPopupOpen = true;

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // Compact modal size
    const modalWidth = Math.min(stageWidth * 0.6, 600);
    const modalHeight = Math.min(stageHeight * 0.2, 200);
    const modalX = (stageWidth - modalWidth) / 2;
    const modalY = (stageHeight - modalHeight) / 2;

    const modalLayer = new Konva.Layer();
    const modalGroup = new Konva.Group();

    // Dark overlay
    const overlay = new Konva.Rect({
      width: stageWidth,
      height: stageHeight,
      fill: 'rgba(0,0,0,0.5)',
    });

    overlay.on('click', () => {
      modalLayer.destroy();
      this.layer.draw();
      this.isPopupOpen = false;
    });

    // Paper background
    const paper = new Konva.Rect({
      x: modalX,
      y: modalY,
      width: modalWidth,
      height: modalHeight,
      fill: '#F5F1E8',
      stroke: '#E8E1C9',
      strokeWidth: 4,
      cornerRadius: 20,
      shadowColor: 'black',
      shadowBlur: 20,
      shadowOpacity: 0.4,
      shadowOffset: { x: 0, y: 10 },
    });

    // Gradient highlight
    const highlight = new Konva.Rect({
      x: modalX,
      y: modalY,
      width: modalWidth,
      height: modalHeight,
      cornerRadius: 20,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: modalHeight },
      fillLinearGradientColorStops: [
        0,
        'rgba(255,255,255,0.5)',
        1,
        'rgba(255,255,255,0)',
      ],
      opacity: 0.6,
      listening: false,
    });

    // Title
    const title = new Konva.Text({
      x: modalX,
      y: modalY + 25,
      width: modalWidth,
      text: 'AUDIO VOLUME',
      fontSize: Math.min(stageWidth * 0.03, 24),
      fontFamily: 'Press Start 2P',
      fontStyle: 'bold',
      fill: '#2C3E50',
      align: 'center',
    });

    // Close button
    const closeRadius = 16;
    const padding = 16;

    const closeGroup = new Konva.Group({
      x: modalX + padding + closeRadius,
      y: modalY + padding + closeRadius,
    });

    const closeCircle = new Konva.Circle({
      radius: closeRadius,
      fill: '#e74c3c',
      shadowColor: 'black',
      shadowBlur: 4,
      shadowOpacity: 0.3,
    });

    const closeX = new Konva.Text({
      text: 'X',
      fontSize: 14,
      fontFamily: 'Press Start 2P',
      fill: 'white',
      align: 'center',
      verticalAlign: 'middle',
      offsetX: 7,
      offsetY: 7,
    });

    closeGroup.add(closeCircle, closeX);

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

    closeGroup.on('click', () => {
      modalLayer.destroy();
      this.layer.draw();
      this.isPopupOpen = false;
    });

    // Add all modal elements
    modalGroup.add(overlay, paper, highlight, title, closeGroup);
    modalLayer.add(modalGroup);

    // Get global volume functions
    const getGlobalBgmVolume = (window as any).getGlobalBgmVolume;
    const setGlobalBgmVolume = (window as any).setGlobalBgmVolume;

    let initialVolume = this.volume;
    if (typeof getGlobalBgmVolume === 'function') {
      const v = getGlobalBgmVolume();
      if (typeof v === 'number' && !Number.isNaN(v)) {
        initialVolume = Math.max(0, Math.min(1, v));
      }
    }

    this.stage.add(modalLayer);

    // Create volume slider in the modal layer
    this.volumeSlider = new VolumeSlider(
      this.stage,
      modalLayer,
      initialVolume,
      (v: number) => {
        this.volume = v;

        if (typeof setGlobalBgmVolume === 'function') {
          setGlobalBgmVolume(v);
        }

        window.dispatchEvent(
          new CustomEvent<number>('bgm-volume-change', { detail: v })
        );
      }
    );

    // Position the slider in the modal
    const sliderY = modalY + modalHeight * 0.55;
    this.volumeSlider.setPosition((stageWidth - this.volumeSlider.getWidth()) / 2, sliderY);

    modalLayer.draw();
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volumeSlider) {
      this.volumeSlider.setVolume(this.volume);
    }
  }

  public destroy(): void {
    this.group.destroy();
  }
}
