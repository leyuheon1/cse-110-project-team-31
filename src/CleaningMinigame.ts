import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { ExitButton } from './ui/ExitButton'; 
import { InfoButton } from './ui/InfoButton';
import { ShuffleButton } from './ui/ShuffleButton';

interface Mistake {
    question: string;
    userAnswer: string;
    correctAnswer: number;
}

export class CleaningMinigame {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private config = ConfigManager.getInstance().getConfig();
    
    private timeRemaining: number;
    
    private currentProblem!: { question: string; answer: number };
    private correctAnswers: number = 0;
    private totalProblems: number = 0;

    // --- NEW: Track mistakes ---
    private mistakes: Mistake[] = [];

    private minigameUIGroup: Konva.Group;
    private choiceUIGroup: Konva.Group;
    private resultsUIGroup: Konva.Group | null = null;
    
    private timerText!: Konva.Text;
    private problemText!: Konva.Text;
    private scoreText!: Konva.Text;
    private feedbackText!: Konva.Text;
    private inputText!: Konva.Text;
    private shuffleButton!: ShuffleButton;
    
    private userInput: string = '';
    
    private timerInterval: number | null = null;
    private onComplete: (result: MinigameResult, skipped: boolean) => void; 
    private keyboardHandler: (e: KeyboardEvent) => void;

    private totalDishesToClean: number;
    private originalTotalDishes: number;
    private dishesCleaned: number = 0;

    private readonly TARGET_DISHES = 5;

    constructor(
        stage: Konva.Stage, 
        layer: Konva.Layer,
        totalDishesToClean: number, 
        onComplete: (result: MinigameResult, skipped: boolean) => void 
    ) {
        this.stage = stage;
        this.layer = layer;
        
        this.originalTotalDishes = totalDishesToClean; 
        this.totalDishesToClean = this.TARGET_DISHES;
        
        this.onComplete = onComplete;
        this.timeRemaining = this.config.cleaningTime;
        
        this.keyboardHandler = this.handleKeyPress.bind(this);
        
        this.minigameUIGroup = new Konva.Group({ visible: false, name: 'minigameUI' });
        this.choiceUIGroup = new Konva.Group({ visible: false, name: 'choiceUI' });
        this.layer.add(this.minigameUIGroup);
        this.layer.add(this.choiceUIGroup);

        this.showPlaySkipChoice();
    }

