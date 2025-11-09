/** @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import Konva from 'konva';
import { ShoppingScreen } from './ShoppingScreen';

// Mock the ExitButton module
vi.mock('./ui/ExitButton', () => ({
    ExitButton: vi.fn(function(this: any, stage: any, layer: any, onExit: any) {
        // Mock ExitButton constructor
        this.stage = stage;
        this.layer = layer;
        this.onExit = onExit;
        this.buttonGroup = null;
        this.destroy = vi.fn();
        return this;
    })
}));

describe('ShoppingScreen', () => {
    let stage: Konva.Stage;
    let layer: Konva.Layer;
    let container: HTMLDivElement;
    let onPurchaseComplete: Mock<[Map<string, number>, number], void>;
    let onViewRecipe: Mock<[], void>;
    let shoppingScreen: ShoppingScreen;

    beforeEach(() => {
        // Create a container for the stage
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        document.body.appendChild(container);

        // Create stage and layer
        stage = new Konva.Stage({
            container: container,
            width: 800,
            height: 600
        });
        layer = new Konva.Layer();
        stage.add(layer);

        // Create mock callbacks
        onPurchaseComplete = vi.fn();
        onViewRecipe = vi.fn();

        // Mock alert
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        if (shoppingScreen) {
            shoppingScreen.cleanup();
        }
        if (stage) {
            stage.destroy();
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.restoreAllMocks();
    });

    describe('Constructor and UI Setup', () => {
        it('should create shopping screen with initial state', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            // Check that UI elements are added to the layer
            const children = layer.getChildren();
            expect(children.length).toBeGreaterThan(0);
        });

        it('should display correct day and funds', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                250.50,
                5,
                onPurchaseComplete,
                onViewRecipe
            );

            const texts = layer.find('Text');
            const titleText = texts.find((text: any) => text.text().includes('Day 5'));
            const fundsText = texts.find((text: any) => text.text().includes('$250.50'));

            expect(titleText).toBeDefined();
            expect(fundsText).toBeDefined();
        });

        it('should create all ingredient rows', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const texts = layer.find('Text');
            const ingredientTexts = texts.filter((text: any) => 
                text.text().includes('Flour') ||
                text.text().includes('Sugar') ||
                text.text().includes('Butter') ||
                text.text().includes('Chocolate') ||
                text.text().includes('Baking Soda')
            );

            expect(ingredientTexts.length).toBe(5);
        });

        it('should create view recipe button', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const texts = layer.find('Text');
            const viewRecipeText = texts.find((text: any) => text.text() === 'View Recipe');
            expect(viewRecipeText).toBeDefined();
        });

        it('should create purchase button', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const texts = layer.find('Text');
            const purchaseText = texts.find((text: any) => text.text() === 'PURCHASE');
            expect(purchaseText).toBeDefined();
        });

        it('should display ingredient prices and units correctly', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const texts = layer.find('Text');
            expect(texts.some((text: any) => text.text().includes('$0.50 per cup'))).toBe(true); // Flour
            expect(texts.some((text: any) => text.text().includes('$0.75 per cup'))).toBe(true); // Sugar
            expect(texts.some((text: any) => text.text().includes('$0.25 per tbsp'))).toBe(true); // Butter
        });
    });

    describe('Input Focus and Keyboard Handling', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );
        });

        it('should focus input when clicking on input box', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white' && rect.stroke() === '#3498db'
            );

            expect(inputBoxes.length).toBeGreaterThan(0);
            
            // Simulate click on first input box
            inputBoxes[0].fire('click');
            
            // Check that the stroke changed to focused color
            expect(inputBoxes[0].stroke()).toBe('#27ae60');
            expect(inputBoxes[0].strokeWidth()).toBe(3);
        });

        it('should handle number input', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');

            // Simulate typing numbers
            const event1 = new KeyboardEvent('keydown', { key: '5' });
            window.dispatchEvent(event1);

            const event2 = new KeyboardEvent('keydown', { key: '3' });
            window.dispatchEvent(event2);

            // Find the input text for the first ingredient
            const inputTexts = layer.find('Text').filter((text: any) => {
                const textContent = text.text();
                return textContent.match(/^\d+$/);
            });

            expect(inputTexts.some((text: any) => text.text() === '53')).toBe(true);
        });

        it('should replace initial 0 with first digit', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');

            const event = new KeyboardEvent('keydown', { key: '7' });
            window.dispatchEvent(event);

            const inputTexts = layer.find('Text').filter((text: any) => {
                const textContent = text.text();
                return textContent.match(/^\d+$/);
            });

            expect(inputTexts.some((text: any) => text.text() === '7')).toBe(true);
        });

        it('should handle backspace to delete digits', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');

            // Type some numbers
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));

            // Press backspace
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

            const inputTexts = layer.find('Text').filter((text: any) => {
                const textContent = text.text();
                return textContent.match(/^\d+$/);
            });

            expect(inputTexts.some((text: any) => text.text() === '12')).toBe(true);
        });

        it('should reset to 0 when backspacing all digits', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');

            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

            const inputTexts = layer.find('Text').filter((text: any) => {
                const textContent = text.text();
                return textContent.match(/^\d+$/);
            });

            expect(inputTexts.some((text: any) => text.text() === '0')).toBe(true);
        });

        it('should ignore non-numeric keys', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

            const inputTexts = layer.find('Text').filter((text: any) => {
                const textContent = text.text();
                return textContent.match(/^\d+$/);
            });

            // Should still be 0
            expect(inputTexts[0].text()).toBe('0');
        });

        it('should handle input when no focused input', () => {
            // Don't click any input
            const event = new KeyboardEvent('keydown', { key: '5' });
            
            // Should not throw error
            expect(() => window.dispatchEvent(event)).not.toThrow();
        });

        it('should switch focus between inputs', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white' && rect.stroke() === '#3498db'
            );

            // Focus first input
            inputBoxes[0].fire('click');
            expect(inputBoxes[0].stroke()).toBe('#27ae60');

            // Focus second input
            inputBoxes[1].fire('click');
            expect(inputBoxes[0].stroke()).toBe('#3498db'); // First loses focus
            expect(inputBoxes[1].stroke()).toBe('#27ae60'); // Second gains focus
        });

        it('should focus input when clicking on text', () => {
            const inputTexts = layer.find('Text').filter((text: any) => {
                return text.text() === '0';
            });

            // Click on the text element
            inputTexts[0].fire('click');

            // Check that parent input box is focused
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.stroke() === '#27ae60'
            );
            expect(inputBoxes.length).toBeGreaterThan(0);
        });


    });

    describe('Total Cost Calculation', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );
        });

        it('should start with total cost of $0.00', () => {
            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            expect(totalCostText?.text()).toBe('Total Cost: $0.00');
        });

        it('should update total cost when quantities change', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Focus first input (Flour - $0.50)
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            expect(totalCostText?.text()).toBe('Total Cost: $5.00');
        });

        it('should calculate correct total for multiple ingredients', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Flour: 10 * $0.50 = $5.00
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            // Sugar: 5 * $0.75 = $3.75
            inputBoxes[1].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            expect(totalCostText?.text()).toBe('Total Cost: $8.75');
        });

        it('should show total in green when affordable', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            expect(totalCostText?.fill()).toBe('green');
        });

        it('should show total in red when exceeding funds', () => {
            shoppingScreen.cleanup();
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                5, // Only $5 available
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Try to buy 20 flour at $0.50 each = $10
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            expect(totalCostText?.fill()).toBe('red');
        });

        it('should handle cost calculation for all ingredients', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Flour: 2 * $0.50 = $1.00
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            // Sugar: 2 * $0.75 = $1.50
            inputBoxes[1].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            // Butter: 4 * $0.25 = $1.00
            inputBoxes[2].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));

            // Chocolate: 1 * $3.00 = $3.00
            inputBoxes[3].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

            // Baking Soda: 2 * $0.50 = $1.00
            inputBoxes[4].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            // Total: 1.00 + 1.50 + 1.00 + 3.00 + 1.00 = 7.50
            expect(totalCostText?.text()).toBe('Total Cost: $7.50');
        });
    });

    describe('Purchase Button', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );
        });

        it('should call onPurchaseComplete with correct data on valid purchase', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Add some quantities
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            inputBoxes[1].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

            // Find and click purchase button
            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('click');

            expect(onPurchaseComplete).toHaveBeenCalled();
            const [purchases, totalCost] = onPurchaseComplete.mock.calls[0];
            
            expect(purchases.get('Flour')).toBe(10);
            expect(purchases.get('Sugar')).toBe(5);
            expect(totalCost).toBe(8.75); // 10*0.50 + 5*0.75
        });


        it('should only include non-zero quantities in purchase map', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Only add quantity to first ingredient
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('click');

            const [purchases] = onPurchaseComplete.mock.calls[0];
            expect(purchases.size).toBe(1);
            expect(purchases.get('Flour')).toBe(5);
        });

        it('should call cleanup before onPurchaseComplete', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

            const cleanupSpy = vi.spyOn(shoppingScreen, 'cleanup');

            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('click');

            expect(cleanupSpy).toHaveBeenCalled();
        });

        it('should change cursor on mouseenter', () => {
            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('mouseenter');
            expect(stage.container().style.cursor).toBe('pointer');
        });

        it('should reset cursor on mouseleave', () => {
            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('mouseenter');
            purchaseGroup?.fire('mouseleave');
            expect(stage.container().style.cursor).toBe('default');
        });

        it('should change button color on hover', () => {
            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            }) as Konva.Group;

            const rect = purchaseGroup?.findOne('Rect') as Konva.Rect;
            const initialFill = rect.fill();

            purchaseGroup.fire('mouseenter');
            expect(rect.fill()).toBe('#45a049');

            purchaseGroup.fire('mouseleave');
            expect(rect.fill()).toBe(initialFill);
        });
    });

    describe('View Recipe Button', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );
        });

        it('should call onViewRecipe when clicked', () => {
            const viewRecipeGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'View Recipe');
            });

            const rect = viewRecipeGroup?.findOne('Rect');
            rect?.fire('click');

            expect(onViewRecipe).toHaveBeenCalled();
        });

        it('should call cleanup before onViewRecipe', () => {
            const cleanupSpy = vi.spyOn(shoppingScreen, 'cleanup');

            const viewRecipeGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'View Recipe');
            });

            const rect = viewRecipeGroup?.findOne('Rect');
            rect?.fire('click');

            expect(cleanupSpy).toHaveBeenCalled();
        });

        it('should change cursor on mouseenter', () => {
            const viewRecipeGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'View Recipe');
            });

            const rect = viewRecipeGroup?.findOne('Rect');
            rect?.fire('mouseenter');
            expect(stage.container().style.cursor).toBe('pointer');
        });

        it('should reset cursor on mouseleave', () => {
            const viewRecipeGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'View Recipe');
            });

            const rect = viewRecipeGroup?.findOne('Rect');
            rect?.fire('mouseenter');
            rect?.fire('mouseleave');
            expect(stage.container().style.cursor).toBe('default');
        });

        it('should change color on hover', () => {
            const viewRecipeGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'View Recipe');
            }) as Konva.Group;

            const rect = viewRecipeGroup?.findOne('Rect') as Konva.Rect;
            const originalFill = rect.fill();
            
            rect?.fire('mouseenter');
            expect(rect.fill()).toBe('#fcbf49');
            
            rect?.fire('mouseleave');
            expect(rect.fill()).toBe('#f77f00');
        });
    });

    describe('Cleanup', () => {
        it('should remove keyboard event listener', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
            
            shoppingScreen.cleanup();
            
            expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        it('should clear cursor interval', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            // Focus an input to start cursor interval
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            inputBoxes[0].fire('click');

            const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
            
            shoppingScreen.cleanup();
            
            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('should handle cleanup when no cursor interval exists', () => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            // Don't focus any input
            expect(() => shoppingScreen.cleanup()).not.toThrow();
        });
    });

    describe('Cursor Blinking', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should create blinking cursor when input is focused', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');

            // Find cursor (thin vertical rectangle)
            const cursors = layer.find('Rect').filter((rect: any) => 
                rect.width() === 2 && rect.height() > 10
            );

            expect(cursors.length).toBeGreaterThan(0);
        });

        it('should position cursor after text', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            // Cursor should have moved
            const cursors = layer.find('Rect').filter((rect: any) => 
                rect.width() === 2
            );

            expect(cursors.length).toBeGreaterThan(0);
        });

        it('should remove old cursor when switching focus', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');
            const cursorsAfterFirst = layer.find('Rect').filter((rect: any) => 
                rect.width() === 2
            );
            const firstCursorCount = cursorsAfterFirst.length;

            inputBoxes[1].fire('click');
            const cursorsAfterSecond = layer.find('Rect').filter((rect: any) => 
                rect.width() === 2
            );

            // Should still only have one cursor
            expect(cursorsAfterSecond.length).toBe(firstCursorCount);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );
        });

        it('should handle very large quantities', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            inputBoxes[0].fire('click');
            
            // Type a large number
            '999999'.split('').forEach(digit => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: digit }));
            });

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            expect(totalCostText?.text()).toContain('$');
        });

        it('should handle purchase with zero total cost', () => {
            // Don't enter any quantities, just purchase
            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('click');

            expect(onPurchaseComplete).toHaveBeenCalledWith(
                expect.any(Map),
                0
            );
        });

        it('should handle exact funds match', () => {
            shoppingScreen.cleanup();
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                5, // Exactly $5
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Buy exactly $5 worth (10 flour at $0.50)
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('click');

            expect(onPurchaseComplete).toHaveBeenCalled();
            expect(window.alert).not.toHaveBeenCalled();
        });

        it('should handle different stage sizes', () => {
            stage.width(400);
            stage.height(300);
            
            shoppingScreen.cleanup();
            shoppingScreen = new ShoppingScreen(
                stage,
                layer,
                100,
                1,
                onPurchaseComplete,
                onViewRecipe
            );

            // Should not throw and should create UI elements
            const children = layer.getChildren();
            expect(children.length).toBeGreaterThan(0);
        });

        it('should handle parseInt with invalid input gracefully', () => {
            // This tests the parseInt(ing.inputValue) || 0 logic
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Don't enter anything, just try to purchase
            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            // Should handle empty/invalid inputs as 0
            expect(() => purchaseGroup?.fire('click')).not.toThrow();
        });
    });
});