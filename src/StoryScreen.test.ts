/** @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import Konva from 'konva';
import { ShoppingScreen } from './ShoppingScreen';

vi.mock('./ui/ExitButton', () => ({
    ExitButton: vi.fn(function(this: any, stage: any, layer: any, onExit: any) {
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
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        document.body.appendChild(container);

        stage = new Konva.Stage({
            container: container,
            width: 800,
            height: 600
        });
        layer = new Konva.Layer();
        stage.add(layer);

        onPurchaseComplete = vi.fn();
        onViewRecipe = vi.fn();
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        if (shoppingScreen) shoppingScreen.cleanup();
        if (stage) stage.destroy();
        if (container && container.parentNode) document.body.removeChild(container);
        vi.restoreAllMocks();
    });

    // ... (Constructor tests omitted for brevity, they remain largely the same) ...

    describe('Total Cost Calculation', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage, layer, 100, 1, 0, [], onPurchaseComplete, onViewRecipe
            );
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
            
            // Flour (Index 0): 10 * $0.50 = $5.00
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            // Sugar (Now Index 2): 5 * $0.75 = $3.75
            // Note: Index 1 is now Butter
            inputBoxes[2].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            expect(totalCostText?.text()).toBe('Total Cost: $8.75');
        });

        // ... (Other tests) ...

        it('should handle cost calculation for all ingredients', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Flour (0): 2 * $0.50 = $1.00
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            // Butter (1): 4 * $0.25 = $1.00  <-- Updated Index
            inputBoxes[1].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));

            // Sugar (2): 2 * $0.75 = $1.50   <-- Updated Index
            inputBoxes[2].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            // Chocolate (3): 1 * $3.00 = $3.00
            inputBoxes[3].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

            // Baking Soda (4): 2 * $0.50 = $1.00
            inputBoxes[4].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

            const totalCostText = layer.find('Text').find((text: any) => 
                text.text().includes('Total Cost')
            );
            
            // Total: 1.00 + 1.00 + 1.50 + 3.00 + 1.00 = 7.50
            expect(totalCostText?.text()).toBe('Total Cost: $7.50');
        });
    });

    describe('Purchase Button', () => {
        beforeEach(() => {
            shoppingScreen = new ShoppingScreen(
                stage, layer, 100, 1, 0, [], onPurchaseComplete, onViewRecipe
            );
        });

        it('should call onPurchaseComplete with correct data on valid purchase', () => {
            const inputBoxes = layer.find('Rect').filter((rect: any) => 
                rect.fill() === 'white'
            );
            
            // Flour (0): 10 units
            inputBoxes[0].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

            // Sugar (2): 5 units
            inputBoxes[2].fire('click');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

            const purchaseGroup = layer.getChildren().find((child: any) => {
                const texts = child.find ? child.find('Text') : [];
                return texts.some((text: any) => text.text() === 'PURCHASE');
            });

            purchaseGroup?.fire('click');

            expect(onPurchaseComplete).toHaveBeenCalled();
            const [purchases, totalCost] = onPurchaseComplete.mock.calls[0];
            
            expect(purchases.get('Flour')).toBe(10);
            expect(purchases.get('Sugar')).toBe(5);
            expect(totalCost).toBe(8.75);
        });
    });
});