    private showPlaySkipChoice(): void {
        this.choiceUIGroup.destroyChildren();
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();
        const stage = this.stage;

        const modalWidth = stageWidth * 0.7;
        const modalHeight = stageHeight * 0.65; 
        const modalX = (stageWidth - modalWidth) / 2;
        const modalY = (stageHeight - modalHeight) / 2;

        const modalBg = new Konva.Rect({
            x: modalX, y: modalY, width: modalWidth, height: modalHeight,
            fill: '#FFFFFF', 
            cornerRadius: 15, 
            stroke: '#da5552', 
            strokeWidth: 4, 
            shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.3, shadowOffset: {x: 3, y: 3}
        });
        this.choiceUIGroup.add(modalBg);

        const titleText = new Konva.Text({
            x: modalX, y: modalY + modalHeight * 0.1, width: modalWidth,
            text: 'CLEAN UP TIME!', 
            fontSize: Math.min(stageWidth * 0.04, 40), 
            fontFamily: '"Press Start 2P"', 
            fill: '#008B8B', 
            align: 'center', 
            shadowColor: 'white', shadowBlur: 2, shadowOffset: {x: 1, y: 1}
        });
        this.choiceUIGroup.add(titleText);

        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1, 
            y: titleText.y() + titleText.height() + modalHeight * 0.05, 
            width: modalWidth * 0.8,
            text: `You have ${this.originalTotalDishes} dishes to clean from today's sales. This choice affects your reputation!\n\nPLAY: Cleaning boosts your reputation. Solve 5 problems to finish!\n\nSKIP: Customers get sick! This badly hurts your reputation and you receive a fine.`,
            fontSize: Math.min(stageWidth * 0.022, 26), 
            fill: '#333', 
            align: 'center', 
            lineHeight: 1.6, 
            fontFamily: '"Nunito"', 
            fontStyle: 'bold' 
        });
        this.choiceUIGroup.add(explainText);

        const playButtonWidth = modalWidth * 0.25;
        const playButtonHeight = modalHeight * 0.15;
        const playButtonX = modalX + modalWidth * 0.3 - playButtonWidth / 2; 
        
        const playButtonY = explainText.y() + explainText.height() + modalHeight * 0.08;
 
        const playButtonGroup = new Konva.Group({ x: playButtonX, y: playButtonY }); 
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
        const skipButtonY = playButtonY; 

        const skipButtonGroup = new Konva.Group({ x: skipButtonX, y: skipButtonY }); 
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

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        const title = new Konva.Text({
            x: 0,
            y: 30,
            width: stageWidth,
            text: 'Cleaning Dishes - Solve Multiplication Problems!',
            fontSize: 28,
            fill: '#16a085',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(title);

        this.scoreText = new Konva.Text({
            x: 50,
            y: 80,
            text: `Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`,
            fontSize: 20,
            fill: '#16a085'
        });
        this.minigameUIGroup.add(this.scoreText);

        const dishText = new Konva.Text({
            x: stageWidth / 2 - 40,
            y: 150,
            text: '🍽️',
            fontSize: 80
        });
        this.minigameUIGroup.add(dishText);

        this.problemText = new Konva.Text({
            x: 0,
            y: 250,
            width: stageWidth,
            text: '',
            fontSize: 48,
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(this.problemText);

        // Input Box
        const inputBoxWidth = 400;
        const inputBoxY = 350;
        const inputBoxHeight = 70;
        const inputBox = new Konva.Rect({
            x: (stageWidth - inputBoxWidth) / 2,
            y: inputBoxY,
            width: inputBoxWidth,
            height: inputBoxHeight,
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
            x: (stageWidth - inputBoxWidth) / 2 + 10,
            y: inputBoxY + 18,
            text: '',
            fontSize: 36,
            fill: '#2c3e50',
            width: inputBoxWidth - 20,
            align: 'center'
        });
        this.minigameUIGroup.add(this.inputText);

        this.timerText = new Konva.Text({
            x: 0,
            y: inputBoxY + inputBoxHeight + 15, 
            width: stageWidth,
            text: `Time: ${this.timeRemaining}s`,
            fontSize: 24,
            fill: '#27ae60',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(this.timerText);

        this.feedbackText = new Konva.Text({
            x: 0,
            y: inputBoxY + inputBoxHeight + 60, 
            width: stageWidth,
            text: '',
            fontSize: 32,
            fill: '#27ae60',
            align: 'center',
            fontStyle: 'bold'
        });
        this.minigameUIGroup.add(this.feedbackText);

        const instructions = new Konva.Text({
            x: 0,
            y: stageHeight - 150,
            width: stageWidth,
            text: 'Type your answer and press ENTER to clean a dish!',
            fontSize: 20,
            fill: '#7f8c8d',
            align: 'center'
        });
        this.minigameUIGroup.add(instructions);

        const dirtyDishesText = new Konva.Text({
            x: 0,
            y: stageHeight - 100,
            width: stageWidth,
            text: 'Dirty dishes remaining will limit tomorrow\'s capacity!',
            fontSize: 18,
            fill: '#e74c3c',
            fontStyle: 'italic',
            align: 'center'
        });
        this.minigameUIGroup.add(dirtyDishesText);

        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; 
        });

        const infoButton = new InfoButton(
            this.stage, 
            this.layer,
            'Solve as many multiplication problems as you can within the time limit to clean dishes! Type your answer and press ENTER. Each correct answer cleans one dish. Clean all 5 dishes to maximize your reputation!'
        );

        this.shuffleButton = new ShuffleButton(
            this.stage,
            this.layer,
            this.minigameUIGroup,
            inputBoxWidth,
            inputBoxY,
            inputBoxHeight,
            () => this.shuffleProblem(),
            50 
        );
    }

    private shuffleProblem(): void {
        this.userInput = '';
        this.updateInputDisplay();
        this.feedbackText.text('');
        this.generateNewProblem();
        this.layer.draw();
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
                this.updateScore(); 
                setTimeout(() => {
                    this.endMinigame(false); 
                }, 500);
                return;
            }
        } else {
            this.showFeedback('Still Dirty! ✗', '#e74c3c');
            // --- TRACK MISTAKE ---
            this.mistakes.push({
                question: this.currentProblem.question,
                userAnswer: this.userInput,
                correctAnswer: this.currentProblem.answer
            });
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

    // --- NEW: Results Popup ---
    private showResultsPopup(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        this.resultsUIGroup = new Konva.Group();
        
        const overlay = new Konva.Rect({
            width: stageWidth, height: stageHeight, fill: 'black', opacity: 0.5
        });
        const boxWidth = Math.min(600, stageWidth * 0.9);
        const boxHeight = Math.min(500, stageHeight * 0.8);
        const box = new Konva.Rect({
            x: (stageWidth - boxWidth) / 2, y: (stageHeight - boxHeight) / 2,
            width: boxWidth, height: boxHeight,
            fill: 'white', cornerRadius: 15, stroke: '#333', strokeWidth: 2
        });

        this.resultsUIGroup.add(overlay, box);

        const title = this.dishesCleaned >= this.totalDishesToClean ? "ALL DONE!" : "TIME'S UP!";
        const titleColor = this.dishesCleaned >= this.totalDishesToClean ? 'green' : '#E67E22';

        const headerText = new Konva.Text({
            x: box.x(), y: box.y() + 20, width: boxWidth,
            text: title,
            fontSize: 30, fontFamily: 'Press Start 2P', fill: titleColor, align: 'center'
        });
        this.resultsUIGroup.add(headerText);

        const scoreText = new Konva.Text({
            x: box.x(), y: headerText.y() + 50, width: boxWidth,
            text: `Dishes Cleaned: ${this.dishesCleaned}/${this.totalDishesToClean}`,
            fontSize: 20, fontFamily: 'Press Start 2P', fill: '#333', align: 'center'
        });
        this.resultsUIGroup.add(scoreText);

        let contentY = scoreText.y() + 50;
        
        if (this.mistakes.length === 0) {
            const perfectText = new Konva.Text({
                x: box.x(), y: contentY + 20, width: boxWidth,
                text: "No errors. Great job!",
                fontSize: 18, fill: 'green', align: 'center', fontFamily: 'Arial'
            });
            this.resultsUIGroup.add(perfectText);
        } else {
            const listHeader = new Konva.Text({
                x: box.x() + 30, y: contentY,
                text: "Problems Missed:",
                fontSize: 18, fontStyle: 'bold', fill: '#c0392b', fontFamily: 'Arial'
            });
            this.resultsUIGroup.add(listHeader);
            contentY += 30;

            this.mistakes.slice(0, 5).forEach(m => {
                const line = `${m.question} = ${m.correctAnswer} (You: ${m.userAnswer})`;
                const item = new Konva.Text({
                    x: box.x() + 30, y: contentY,
                    text: line, fontSize: 16, fill: '#333', fontFamily: 'Arial'
                });
                this.resultsUIGroup.add(item);
                contentY += 25;
            });

            if (this.mistakes.length > 5) {
                const more = new Konva.Text({
                    x: box.x() + 30, y: contentY,
                    text: `...and ${this.mistakes.length - 5} more.`,
                    fontSize: 14, fill: '#7f8c8d', fontFamily: 'Arial'
                });
                this.resultsUIGroup.add(more);
            }
        }

        const btnWidth = 150;
        const btnHeight = 50;
        const btnGroup = new Konva.Group({
            x: box.x() + (boxWidth - btnWidth) / 2,
            y: box.y() + boxHeight - 80
        });
        const btnRect = new Konva.Rect({
            width: btnWidth, height: btnHeight, fill: '#4CAF50', cornerRadius: 5
        });
        const btnText = new Konva.Text({
            width: btnWidth, height: btnHeight,
            text: "CONTINUE", fontSize: 16, fill: 'white', fontFamily: 'Press Start 2P',
            align: 'center', verticalAlign: 'middle'
        });
        btnGroup.add(btnRect, btnText);

        btnGroup.on('click', () => {
            this.resultsUIGroup?.destroy();
            this.finishEndGame(false);
        });
        
        btnGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            btnRect.fill('#45a049');
            this.layer.draw();
        });
        btnGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            btnRect.fill('#4CAF50');
            this.layer.draw();
        });

        this.resultsUIGroup.add(btnGroup);
        this.layer.add(this.resultsUIGroup);
        this.resultsUIGroup.moveToTop();
        this.layer.draw();
    }

    private finishEndGame(skipped: boolean): void {
        let finalReportedAnswers = this.correctAnswers;
        
        if (!skipped && this.dishesCleaned >= this.TARGET_DISHES) {
             finalReportedAnswers = this.originalTotalDishes;
        }

        const result: MinigameResult = {
            correctAnswers: finalReportedAnswers, 
            totalProblems: this.totalProblems,
            timeRemaining: 0
        };

        this.onComplete(result, skipped);
    }

    private endMinigame(skipped: boolean = false): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        window.removeEventListener('keydown', this.keyboardHandler);

        if (skipped) {
            this.finishEndGame(true);
        } else {
            this.showResultsPopup();
        }
    }

    public cleanup(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
        }
        window.removeEventListener('keydown', this.keyboardHandler);
        this.minigameUIGroup.destroy();
        this.choiceUIGroup.destroy();
        if (this.resultsUIGroup) this.resultsUIGroup.destroy();
    }
}