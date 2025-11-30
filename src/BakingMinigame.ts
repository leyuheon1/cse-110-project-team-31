import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { AnimationPlayer } from './AnimationPlayer'; 
import { ExitButton } from './ui/ExitButton';
import { InfoButton } from './ui/InfoButton';
import { ShuffleButton } from './ui/ShuffleButton';

interface Mistake {
    question: string;
    userAnswer: string;
    correctAnswer: number;
}

export class BakingMinigame {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private config = ConfigManager.getInstance().getConfig();

    private timeRemaining: number;

    private currentProblem!: { question: string; answer: number };
    private correctAnswers: number = 0; 
    private totalProblems: number = 0; 
    private cookiesSold: number; 

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
            x: 0,
            y: stageHeight * 0.05,
            width: stageWidth,
            text: 'Baking Minigame - Solve Problems for Tips!', 
            fontSize: Math.min(stageWidth * 0.028, 34),
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center'
        });
        this.minigameUIGroup.add(title);

        // --- UPDATED: Display score x 5 ---
        this.scoreText = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.12,
            text: `Tips Earned: $${this.correctAnswers * 5}`, 
            fontSize: Math.min(stageWidth * 0.02, 24),
            fill: '#34495e'
        });
        this.minigameUIGroup.add(this.scoreText);

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

        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl';
        });

        // --- UPDATED: Info text ---
        new InfoButton(
            this.stage, 
            this.layer,
            'Solve as many division problems as you can within the time limit to earn bonus tips! \n\nType your answer and press ENTER. \n\nEach correct answer gives you $5 tip. \nGood luck!'
        );

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
    
    private showPlaySkipChoice(): void {
        if (this.animationPlayer) {
            this.animationPlayer.destroy();
        }
        
        this.minigameUIGroup.visible(false); 
        this.choiceUIGroup.destroyChildren(); 

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // --- FIX 1: Removed Dark Overlay (Background remains visible/clear) ---

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
            text: 'SPEED UP THE PROCESS!', 
            fontSize: Math.min(stageWidth * 0.035, 36),
            fontFamily: '"Press Start 2P"', 
            fill: '#F39C12', 
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

        const newBodyText = [
            'Solve the puzzles to bake cookies faster!',
            'Baking faster will result in tips from customers, increasing your earnings!',
            'Skipping will result in no tips earned.'
        ].join('\n\n'); 

        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1, 
            y: subTitle.y() + subTitle.height() + modalHeight * 0.05, 
            width: modalWidth * 0.8, 
            text: newBodyText,
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

        // --- FIX 2: Buttons Closer Together ---
        
        const buttonWidth = modalWidth * 0.2;
        const buttonHeight = modalHeight * 0.15;
        const buttonGap = modalWidth * 0.2; // Space between buttons
        
        const buttonY = modalY + modalHeight - buttonHeight - 40;
        
        // Calculate X positions relative to the center of the modal
        const modalCenterX = modalX + (modalWidth / 2);
        
        // Play Button to the left of center
        const playButtonX = modalCenterX - buttonWidth - (buttonGap / 2);
        // Skip Button to the right of center
        const skipButtonX = modalCenterX + (buttonGap / 2);

        // PLAY BUTTON (Green)
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

        // SKIP BUTTON (Red)
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
            // --- UPDATED: Show +$5 ---
            this.showFeedback('Correct! +$5 Tip ✓', '#27ae60'); 
        } else {
            this.showFeedback('Wrong! ✗', '#e74c3c');
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
        // --- UPDATED: x 5 ---
        this.scoreText.text(`Tips Earned: $${this.correctAnswers * 5}`); 
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

        const headerText = new Konva.Text({
            x: box.x(), y: box.y() + 20,
            width: boxWidth,
            text: "TIME'S UP!",
            fontSize: 30, fontFamily: 'Press Start 2P', fill: '#E67E22', align: 'center'
        });
        this.resultsUIGroup.add(headerText);

        const scoreText = new Konva.Text({
            x: box.x(), y: headerText.y() + 50,
            width: boxWidth,
            // --- UPDATED: Show correct count ---
            text: `Problems Solved: ${this.correctAnswers}`,
            fontSize: 20, fontFamily: 'Press Start 2P', fill: '#333', align: 'center'
        });
        this.resultsUIGroup.add(scoreText);

        let contentY = scoreText.y() + 50;
        
        if (this.mistakes.length === 0) {
            const perfectText = new Konva.Text({
                x: box.x(), y: contentY + 20,
                width: boxWidth,
                text: "Perfect! No mistakes.",
                fontSize: 18, fill: 'green', align: 'center', fontFamily: 'Nunito'
            });
            this.resultsUIGroup.add(perfectText);
        } else {
            const listHeader = new Konva.Text({
                x: box.x() + 30, y: contentY,
                text: "Problems Missed:",
                fontSize: 18, fontStyle: 'bold', fill: '#c0392b', fontFamily: 'Nunito'
            });
            this.resultsUIGroup.add(listHeader);
            contentY += 30;

            this.mistakes.slice(0, 5).forEach(m => {
                const line = `${m.question} = ${m.correctAnswer} (You: ${m.userAnswer})`;
                const item = new Konva.Text({
                    x: box.x() + 30, y: contentY,
                    text: line,
                    fontSize: 16, fill: '#333', fontFamily: 'Nunito'
            });
                this.resultsUIGroup!.add(item);
                contentY += 25;
            });

            if (this.mistakes.length > 5) {
                const more = new Konva.Text({
                    x: box.x() + 30, y: contentY,
                    text: `...and ${this.mistakes.length - 5} more.`,
                    fontSize: 14, fill: '#7f8c8d', fontFamily: 'Nunito'
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
            this.onComplete({
                correctAnswers: this.correctAnswers,
                totalProblems: this.totalProblems,
                timeRemaining: 0
            }, false);
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

    private endMinigame(skipped: boolean = false): void {
        if (this.timerInterval !== null) clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        if (this.animationPlayer) {
            this.animationPlayer.stop(); 
        }

        window.removeEventListener('keydown', this.keyboardHandler);
        
        if (skipped) {
            const result: MinigameResult = {
                correctAnswers: 0,
                totalProblems: this.totalProblems,
                timeRemaining: this.timeRemaining
            };
            setTimeout(() => { 
                if (this.onComplete) this.onComplete(result, skipped); 
            }, 100);
        } else {
            this.showResultsPopup();
        }
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
        if (this.resultsUIGroup) this.resultsUIGroup.destroy();
    }
}