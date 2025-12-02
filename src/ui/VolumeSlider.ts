import Konva from 'konva';

export class VolumeSlider {
  private group: Konva.Group;
  private track: Konva.Rect;
  private knob: Konva.Circle;

  private readonly sliderWidth = 160;
  private readonly sliderHeight = 8;
  private readonly knobRadius = 10;

  constructor(
    private stage: Konva.Stage,
    private layer: Konva.Layer,
    private initialVolume: number,               // 0–1
    private onVolumeChange: (v: number) => void, // callback to game
  ) {
    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    // Position: bottom-center-ish
    const marginBottom = stageHeight * 0.04;

    const x = (stageWidth - this.sliderWidth) / 2;
    const y = stageHeight - marginBottom - this.knobRadius * 2;

    this.group = new Konva.Group({ x, y });

    // Track (background bar)
    this.track = new Konva.Rect({
      x: 0,
      y: this.knobRadius - this.sliderHeight / 2,
      width: this.sliderWidth,
      height: this.sliderHeight,
      fill: '#ccc',
      cornerRadius: this.sliderHeight / 2,
    });

    // Knob (x is LOCAL inside the group!)
    const knobX = this.initialVolume * this.sliderWidth;
    const knobY = this.knobRadius;

    this.knob = new Konva.Circle({
      x: knobX,
      y: knobY,
      radius: this.knobRadius,
      fill: '#ffffff',
      stroke: '#000',
      strokeWidth: 1,
      draggable: true,
    });

    // ---- Drag logic: clamp inside [0, sliderWidth] in LOCAL coords ----
    this.knob.on('dragmove', () => {
      let localX = this.knob.x();      // 0..sliderWidth, in group coordinates
      if (localX < 0) localX = 0;
      if (localX > this.sliderWidth) localX = this.sliderWidth;

      this.knob.x(localX);
      this.knob.y(knobY);             // keep it on the track vertically

      const v = this.xToVolume(localX);
      this.onVolumeChange(v);
      this.layer.batchDraw();
    });

    // Clicking on track moves knob there
    this.track.on('mousedown', () => {
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      // pointer.x is absolute → convert to local inside the group
      const localX = pointer.x - this.group.x();
      const clampedX = Math.max(0, Math.min(this.sliderWidth, localX));

      this.knob.position({ x: clampedX, y: knobY });

      const v = this.xToVolume(clampedX);
      this.onVolumeChange(v);
      this.layer.batchDraw();
    });

    // Optional label
    const label = new Konva.Text({
      x: 0,
      y: this.knobRadius * 2 + 4,
      text: 'Audio Volume',
      fontSize: 14,
      fontFamily: 'Arial',
    });

    this.group.add(this.track);
    this.group.add(this.knob);
    this.group.add(label);
    this.layer.add(this.group);
    this.layer.draw();
  }

  private xToVolume(x: number): number {
    const v = x / this.sliderWidth;
    return Math.max(0, Math.min(1, v));
  }

  public setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    const x = vol * this.sliderWidth;
    this.knob.x(x);
    this.layer.batchDraw();
  }
}
