import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { ExitButton } from './ui/ExitButton'; 
import { InfoButton } from './ui/InfoButton';

export class CleaningMinigame {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private config = ConfigManager.getInstance().getConfig();
    
    private timeRemaining: number;
    private currentProblem: { question: string; answer: number };
    private correctAnswers: number = 0;
    private totalProblems: number = 0;

    // --- UI Groups ---
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

    private totalDishesToClean: number;
    private dishesCleaned: number = 0;

    constructor(
        stage: Konva.Stage, 
        layer: Konva.Layer,
        totalDishesToClean: number,
        onComplete: (result: MinigameResult, skipped: boolean) => void 
    ) {
        this.stage = stage;
        this.layer = layer;
        this.totalDishesToClean = totalDishesToClean;
        this.onComplete = onComplete;
        this.timeRemaining = this.config.cleaningTime;
        
        this.keyboardHandler = this.handleKeyPress.bind(this);
        
        this.minigameUIGroup = new Konva.Group({ visible: false, name: 'minigameUI' });
        this.choiceUIGroup = new Konva.Group({ visible: false, name: 'choiceUI' });
        this.layer.add(this.minigameUIGroup);
        this.layer.add(this.choiceUIGroup);

        this.showPlaySkipChoice();
    }

    // --- THIS METHOD IS UPDATED ---
    private showPlaySkipChoice(): void {
        this.choiceUIGroup.destroyChildren();
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();
        const stage = this.stage;

        const modalWidth = stageWidth * 0.7;
        const modalHeight = stageHeight * 0.65; // Slightly taller for more text
        const modalX = (stageWidth - modalWidth) / 2;
        const modalY = (stageHeight - modalHeight) / 2;

        const modalBg = new Konva.Rect({
            x: modalX, y: modalY, width: modalWidth, height: modalHeight,
            fill: '#FFFFFF', // <-- CHANGED
            cornerRadius: 15, // <-- CHANGED
            stroke: '#da5552', // <-- CHANGED
            strokeWidth: 4, // <-- CHANGED
            shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.3, shadowOffset: {x: 3, y: 3}
        });
        this.choiceUIGroup.add(modalBg);

        const titleText = new Konva.Text({
            x: modalX, y: modalY + modalHeight * 0.1, width: modalWidth,
            text: 'CLEAN UP TIME!', 
            fontSize: Math.min(stageWidth * 0.04, 40), 
            fontFamily: '"Press Start 2P"', // <-- CHANGED
            fill: '#008B8B', // Kept original teal color for theme
            align: 'center', 
            shadowColor: 'white', shadowBlur: 2, shadowOffset: {x: 1, y: 1}
        });
        this.choiceUIGroup.add(titleText);

        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1, 
            y: titleText.y() + titleText.height() + modalHeight * 0.05, // <-- CHANGED
            width: modalWidth * 0.8,
            text: `You have ${this.totalDishesToClean} dishes to clean from today's sales. This choice affects your reputation!\n\nPLAY: Cleaning boosts your reputation, leading to more customers tomorrow. A perfect job gives an extra boost!\n\nSKIP: Customers get sick! This badly hurts your reputation (fewer customers) and you receive a $50 fine.`,
            fontSize: Math.min(stageWidth * 0.022, 26), // <-- CHANGED (made bigger)
            fill: '#333', 
            align: 'center', 
            lineHeight: 1.6, // <-- CHANGED
            fontFamily: '"Nunito"', // <-- CHANGED
            fontStyle: 'bold' // <-- CHANGED
        });
        this.choiceUIGroup.add(explainText);

        const playButtonWidth = modalWidth * 0.25;
        const playButtonHeight = modalHeight * 0.15;
        const playButtonX = modalX + modalWidth * 0.3 - playButtonWidth / 2; 
        
        // <-- CHANGED: Button Y is now dynamic
        const playButtonY = explainText.y() + explainText.height() + modalHeight * 0.08;
 
        const playButtonGroup = new Konva.Group({ x: playButtonX, y: playButtonY }); // <-- CHANGED 
        const playRect = new Konva.Rect({
            width: playButtonWidth, height: playButtonHeight, fill: '#90EE90',
            cornerRadius: 10, stroke: '#2E8B57', strokeWidth: 3,
        });
        const playText = new Konva.Text({
            width: playButtonWidth, height: playButtonHeight, text: 'PLAY', 
            fontSize: Math.min(stageWidth * 0.025, 25), fill: 'white',
            align: 'center', verticalAlign: 'middle', fontStyle: 'bold', listening: false
        });
        playButtonGroup.add(playRect, playText);
        this.choiceUIGroup.add(playButtonGroup);

        playRect.on('click tap', () => {
            this.choiceUIGroup.visible(false); 
            this.showMinigameUI();           
        });
        playRect.on('mouseenter', () => { stage.container().style.cursor = 'pointer'; playRect.fill('#3CB371'); this.layer.batchDraw(); });
        playRect.on('mouseleave', () => { stage.container().style.cursor = 'default'; playRect.fill('#90EE90'); this.layer.batchDraw(); });

        const skipButtonWidth = playButtonWidth;
        const skipButtonHeight = playButtonHeight;
        const skipButtonX = modalX + modalWidth * 0.7 - skipButtonWidth / 2; 
        const skipButtonY = playButtonY; // <-- CHANGED (to match play button Y)

        const skipButtonGroup = new Konva.Group({ x: skipButtonX, y: skipButtonY }); // <-- CHANGED
        const skipRect = new Konva.Rect({
            width: skipButtonWidth, height: skipButtonHeight, fill: '#F08080',
            cornerRadius: 10, stroke: '#CD5C5C', strokeWidth: 3,
        });
        const skipText = new Konva.Text({
            width: skipButtonWidth, height: skipButtonHeight, text: 'SKIP', 
            fontSize: Math.min(stageWidth * 0.025, 25), fill: 'white',
            align: 'center', verticalAlign: 'middle', fontStyle: 'bold', listening: false
        });
        skipButtonGroup.add(skipRect, skipText);
        this.choiceUIGroup.add(skipButtonGroup);

        skipRect.on('click tap', () => {
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
        this.minigameUIGroup.visible(true);
        this.setupUI(); 
        this.generateNewProblem();
        this.startTimer();
        this.setupKeyboardInput();
        this.layer.batchDraw();
    }

    // This is the UI for the minigame itself, not the popup
    // As I mentioned before, this part uses static pixel values
    // It will not be responsive like the popups
    private setupUI(): void {
        const title = new Konva.Text({
            x: 50,
            y: 30,
            text: 'Cleaning Dishes - Solve Multiplication Problems!',
            fontSize: 28,
            fill: '#16a085',
            fontStyle: 'bold'
        });
        this.minigameUIGroup.add(title);

        this.timerText = new Konva.Text({
            x: 1400,
            y: 30,
            text: `Time: ${this.timeRemaining}s`,
            fontSize: 24,
            fill: '#27ae60',
            fontStyle: 'bold'
        });
        this.minigameUIGroup.add(this.timerText);

        this.scoreText = new Konva.Text({
            x: 50,
            y: 80,
            text: `Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`,
            fontSize: 20,
            fill: '#16a085'
        });
        this.minigameUIGroup.add(this.scoreText);

        const dishText = new Konva.Text({
            x: 700,
            y: 150,
            text: '🍽️',
            fontSize: 80
        });
        this.minigameUIGroup.add(dishText);

        this.problemText = new Konva.Text({
            x: 650,
            y: 300,
            text: '',
            fontSize: 48,
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center',
            width: 300
        });
        this.minigameUIGroup.add(this.problemText);

        const inputBox = new Konva.Rect({
            x: 600,
            y: 400,
            width: 400,
            height: 70,
            fill: '#ffffff',
            stroke: '#16a085',
            strokeWidth: 4,
            cornerRadius: 8,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOpacity: 0.2
        });
        this.minigameUIGroup.add(inputBox);

        this.inputText = new Konva.Text({
            x: 610,
            y: 418,
            text: '',
            fontSize: 36,
            fill: '#2c3e50',
            width: 380,
            align: 'center'
        });
        this.minigameUIGroup.add(this.inputText);

        this.feedbackText = new Konva.Text({
            x: 650,
            y: 520,
            text: '',
            fontSize: 32,
            fill: '#27ae60',
            align: 'center',
            width: 300,
            fontStyle: 'bold'
        });
        this.minigameUIGroup.add(this.feedbackText);

        const instructions = new Konva.Text({
            x: 550,
            y: 650,
            text: 'Type your answer and press ENTER to clean a dish!',
            fontSize: 20,
            fill: '#7f8c8d',
            align: 'center',
            width: 500
        });
        this.minigameUIGroup.add(instructions);

        const dirtyDishesText = new Konva.Text({
            x: 50,
            y: 850,
            text: 'Dirty dishes remaining will limit tomorrow\'s capacity!',
            fontSize: 18,
            fill: '#e74c3c',
            fontStyle: 'italic'
        });
        this.minigameUIGroup.add(dirtyDishesText);

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; //go to login page
        });

        //Info Button
        const infoButton = new InfoButton(
            this.stage, 
            this.layer,
            'Solve as many multiplication problems as you can within the time limit to clean dishes! Type your answer and press ENTER. Each correct answer cleans one dish. Clean all dishes to maximize your reputation!'
        );
    }

    private generateNewProblem(): void {
        const num1 = Math.floor(Math.random() * 12) + 1; 
        const num2 = Math.floor(Math.random() * 12) + 1; 
        
        this.currentProblem = {
            question: `${num1} × ${num2}`,
            answer: num1 * num2
        };
        
        this.problemText.text(this.currentProblem.question);
        this.layer.draw();
    }

    private setupKeyboardInput(): void {
        window.addEventListener('keydown', this.keyboardHandler);
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (this.timerInterval === null || !this.minigameUIGroup.visible()) return;

        if (e.key === 'Enter') {
            this.checkAnswer();
        } else if (e.key === 'Backspace') {
            this.userInput = this.userInput.slice(0, -1);
            this.updateInputDisplay();
        } else if (e.key >= '0' && e.key <= '9') {
            this.userInput += e.key;
            this.updateInputDisplay();
        }
    }

    private updateInputDisplay(): void {
        this.inputText.text(this.userInput);
        this.layer.draw();
    }

    private checkAnswer(): void {
        if (this.userInput === '') return;

        const userAnswer = parseInt(this.userInput);
        this.totalProblems++;

        if (userAnswer === this.currentProblem.answer) {
            this.correctAnswers++;
            this.dishesCleaned++;
            this.showFeedback('Clean! ✓', '#27ae60');
            
            if (this.dishesCleaned >= this.totalDishesToClean) {
                setTimeout(() => {
                    this.endMinigame(false); 
                }, 500);
                return;
            }
        } else {
            this.showFeedback('Still Dirty! ✗', '#e74c3c');
        }

        this.updateScore();
        this.userInput = '';
        this.updateInputDisplay();
        
        setTimeout(() => {
            this.feedbackText.text('');
            this.generateNewProblem();
            this.layer.draw();
        }, 500);
    }

    private showFeedback(message: string, color: string): void {
        this.feedbackText.text(message);
        this.feedbackText.fill(color);
        this.layer.draw();
    }

    private updateScore(): void {
        this.scoreText.text(`Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`);
        this.layer.draw();
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            this.timeRemaining--;
            this.timerText.text(`Time: ${this.timeRemaining}s`);
            
            if (this.timeRemaining <= 10) {
                this.timerText.fill('#e74c3c');
            } else if (this.timeRemaining <= 20) {
                this.timerText.fill('#f39c12');
            }
            
            this.layer.draw();

            if (this.timeRemaining <= 0) {
                this.endMinigame(false); 
            }
        }, 1000);
    }

    private endMinigame(skipped: boolean = false): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        window.removeEventListener('keydown', this.keyboardHandler);

        const result: MinigameResult = {
            correctAnswers: this.correctAnswers, 
            totalProblems: this.totalProblems,
            timeRemaining: 0
        };

        this.onComplete(result, skipped); 
    }

    public cleanup(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
        }
        window.removeEventListener('keydown', this.keyboardHandler);
        this.minigameUIGroup.destroy();
        this.choiceUIGroup.destroy();
    }
}