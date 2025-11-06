import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { AnimationPlayer } from './AnimationPlayer'; 
import { ExitButton } from './ui/ExitButton';

export class BakingMinigame {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private config = ConfigManager.getInstance().getConfig();

    private timeRemaining: number;
    private currentProblem: { question: string; answer: number };
    private correctAnswers: number = 0; 
    private totalProblems: number = 0; 
    private cookiesSold: number; 

    private minigameUIGroup: Konva.Group; 
    private choiceUIGroup: Konva.Group; 
    private timerText: Konva.Text;
    private problemText: Konva.Text;
    private scoreText: Konva.Text; 
    private feedbackText: Konva.Text;
    private inputText: Konva.Text;
    private userInput: string = '';

    private timerInterval: number | null = null;
    private onComplete: (result: MinigameResult, skipped: boolean) => void;
    private keyboardHandler: (e: KeyboardEvent) => void; 

    private animationPlayer: AnimationPlayer; 

    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        cookiesSold: number, 
        onComplete: (result: MinigameResult, skipped: boolean) => void
    ) {
        this.stage = stage;
        this.layer = layer;
        this.cookiesSold = cookiesSold; 
        this.onComplete = onComplete;
        this.timeRemaining = this.config.bakingTime;
        this.keyboardHandler = this.handleKeyPress.bind(this);

        this.minigameUIGroup = new Konva.Group({ visible: false, name: 'minigameUI' }); 
        this.choiceUIGroup = new Konva.Group({ visible: false, name: 'choiceUI' }); 
        this.layer.add(this.minigameUIGroup);
        this.layer.add(this.choiceUIGroup);

        this.setupUI(); 
        
        const IMAGE_PATHS = [
            '/9.png', '/10.png', '/11.png', '/12.png', '/13.png', '/14.png'
        ];

        this.animationPlayer = new AnimationPlayer(
            this.layer,
            IMAGE_PATHS,
            2, 
            0, 0, 
            this.stage.width(), this.stage.height(), 
            false, 
            () => {
                this.showPlaySkipChoice();
            }
        );
        
        this.animationPlayer.load().then(() => {
            this.animationPlayer.start();
        }).catch(error => {
            console.error("Animation failed to load, skipping to choice.", error);
            this.showPlaySkipChoice(); 
        });
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        const title = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.05,
            text: 'Baking Minigame - Solve Problems for Tips!', 
            fontSize: Math.min(stageWidth * 0.028, 34),
            fill: '#2c3e50',
            fontStyle: 'bold'
        });
        this.minigameUIGroup.add(title);

        this.timerText = new Konva.Text({
            x: stageWidth * 0.75,
            y: stageHeight * 0.05,
            text: `Time: ${this.timeRemaining}s`,
            fontSize: Math.min(stageWidth * 0.024, 28),
            fill: '#27ae60',
            fontStyle: 'bold'
        });
        this.minigameUIGroup.add(this.timerText);

        this.scoreText = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.12,
            text: `Tips Earned: $${this.correctAnswers}`, 
            fontSize: Math.min(stageWidth * 0.02, 24),
            fill: '#34495e'
        });
        this.minigameUIGroup.add(this.scoreText);

        this.problemText = new Konva.Text({
            x: stageWidth * 0.4,
            y: stageHeight * 0.3,
            text: '',
            fontSize: Math.min(stageWidth * 0.048, 58),
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center',
            width: stageWidth * 0.2
        });
        this.minigameUIGroup.add(this.problemText);

        const inputBox = new Konva.Rect({
            x: stageWidth * 0.35,
            y: stageHeight * 0.45,
            width: stageWidth * 0.3,
            height: stageHeight * 0.08,
            fill: '#ecf0f1',
            stroke: '#3498db',
            strokeWidth: 3,
            cornerRadius: 5
        });
        this.minigameUIGroup.add(inputBox);

        this.inputText = new Konva.Text({
            x: stageWidth * 0.36,
            y: stageHeight * 0.45 + (stageHeight * 0.08 * 0.2),
            text: '',
            fontSize: Math.min(stageWidth * 0.036, 44),
            fill: '#2c3e50',
            width: stageWidth * 0.28,
            align: 'center'
        });
        this.minigameUIGroup.add(this.inputText);

        this.feedbackText = new Konva.Text({
            x: stageWidth * 0.4,
            y: stageHeight * 0.58,
            text: '',
            fontSize: Math.min(stageWidth * 0.028, 34),
            fill: '#27ae60',
            align: 'center',
            width: stageWidth * 0.2
        });
        this.minigameUIGroup.add(this.feedbackText);

        const instructions = new Konva.Text({
            x: stageWidth * 0.3,
            y: stageHeight * 0.7,
            text: 'Type your answer and press ENTER',
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: '#7f8c8d',
            align: 'center',
            width: stageWidth * 0.4
        });
        this.minigameUIGroup.add(instructions);

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; //go to login page
        });
    }
    
    // --- THIS IS THE VISUAL FIX ---
    private showPlaySkipChoice(): void {
        if (this.animationPlayer) {
            this.animationPlayer.destroy();
        }
        
        this.minigameUIGroup.visible(false); 
        this.choiceUIGroup.destroyChildren(); 

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();
        const stage = this.stage; 

        const modalWidth = stageWidth * 0.7;
        const modalHeight = stageHeight * 0.6;
        const modalX = (stageWidth - modalWidth) / 2;
        const modalY = (stageHeight - modalHeight) / 2;

        const modalBg = new Konva.Rect({
            x: modalX, y: modalY, width: modalWidth, height: modalHeight,
            fill: '#FFF8DC', cornerRadius: 20, stroke: '#F4A460', strokeWidth: 5,
            shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.3, shadowOffset: {x: 3, y: 3}
        });
        this.choiceUIGroup.add(modalBg);

        const titleText = new Konva.Text({
            x: modalX, y: modalY + modalHeight * 0.08, width: modalWidth, 
            text: 'EARN BONUS TIPS!', 
            fontSize: Math.min(stageWidth * 0.04, 40), fontStyle: 'bold',
            fill: '#D2691E', align: 'center', shadowColor: 'white', shadowBlur: 2, shadowOffset: {x: 1, y: 1}
        });
        this.choiceUIGroup.add(titleText);

        const cookiesBakedText = new Konva.Text({
            x: modalX, y: modalY + modalHeight * 0.22, width: modalWidth, 
            text: `Your ${this.cookiesSold} cookies are automatically baked and sold!`,
            fontSize: Math.min(stageWidth * 0.02, 20), fontStyle: 'bold',
            fill: '#8B4513', align: 'center',
        });
        this.choiceUIGroup.add(cookiesBakedText);
        
        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1, y: modalY + modalHeight * 0.32, width: modalWidth * 0.8, 
            text: 'Play this minigame to earn extra cash tips!\n\nEach correct answer = +$1 Tip.\n\nSkipping means you earn $0 in bonus tips.',
            fontSize: Math.min(stageWidth * 0.018, 18), fill: '#333', align: 'center', lineHeight: 1.4
        });
        this.choiceUIGroup.add(explainText);

        const promptText = new Konva.Text({
            x: modalX, y: modalY + modalHeight * 0.58, width: modalWidth, 
            text: 'Would you like to play for tips?', 
            fontSize: Math.min(stageWidth * 0.022, 22), fontStyle: 'italic',
            fill: '#DAA520', align: 'center',
        });
        this.choiceUIGroup.add(promptText);

        const playButtonWidth = modalWidth * 0.25;
        const playButtonHeight = modalHeight * 0.15;
        const playButtonX = modalX + modalWidth * 0.3 - playButtonWidth / 2; 
        const playButtonY = modalY + modalHeight * 0.75;
 
        const playButtonGroup = new Konva.Group({ x: playButtonX, y: playButtonY }); 
        const playRect = new Konva.Rect({
            width: playButtonWidth, height: playButtonHeight, fill: '#90EE90',
            cornerRadius: 10, stroke: '#2E8B57', strokeWidth: 3,
            shadowColor: 'black', shadowBlur: 5, shadowOpacity: 0.2, shadowOffset: {x: 2, y: 2}
        });
        const playText = new Konva.Text({
            width: playButtonWidth, height: playButtonHeight, text: 'PLAY', 
            fontSize: Math.min(stageWidth * 0.025, 25), fill: 'white',
            align: 'center', verticalAlign: 'middle', fontStyle: 'bold',
            listening: false 
        });
        playButtonGroup.add(playRect, playText);
        this.choiceUIGroup.add(playButtonGroup); 

        playRect.on('click tap', (evt) => {
            evt.cancelBubble = true; 
            this.choiceUIGroup.visible(false); 
            this.showMinigameUI();           
        });
        playRect.on('mouseenter', () => { stage.container().style.cursor = 'pointer'; playRect.fill('#3CB371'); this.layer.batchDraw(); });
        playRect.on('mouseleave', () => { stage.container().style.cursor = 'default'; playRect.fill('#90EE90'); this.layer.batchDraw(); });

        const skipButtonWidth = playButtonWidth;
        const skipButtonHeight = playButtonHeight;
        const skipButtonX = modalX + modalWidth * 0.7 - skipButtonWidth / 2; 
        const skipButtonY = playButtonY;

        const skipButtonGroup = new Konva.Group({ x: skipButtonX, y: skipButtonY });
        const skipRect = new Konva.Rect({
            width: skipButtonWidth, height: skipButtonHeight, fill: '#F08080',
            cornerRadius: 10, stroke: '#CD5C5C', strokeWidth: 3,
            shadowColor: 'black', shadowBlur: 5, shadowOpacity: 0.2, shadowOffset: {x: 2, y: 2}
        });
        const skipText = new Konva.Text({
            width: skipButtonWidth, height: skipButtonHeight, text: 'SKIP', 
            fontSize: Math.min(stageWidth * 0.025, 25), fill: 'white',
            align: 'center', verticalAlign: 'middle', fontStyle: 'bold',
            listening: false 
        });
        skipButtonGroup.add(skipRect, skipText);
        this.choiceUIGroup.add(skipButtonGroup); 

        skipRect.on('click tap', (evt) => {
            evt.cancelBubble = true; 
            this.choiceUIGroup.visible(false); 
            this.correctAnswers = 0;          
            this.endMinigame(true); 
        });
        skipRect.on('mouseenter', () => { stage.container().style.cursor = 'pointer'; skipRect.fill('#CD5C5C'); this.layer.batchDraw(); });
        skipRect.on('mouseleave', () => { stage.container().style.cursor = 'default'; skipRect.fill('#F08080'); this.layer.batchDraw(); });

        this.choiceUIGroup.visible(true);
        this.layer.batchDraw();
    }


    private showMinigameUI(): void {
        this.choiceUIGroup.visible(false);
        this.minigameUIGroup.visible(true);
        this.generateNewProblem(); 
        this.startTimer();         
        this.setupKeyboardInput(); 
        this.layer.batchDraw(); 
    }

    private generateNewProblem(): void {
        if (!this.problemText) return; 
        const divisor = Math.floor(Math.random() * 9) + 2;
        const quotient = Math.floor(Math.random() * 12) + 1;
        const dividend = divisor * quotient;
        this.currentProblem = { question: `${dividend} ÷ ${divisor}`, answer: quotient };
        this.problemText.text(this.currentProblem.question);
        this.layer.draw();
    }

    private setupKeyboardInput(): void {
        window.removeEventListener('keydown', this.keyboardHandler); 
        window.addEventListener('keydown', this.keyboardHandler);
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (!this.minigameUIGroup.visible() || this.choiceUIGroup.visible() || this.timerInterval === null) return; 
        if (e.key === 'Enter') this.checkAnswer();
        else if (e.key === 'Backspace') {
            this.userInput = this.userInput.slice(0, -1);
            this.updateInputDisplay();
        } else if (e.key >= '0' && e.key <= '9' && this.userInput.length < 5) {
            this.userInput += e.key;
            this.updateInputDisplay();
        }
    }

    private updateInputDisplay(): void {
        if (!this.inputText) return;
        this.inputText.text(this.userInput);
        this.layer.draw();
    }

    private checkAnswer(): void {
        if (this.userInput === '' || !this.feedbackText) return;
        const userAnswer = parseInt(this.userInput);
        this.totalProblems++;

        if (userAnswer === this.currentProblem.answer) {
            this.correctAnswers++; 
            this.showFeedback('Correct! +$1 Tip ✓', '#27ae60'); 
        } else {
            this.showFeedback('Wrong! ✗', '#e74c3c');
        }

        this.updateScore();
        this.userInput = '';
        this.updateInputDisplay();
        setTimeout(() => {
            this.showFeedback('', 'transparent'); 
            this.generateNewProblem();
        }, 800);
    }

    private showFeedback(message: string, color: string): void {
        if (!this.feedbackText) return;
        this.feedbackText.text(message);
        this.feedbackText.fill(color);
        this.layer.draw();
    }

    private updateScore(): void {
        if (!this.scoreText) return;
        this.scoreText.text(`Tips Earned: $${this.correctAnswers}`); 
        this.layer.draw();
    }

    private startTimer(): void {
        if (this.timerInterval !== null) return; 
        this.timerInterval = window.setInterval(() => {
            this.timeRemaining--;
            if (this.timerText) { 
                this.timerText.text(`Time: ${this.timeRemaining}s`);
                if (this.timeRemaining <= 10) this.timerText.fill('#e74c3c');
                else if (this.timeRemaining <= 30) this.timerText.fill('#f39c12');
                this.layer.draw(); 
            }
            if (this.timeRemaining <= 0) {
                this.endMinigame(false); 
            }
        }, 1000);
    }

    private endMinigame(skipped: boolean = false): void {
        if (this.timerInterval !== null) clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        if (this.animationPlayer) {
            this.animationPlayer.stop(); 
        }

        window.removeEventListener('keydown', this.keyboardHandler);
        
        const finalScore = skipped ? 0 : this.correctAnswers;
        const result: MinigameResult = {
            correctAnswers: finalScore,
            totalProblems: this.totalProblems,
            timeRemaining: skipped ? this.timeRemaining : 0
        };
        
        const delay = skipped ? 100 : 500; 
        setTimeout(() => { 
            if (this.onComplete) this.onComplete(result, skipped); 
        }, delay);
    }

    public cleanup(): void {
        if (this.animationPlayer) {
            this.animationPlayer.destroy();
        }
        if (this.timerInterval !== null) clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        window.removeEventListener('keydown', this.keyboardHandler);
        this.choiceUIGroup.destroy(); 
        this.minigameUIGroup.destroy();
    }
}