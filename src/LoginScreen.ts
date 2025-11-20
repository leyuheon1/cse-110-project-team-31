import Konva from 'konva';

export class LoginScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onLogin: (username: string) => void;

    private username: string = '';
    private inputFocused: boolean = false;

    private inputText!: Konva.Text;
    private cursor!: Konva.Rect;
    private cursorInterval: number | null = null;
    private keyboardHandler: (e: KeyboardEvent) => void;

    private inputBox!: Konva.Rect;
    private loginBackground: Konva.Image | null = null;

    constructor(stage: Konva.Stage, layer: Konva.Layer, onLogin: (username: string) => void) {
        this.stage = stage;
        this.layer = layer;
        this.onLogin = onLogin;

        this.keyboardHandler = this.handleKeyPress.bind(this);

        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // BACKGROUND IMAGE
        const bgImg = new Image();
        bgImg.onload = () => {
            this.loginBackground = new Konva.Image({
                x: 0,
                y: 0,
                image: bgImg,
                width: stageWidth,
                height: stageHeight
            });
            this.layer.add(this.loginBackground);
            this.loginBackground.moveToBottom();
            this.layer.batchDraw();
        };
        bgImg.src = '/login-background.png';

        // TITLE IMAGE
        const titleImg = new Image();
        titleImg.onload = () => {
            const aspect = titleImg.width / titleImg.height;
            const w = 600;
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
            this.layer.draw();
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

        // INPUT BOX (initial green border)
        const boxWidth = stageWidth * 0.4;

        this.inputBox = new Konva.Rect({
            x: (stageWidth - boxWidth) / 2,
            y: stageHeight * 0.45,
            width: boxWidth,
            height: 60,
            fill: 'white',
            stroke: '#2ecc71',       // GREEN (default)
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
            text: '',
            fontFamily: 'Press Start 2P',
            fontSize: 24,
            fill: 'black',
            width: boxWidth - 30
        });
        this.layer.add(this.inputText);

        this.inputText.listening(false); // NEW: make inputText transparent to pointer events

        // Change cursor to pointer when hovering over input box
        this.inputBox.on('mouseenter', () => {
            this.stage.container().style.cursor = 'text'; // text cursor
        });

        this.inputBox.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        // CURSOR (hidden until focus)
        this.cursor = new Konva.Rect({
            x: this.inputText.x() + 2,
            y: this.inputText.y(),
            width: 2,
            height: this.inputText.fontSize(),
            fill: 'black',
            visible: false
        });
        this.layer.add(this.cursor);

        // START BUTTON
        this.createStartButton(stageWidth, stageHeight);

        this.layer.draw();
    }

    // FOCUS INPUT (yellow border + blinking cursor)
    private focusInput(): void {
        if (!this.inputFocused) {
            this.inputFocused = true;

            this.inputBox.stroke('#f1c40f'); // YELLOW
            this.cursor.visible(true);

            // Begin blinking cursor
            this.cursorInterval = window.setInterval(() => {
                this.cursor.visible(!this.cursor.visible());
                this.layer.draw();
            }, 500);

            window.addEventListener('keydown', this.keyboardHandler);
            this.layer.draw();
        }
    }

    // HANDLE KEYBOARD INPUT
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

        this.layer.draw();
    }

    // START GAME BUTTON (with wood post + arrow restored)
    private createStartButton(stageWidth: number, stageHeight: number): void {
        const width = Math.min(stageWidth * 0.25, 300);
        const height = 60;

        // Main sign group (everything is inside this)
        const signGroup = new Konva.Group({
            x: (stageWidth - width) / 2,
            y: stageHeight * 0.62,
        });

        // Wooden board
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

        // Wooden arrow pointer
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

        // Wooden post under the sign
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

        // Text on the board
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

        // Add everything to ONE group
        signGroup.add(post);
        signGroup.add(board);
        signGroup.add(arrow);
        signGroup.add(text);

        // Click behavior
        signGroup.on('click', () => {
            if (this.username.trim() === '') {
                alert('Please enter a name!');
                return;
            }
            this.finishLogin();
        });

        // Hover animation (affects whole sign)
        signGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            board.shadowBlur(20);
            board.shadowOpacity(0.9);
            board.shadowColor('#ffdd77');
            this.layer.draw();
        });

        signGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            board.shadowBlur(8);
            board.shadowOpacity(0.6);
            board.shadowColor('#654321');
            this.layer.draw();
        });

        this.layer.add(signGroup);
    }

    // COMPLETE LOGIN
    private finishLogin(): void {
        localStorage.setItem('username', this.username.trim());
        this.cleanup();
        this.onLogin(this.username.trim());
    }

    public cleanup(): void {
        if (this.cursorInterval) clearInterval(this.cursorInterval);
        window.removeEventListener('keydown', this.keyboardHandler);

        if (this.loginBackground) this.loginBackground.destroy();
    }
}