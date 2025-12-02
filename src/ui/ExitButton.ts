/**
 * ExitButton.ts - Reusable Exit Button UI Component
 *
 * PURPOSE:
 * Provides a consistent "EXIT" button in the bottom-left corner of all screens.
 * When clicked, executes a callback (typically redirects to login or quits game).
 *
 * VISUAL APPEARANCE:
 * - Red rounded rectangle button
 * - "EXIT" text in white "Press Start 2P" font
 * - Shadow effect for depth
 * - Hover effect (lightens on mouseover)
 *
 * USAGE:
 * new ExitButton(stage, layer, () => {
 *     // Cleanup code
 *     window.location.href = '/login.html';
 * });
 *
 * POSITIONING:
 * - Bottom-left corner with responsive margins
 * - Size scales with screen dimensions
 *
 * NOTE: This component is used across most game screens for consistency
 */

import Konva from 'konva';

/**
 * ExitButton Class
 *
 * A reusable UI component that renders an exit button in the bottom-left corner.
 * Handles its own event listeners and styling.
 */
export class ExitButton{
    // Konva Group containing the button rectangle and text
    private buttonGroup: Konva.Group;

    /**
     * Constructor
     *
     * Creates and renders an exit button at the bottom-left of the stage.
     *
     * @param stage - The Konva Stage (canvas) to render on
     * @param layer - The Konva Layer to add button to
     * @param onExit - Callback function executed when button is clicked
     */
    constructor(
        private stage: Konva.Stage,
        private layer: Konva.Layer,
        private onExit: () => void,  // Called when user clicks EXIT
    ){
        // Get current stage dimensions for responsive sizing
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Calculate button size (responsive, with max limits)
        // Size is 12% of width (max 110px) by 8% of height (max 40px)
        const buttonWidth = Math.min(stageWidth*0.12, 110);
        const buttonHeight = Math.min(stageHeight*0.08, 40);

        // Calculate margins (3% from left, 4% from bottom)
        const marginX = stageWidth * 0.03;
        const marginY = stageHeight * 0.04;

        // Position button in bottom-left corner
        const x = marginX;  // Left side with margin
        const y = stageHeight - buttonHeight - marginY;  // Bottom with margin

        // Create a Group to hold both rectangle and text together
        this.buttonGroup = new Konva.Group({
            x: x,
            y: y,
        });

        // Create the button rectangle (background)
        const buttonRect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#da5552',
            cornerRadius: 5,
            shadowColor: 'black',
            shadowBlur: 6,
            shadowOpacity: 0.3,
            shadowOffset: { x: 2, y: 2 },
        });

        // Create the button text label
        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'EXIT',                                // Button label
            fontSize: Math.min(stageWidth*0.022, 20),   // Responsive font size (max 20px)
            fontFamily: 'Press Start 2P',               // Retro game font
            fontStyle: 'bold',
            fill: '#FFFFFF',                             // White text
            align: 'center',                             // Horizontally centered
            verticalAlign: 'middle',                     // Vertically centered
            listening: false,                            // Don't capture events (let rect handle it)
        });

        // Add both rectangle and text to the group
        this.buttonGroup.add(buttonRect);
        this.buttonGroup.add(text);

        // HOVER EFFECT: Change color and cursor when mouse enters button
        buttonRect.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';  // Show pointer cursor
            buttonRect.fill('#ff7775');                        // Lighten color on hover
        });

        // HOVER EFFECT: Restore original color when mouse leaves button
        buttonRect.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';  // Restore default cursor
            buttonRect.fill('#da5552');                        // Restore original red
        });

        // CLICK EVENT: Execute callback when button is clicked
        buttonRect.on('click', () => {
            this.onExit();  // Call the onExit callback (e.g., redirect to login)
        });

        // Add the button group to the layer and render
        this.layer.add(this.buttonGroup);
        this.layer.draw();
    }

    /**
     * Destroy Method
     *
     * Removes the button from the layer and cleans up resources.
     * Should be called when transitioning to a new screen.
     */
    public destroy(){
        this.buttonGroup.destroy();  // Remove all children and event listeners
        this.layer.draw();            // Redraw layer without this button
    }
}