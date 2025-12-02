import Konva from 'konva';
import { VolumeButton } from './ui/VolumeButton';

export class LoginScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onLogin: (username: string) => void;
    private volumeButton?: VolumeButton;
    public volume: number = 0.5;

    public setVolume(v: number): void {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.volumeButton) {
            this.volumeButton.setVolume(this.volume);
        }
    }
    
    private username: string = '';
    private inputFocused: boolean = false;

    private inputText!: Konva.Text;
    private cursor!: Konva.Rect;
    private cursorInterval: number | null = null;
    private keyboardHandler: (e: KeyboardEvent) => void;
    private resizeHandler: () => void; // Store reference for cleanup
    private animationFrameId: number | null = null; // For smooth resizing

    private inputBox!: Konva.Rect;
    private loginBackground: Konva.Image | null = null;

    constructor(stage: Konva.Stage, layer: Konva.Layer, onLogin: (username: string) => void) {
        this.stage = stage;
        this.layer = layer;
        this.onLogin = onLogin;

        this.keyboardHandler = this.handleKeyPress.bind(this);
        
        this.resizeHandler = this.handleResize.bind(this);

        this.setupUI();
        
        window.addEventListener('resize', this.resizeHandler);
    }

    private handleResize(): void {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        this.animationFrameId = requestAnimationFrame(() => {
            if (this.cursorInterval) clearInterval(this.cursorInterval);
            
            this.layer.destroyChildren();
            this.setupUI(); 
        });
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        const getGlobalBgmVolume = (window as any).getGlobalBgmVolume;
        const setGlobalBgmVolume = (window as any).setGlobalBgmVolume;

        let initialVolume = 0.5;
        if (typeof getGlobalBgmVolume === 'function') {
        const v = getGlobalBgmVolume();
        if (typeof v === 'number' && !Number.isNaN(v)) {
            initialVolume = Math.max(0, Math.min(1, v));
        }
        }

        this.volume = initialVolume;

        this.volumeButton = new VolumeButton(
        this.stage,
        this.layer,
        initialVolume
        );

        // BACKGROUND IMAGE
        const bgImg = new Image();
        bgImg.onload = () => {
            // Check if layer was destroyed during load (prevents errors on rapid resize)
            if (this.layer.children.length === 0 && this.loginBackground) return; 

            this.loginBackground = new Konva.Image({
                x: 0,
                y: 0,
                image: bgImg,
                width: stageWidth,
                height: stageHeight
            });
            this.layer.add(this.loginBackground);
            this.loginBackground.moveToBottom();
            this.layer.batchDraw(); // Use batchDraw for better performance
        };
        bgImg.src = '/login-background.png';

        // TITLE IMAGE
        const titleImg = new Image();
        titleImg.onload = () => {
             // Check if layer is valid
            if (this.layer.children.length === 0) return;

            const aspect = titleImg.width / titleImg.height;
            const w = Math.min(600, stageWidth * 0.8); // Make responsive
            const h = w / aspect;

            const title = new Konva.Image({
                x: (stageWidth - w) / 2,
                y: stageHeight * 0.15,
                image: titleImg,
                width: w,
                height: h
            });
            this.layer.add(title);
            title.moveToTop();
            this.layer.batchDraw();
        };
        titleImg.src = '/title-logo.png';

        // SUBTITLE
        const subtitle = new Konva.Text({
            x: 0,
            y: stageHeight * 0.4,
            width: stageWidth,
            text: 'Enter your name to begin!',
            fontSize: Math.min(stageWidth * 0.025, 24),
            fontFamily: 'Press Start 2P',
            fill: '#ffffff',
            shadowColor: '#d3d3d3',
            shadowBlur: 5,
            align: 'center'
        });
        this.layer.add(subtitle);

        // INPUT BOX
        const boxWidth = Math.min(stageWidth * 0.6, 500); // Responsive width

        // FIX 4: Check 'this.inputFocused' to restore the correct border color on resize
        this.inputBox = new Konva.Rect({
            x: (stageWidth - boxWidth) / 2,
            y: stageHeight * 0.45,
            width: boxWidth,
            height: 60,
            fill: 'white',
            stroke: this.inputFocused ? '#f1c40f' : '#2ecc71', // Restore color state
            strokeWidth: 4,
            cornerRadius: 10
        });
        this.layer.add(this.inputBox);
        this.inputBox.moveToTop();

        // CLICK TO FOCUS
        this.inputBox.on('click', () => this.focusInput())
        subtitle.on('click', () => this.focusInput());

        // INPUT TEXT
        this.inputText = new Konva.Text({
            x: (stageWidth - boxWidth) / 2 + 15,
            y: stageHeight * 0.45 + 18,
            text: this.username, // FIX 5: Restore the text user already typed
            fontFamily: 'Press Start 2P',
            fontSize: 24,
            fill: 'black',
            width: boxWidth - 30
        });
        this.layer.add(this.inputText);

        this.inputText.listening(false);

        this.inputBox.on('mouseenter', () => {
            this.stage.container().style.cursor = 'text';
        });

        this.inputBox.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        // CURSOR
        // Calculate initial cursor position based on restored text
        const textWidth = this.inputText.getTextWidth();
        this.cursor = new Konva.Rect({
            x: this.inputText.x() + textWidth + 2,
            y: this.inputText.y(),
            width: 2,
            height: this.inputText.fontSize(),
            fill: 'black',
            visible: this.inputFocused // Visible if we were already focused
        });
        this.layer.add(this.cursor);

        // FIX 6: If we were focused before resize, restart the blinking
        if (this.inputFocused) {
            this.startBlinking();
            // Ensure event listener is attached (it might be duplicate but that's safe in addEventListener)
            window.addEventListener('keydown', this.keyboardHandler);
        }

        // START BUTTON
        this.createStartButton(stageWidth, stageHeight);

        this.layer.draw();
    }

    private startBlinking(): void {
        if (this.cursorInterval) clearInterval(this.cursorInterval);
        
        this.cursorInterval = window.setInterval(() => {
            this.cursor.visible(!this.cursor.visible());
            this.layer.batchDraw();
        }, 500);
    }

    private focusInput(): void {
        if (!this.inputFocused) {
            this.inputFocused = true;

            this.inputBox.stroke('#f1c40f'); // YELLOW
            this.cursor.visible(true);

            this.startBlinking();

            window.addEventListener('keydown', this.keyboardHandler);
            this.layer.draw();
        }
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (!this.inputFocused) return;

        if (e.key === 'Enter') {
            if (this.username.trim() === '') {
                alert('Please enter a name!');
                return;
            }
            this.finishLogin();
            return;
        }

        if (e.key === 'Backspace') {
            this.username = this.username.slice(0, -1);
        } else if (e.key.length === 1 && this.username.length < 20) {
            if (/[a-zA-Z0-9 ]/.test(e.key)) {
                this.username += e.key;
            }
        }

        this.updateInputDisplay();
    }

    private updateInputDisplay(): void {
        this.inputText.text(this.username);

        const textWidth = this.inputText.getTextWidth();
        this.cursor.x(this.inputText.x() + textWidth + 2);

        this.layer.batchDraw();
    }

    private createStartButton(stageWidth: number, stageHeight: number): void {
        const width = Math.min(stageWidth * 0.25, 300);
        const height = 60;

        const signGroup = new Konva.Group({
            x: (stageWidth - width) / 2,
            y: stageHeight * 0.62,
        });

        const board = new Konva.Rect({
            width,
            height,
            fill: '#a67c52',
            cornerRadius: 6,
            shadowBlur: 8,
            shadowColor: '#654321',
            shadowOffsetY: 3,
            shadowOpacity: 0.6
        });

        const arrow = new Konva.Line({
            points: [
                width, 0,
                width + height / 2, height / 2,
                width, height
            ],
            fill: '#a67c52',
            closed: true,
            shadowColor: '#654321',
            shadowBlur: 5,
            shadowOpacity: 0.5
        });

        const post = new Konva.Rect({
            x: width / 2 - 10,
            y: height,
            width: 20,
            height: 215,
            fill: '#b5895a',
            shadowColor: '#654321',
            shadowBlur: 5,
            shadowOffsetY: 2,
            shadowOpacity: 0.5
        });

        const text = new Konva.Text({
            width,
            height,
            text: 'START GAME',
            fontFamily: 'Press Start 2P',
            fontSize: Math.min(stageWidth * 0.022, 28),
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle'
        });

        signGroup.add(post);
        signGroup.add(board);
        signGroup.add(arrow);
        signGroup.add(text);

        signGroup.on('click', () => {
            if (this.username.trim() === '') {
                alert('Please enter a name!');
                return;
            }
            this.finishLogin();
        });

        signGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            board.shadowBlur(20);
            board.shadowOpacity(0.9);
            board.shadowColor('#ffdd77');
            this.layer.batchDraw();
        });

        signGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            board.shadowBlur(8);
            board.shadowOpacity(0.6);
            board.shadowColor('#654321');
            this.layer.batchDraw();
        });

        this.layer.add(signGroup);
    }

    private finishLogin(): void {
        localStorage.setItem('username', this.username.trim());
        this.cleanup();
        this.onLogin(this.username.trim());
    }

    public cleanup(): void {
        if (this.cursorInterval) clearInterval(this.cursorInterval);
        
        window.removeEventListener('keydown', this.keyboardHandler);
        window.removeEventListener('resize', this.resizeHandler); // Important!

        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        if (this.loginBackground) this.loginBackground.destroy();

        if (this.volumeButton) this.volumeButton.destroy();
    }
}