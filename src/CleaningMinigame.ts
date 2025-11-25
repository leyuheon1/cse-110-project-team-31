import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { ExitButton } from './ui/ExitButton'; 
import { InfoButton } from './ui/InfoButton';
import { ShuffleButton } from './ui/ShuffleButton';

export class CleaningMinigame {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private config = ConfigManager.getInstance().getConfig();
    
    private timeRemaining: number;
    
    private currentProblem!: { question: string; answer: number };
    private correctAnswers: number = 0;
    private totalProblems: number = 0;

    private minigameUIGroup: Konva.Group;
    private choiceUIGroup: Konva.Group;
    
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

        // Directly show choice (Cleaning has no animation sequence)
        this.showPlaySkipChoice();
    }

    private showPlaySkipChoice(): void {
        this.choiceUIGroup.destroyChildren();
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        const modalWidth = stageWidth * 0.7;
        const modalHeight = stageHeight * 0.7;
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
            fontSize: Math.min(stageWidth * 0.035, 36),
            fontFamily: '"Press Start 2P"', 
            fill: '#F39C12', // Matched Baking Gold/Orange
            align: 'center', 
            stroke: '#da5552', 
            strokeWidth: 2,   
            shadowColor: 'black', shadowBlur: 2, shadowOffset: {x: 1, y: 1}
        });
        this.choiceUIGroup.add(titleText);

        const subTitle = new Konva.Text({
            x: modalX, y: titleText.y() + titleText.height() + 5, width: modalWidth,
            text: 'Minigame',
            fontSize: Math.min(stageWidth * 0.015, 18),
            fontFamily: '"Press Start 2P"',
            fill: '#E67E22', 
            align: 'center'
        });
        this.choiceUIGroup.add(subTitle);

        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1, 
            y: subTitle.y() + subTitle.height() + modalHeight * 0.05, 
            width: modalWidth * 0.8,
            text: `You have ${this.originalTotalDishes} dishes to clean.\n\nPLAY: Cleaning boosts your reputation. Solve 5 problems to finish!\n\nSKIP: Customers get sick! This hurts your reputation and causes a fine.`,
            fontSize: Math.min(stageWidth * 0.022, 24), 
            fill: '#333', 
            align: 'center', 
            lineHeight: 1.6, 
            fontFamily: '"Nunito"', 
            fontStyle: 'bold' 
        });
        this.choiceUIGroup.add(explainText);

        const promptText = new Konva.Text({
            x: modalX, 
            y: explainText.y() + explainText.height() + modalHeight * 0.04, 
            width: modalWidth, 
            text: 'Would you like to play?', 
            fontSize: Math.min(stageWidth * 0.022, 22), 
            fill: '#E67E22', 
            align: 'center',
            fontFamily: '"Nunito"', 
            fontStyle: 'bold'      
        });
        this.choiceUIGroup.add(promptText);

        // Buttons Setup (Matched Baking Layout)
        const buttonWidth = modalWidth * 0.2;
        const buttonHeight = modalHeight * 0.15;
        const buttonGap = modalWidth * 0.2; 
        
        const buttonY = modalY + modalHeight - buttonHeight - 40;
        const modalCenterX = modalX + (modalWidth / 2);
        
        const playButtonX = modalCenterX - buttonWidth - (buttonGap / 2);
        const skipButtonX = modalCenterX + (buttonGap / 2);

        // PLAY BUTTON
        const playButtonGroup = new Konva.Group({ x: playButtonX, y: buttonY }); 
        const playRect = new Konva.Rect({
            width: buttonWidth, height: buttonHeight, 
            fill: '#4CAF50', 
            cornerRadius: 10, 
            shadowColor: 'black', shadowBlur: 5, shadowOpacity: 0.2, shadowOffset: {x: 2, y: 2}
        });
        const playText = new Konva.Text({
            width: buttonWidth, height: buttonHeight, text: 'PLAY', 
            fontSize: Math.min(stageWidth * 0.08, 24), 
            fill: 'white',
            align: 'center', verticalAlign: 'middle', 
            fontFamily: '"Press Start 2P"', 
            listening: false 
        });
        playButtonGroup.add(playRect, playText);
        this.choiceUIGroup.add(playButtonGroup); 

        playButtonGroup.on('click tap', (evt) => {
            evt.cancelBubble = true; 
            this.choiceUIGroup.visible(false); 
            this.showMinigameUI();           
        });
        playButtonGroup.on('mouseenter', () => { 
            this.stage.container().style.cursor = 'pointer'; 
            playRect.fill('#45a049'); 
            this.layer.batchDraw(); 
        });
        playButtonGroup.on('mouseleave', () => { 
            this.stage.container().style.cursor = 'default'; 
            playRect.fill('#4CAF50'); 
            this.layer.batchDraw(); 
        });

        // SKIP BUTTON
        const skipButtonGroup = new Konva.Group({ x: skipButtonX, y: buttonY }); 
        const skipRect = new Konva.Rect({
            width: buttonWidth, height: buttonHeight, 
            fill: '#e74c3c', 
            cornerRadius: 10, 
            shadowColor: 'black', shadowBlur: 5, shadowOpacity: 0.2, shadowOffset: {x: 2, y: 2}
        });
        const skipText = new Konva.Text({
            width: buttonWidth, height: buttonHeight, text: 'SKIP', 
            fontSize: Math.min(stageWidth * 0.08, 24), 
            fill: 'white',
            align: 'center', verticalAlign: 'middle', 
            fontFamily: '"Press Start 2P"',
            listening: false 
        });
        skipButtonGroup.add(skipRect, skipText);
        this.choiceUIGroup.add(skipButtonGroup); 

        skipButtonGroup.on('click tap', (evt) => {
            evt.cancelBubble = true; 
            this.choiceUIGroup.visible(false); 
            this.correctAnswers = 0;          
            this.endMinigame(true); 
        });
        skipButtonGroup.on('mouseenter', () => { 
            this.stage.container().style.cursor = 'pointer'; 
            skipRect.fill('#c0392b'); 
            this.layer.batchDraw(); 
        });
        skipButtonGroup.on('mouseleave', () => { 
            this.stage.container().style.cursor = 'default'; 
            skipRect.fill('#e74c3c'); 
            this.layer.batchDraw(); 
        });

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

        // 1. Title
        const title = new Konva.Text({
            x: 0,
            y: stageHeight * 0.05,
            width: stageWidth,
            text: 'Cleaning Minigame - Solve Problems to Clean!', 
            fontSize: Math.min(stageWidth * 0.028, 34),
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(title);

        // 2. Score (Dishes)
        this.scoreText = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.12,
            text: `Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`, 
            fontSize: Math.min(stageWidth * 0.02, 24),
            fill: '#34495e'
        });
        this.minigameUIGroup.add(this.scoreText);

        // 3. Problem
        this.problemText = new Konva.Text({
            x: 0,
            y: stageHeight * 0.3,
            width: stageWidth,
            text: '',
            fontSize: Math.min(stageWidth * 0.048, 58),
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(this.problemText);

        // 4. Input Box
        const inputBoxY = stageHeight * 0.45;
        const inputBoxHeight = stageHeight * 0.08;
        
        const inputBox = new Konva.Rect({
            x: stageWidth * 0.35,
            y: inputBoxY,
            width: stageWidth * 0.3,
            height: inputBoxHeight,
            fill: '#ecf0f1',
            stroke: '#3498db',
            strokeWidth: 3,
            cornerRadius: 5
        });
        this.minigameUIGroup.add(inputBox);

        this.inputText = new Konva.Text({
            x: stageWidth * 0.35,
            y: inputBoxY + (inputBoxHeight * 0.2),
            text: '',
            fontSize: Math.min(stageWidth * 0.036, 44),
            fill: '#2c3e50',
            width: stageWidth * 0.3,
            align: 'center'
        });
        this.minigameUIGroup.add(this.inputText);

        // 5. Timer
        this.timerText = new Konva.Text({
            x: 0,
            y: inputBoxY + inputBoxHeight + 20, 
            width: stageWidth,
            text: `Time: ${this.timeRemaining}s`,
            fontSize: Math.min(stageWidth * 0.024, 28),
            fill: '#27ae60',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(this.timerText);

        // 6. Feedback
        this.feedbackText = new Konva.Text({
            x: 0,
            y: inputBoxY + inputBoxHeight + 60, 
            width: stageWidth,
            text: '',
            fontSize: Math.min(stageWidth * 0.028, 34),
            fill: '#27ae60',
            align: 'center'
        });
        this.minigameUIGroup.add(this.feedbackText);

        // 7. Instructions
        const instructions = new Konva.Text({
            x: 0,
            y: stageHeight * 0.75,
            width: stageWidth,
            text: 'Type your answer and press ENTER',
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: '#7f8c8d',
            align: 'center'
        });
        this.minigameUIGroup.add(instructions);

        // Buttons
        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.html'; 
        });

        new InfoButton(
            this.stage, 
            this.layer,
            'Solve multiplication problems to clean dishes! \n\nType your answer and press ENTER. \n\nClean 5 dishes to satisfy your customers!'
        );

        // Shuffle button
        this.shuffleButton = new ShuffleButton(
            this.stage,
            this.layer,
            this.minigameUIGroup,
            stageWidth * 0.3, 
            inputBoxY,
            inputBoxHeight,
            () => this.shuffleProblem(),
            50 
        );
    }

    private shuffleProblem(): void {
        this.userInput = '';
        this.updateInputDisplay();
        
        if (this.feedbackText) {
            this.feedbackText.text('');
        }
        
        this.generateNewProblem();
        this.layer.draw();
    }

    private generateNewProblem(): void {
        if (!this.problemText) return;
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
        window.removeEventListener('keydown', this.keyboardHandler); 
        window.addEventListener('keydown', this.keyboardHandler);
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (!this.minigameUIGroup.visible() || this.choiceUIGroup.visible() || this.timerInterval === null) return;

        if (e.key === 'Enter') {
            this.checkAnswer();
        } else if (e.key === 'Backspace') {
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
            this.dishesCleaned++;
            this.showFeedback('Clean! +1 Dish ✓', '#27ae60');
            
            if (this.dishesCleaned >= this.totalDishesToClean) {
                this.updateScore(); 
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
            if (this.feedbackText) this.feedbackText.text('');
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
        this.scoreText.text(`Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`);
        this.layer.draw();
    }

    private startTimer(): void {
        if (this.timerInterval !== null) return;
        this.timerInterval = window.setInterval(() => {
            this.timeRemaining--;
            if (this.timerText) {
                this.timerText.text(`Time: ${this.timeRemaining}s`);
                
                if (this.timeRemaining <= 10) {
                    this.timerText.fill('#e74c3c');
                } else if (this.timeRemaining <= 30) {
                    this.timerText.fill('#f39c12');
                }
                this.layer.draw();
            }

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

        let finalReportedAnswers = this.correctAnswers;
        
        // If they finished successfully without skipping, report total capacity restored
        if (!skipped && this.dishesCleaned >= this.TARGET_DISHES) {
             finalReportedAnswers = this.originalTotalDishes;
        }

        const result: MinigameResult = {
            correctAnswers: finalReportedAnswers, 
            totalProblems: this.totalProblems,
            timeRemaining: skipped ? this.timeRemaining : 0
        };

        const delay = skipped ? 100 : 500;
        setTimeout(() => {
            if (this.onComplete) this.onComplete(result, skipped); 
        }, delay);
    }

    public cleanup(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        window.removeEventListener('keydown', this.keyboardHandler);
        this.minigameUIGroup.destroy();
        this.choiceUIGroup.destroy();
    }
}