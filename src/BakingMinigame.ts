import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';

export class BakingMinigame {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private config = ConfigManager.getInstance().getConfig();
    
    private timeRemaining: number;
    private currentProblem: { question: string; answer: number };
    private correctAnswers: number = 0;
    private totalProblems: number = 0;
    
    private timerText: Konva.Text;
    private problemText: Konva.Text;
    private scoreText: Konva.Text;
    private feedbackText: Konva.Text;
    private inputGroup: Konva.Group;
    private inputText: Konva.Text;
    private userInput: string = '';
    
    private timerInterval: number | null = null;
    private onComplete: (result: MinigameResult) => void;

    constructor(stage: Konva.Stage, layer: Konva.Layer, onComplete: (result: MinigameResult) => void) {
        this.stage = stage;
        this.layer = layer;
        this.onComplete = onComplete;
        this.timeRemaining = this.config.bakingTime;
        
        this.setupUI();
        this.generateNewProblem();
        this.startTimer();
        this.setupKeyboardInput();
    }

    private setupUI(): void {
        // Title
        const title = new Konva.Text({
            x: 50,
            y: 30,
            text: 'Baking Minigame - Solve Division Problems!',
            fontSize: 28,
            fill: '#2c3e50',
            fontStyle: 'bold'
        });
        this.layer.add(title);

        // Timer
        this.timerText = new Konva.Text({
            x: 600,
            y: 30,
            text: `Time: ${this.timeRemaining}s`,
            fontSize: 24,
            fill: '#27ae60',
            fontStyle: 'bold'
        });
        this.layer.add(this.timerText);

        // Score
        this.scoreText = new Konva.Text({
            x: 50,
            y: 80,
            text: `Correct: ${this.correctAnswers} / ${this.totalProblems}`,
            fontSize: 20,
            fill: '#34495e'
        });
        this.layer.add(this.scoreText);

        // Problem display
        this.problemText = new Konva.Text({
            x: 300,
            y: 200,
            text: '',
            fontSize: 48,
            fill: '#2c3e50',
            fontStyle: 'bold',
            align: 'center',
            width: 200
        });
        this.layer.add(this.problemText);

        // Input box background
        const inputBox = new Konva.Rect({
            x: 250,
            y: 300,
            width: 300,
            height: 60,
            fill: '#ecf0f1',
            stroke: '#3498db',
            strokeWidth: 3,
            cornerRadius: 5
        });
        this.layer.add(inputBox);

        // Input text
        this.inputText = new Konva.Text({
            x: 260,
            y: 315,
            text: '',
            fontSize: 36,
            fill: '#2c3e50',
            width: 280,
            align: 'center'
        });
        this.layer.add(this.inputText);

        // Feedback text (shows "Correct!" or "Wrong!")
        this.feedbackText = new Konva.Text({
            x: 300,
            y: 400,
            text: '',
            fontSize: 28,
            fill: '#27ae60',
            align: 'center',
            width: 200
        });
        this.layer.add(this.feedbackText);

        // Instructions
        const instructions = new Konva.Text({
            x: 200,
            y: 500,
            text: 'Type your answer and press ENTER',
            fontSize: 18,
            fill: '#7f8c8d',
            align: 'center',
            width: 400
        });
        this.layer.add(instructions);

        this.layer.draw();
    }

    private generateNewProblem(): void {
        // Generate division problems that have whole number answers
        const divisor = Math.floor(Math.random() * 9) + 2; // 2-10
        const quotient = Math.floor(Math.random() * 12) + 1; // 1-12
        const dividend = divisor * quotient;
        
        this.currentProblem = {
            question: `${dividend} ÷ ${divisor}`,
            answer: quotient
        };
        
        this.problemText.text(this.currentProblem.question);
        this.layer.draw();
    }

    private setupKeyboardInput(): void {
        window.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (this.timerInterval === null) return; // Game ended

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
            this.showFeedback('Correct! ✓', '#27ae60');
        } else {
            this.showFeedback('Wrong! ✗', '#e74c3c');
        }

        this.updateScore();
        this.userInput = '';
        this.updateInputDisplay();
        
        // Generate new problem after short delay
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
        this.scoreText.text(`Correct: ${this.correctAnswers} / ${this.totalProblems}`);
        this.layer.draw();
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            this.timeRemaining--;
            this.timerText.text(`Time: ${this.timeRemaining}s`);
            
            // Change color as time runs low
            if (this.timeRemaining <= 10) {
                this.timerText.fill('#e74c3c');
            } else if (this.timeRemaining <= 30) {
                this.timerText.fill('#f39c12');
            }
            
            this.layer.draw();

            if (this.timeRemaining <= 0) {
                this.endMinigame();
            }
        }, 1000);
    }

    private endMinigame(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Remove keyboard listener
        window.removeEventListener('keydown', this.handleKeyPress.bind(this));

        const result: MinigameResult = {
            correctAnswers: this.correctAnswers,
            totalProblems: this.totalProblems,
            timeRemaining: 0
        };

        this.onComplete(result);
    }

    public cleanup(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
        }
        // Note: keyboard listener cleanup is handled in endMinigame
    }
}