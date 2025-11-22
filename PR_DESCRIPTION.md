# Add Shuffle Button Feature to Minigames

## Summary
This PR adds a shuffle button feature to both the Baking and Cleaning minigames, allowing players to skip problems they're stuck on and try a different one. The feature includes a reusable component, shuffle limit system, and improved game balance.

## Changes

### ✨ New Features

#### 1. Shuffle Button Component (`src/ui/ShuffleButton.ts`)
- Created a reusable `ShuffleButton` component following the same pattern as `ExitButton` and `InfoButton`
- Features:
  - **3-shuffle limit** per minigame session
  - Visual counter showing remaining shuffles
  - Disabled state (grayed out) when shuffles are exhausted
  - Positioned to the right of the input box, vertically centered
  - Teal color scheme (`#16a085`) matching game aesthetics
  - Hover effects for better UX

#### 2. Integration into Minigames
- **CleaningMinigame**: Added shuffle button functionality
  - Refactored existing shuffle implementation to use the new component
  - Shuffle clears user input, feedback, and generates a new multiplication problem
  
- **BakingMinigame**: Added shuffle button functionality
  - Same shuffle behavior as CleaningMinigame
  - Shuffle clears user input, feedback, and generates a new division problem

### 🔧 Improvements

#### Timer Adjustments
- **BakingMinigame**: Changed timer from fixed config value to random 10-20 seconds
  - Provides varied gameplay experience
  - Formula: `Math.floor(Math.random() * 11) + 10`

#### Code Quality
- Extracted shuffle button logic into reusable component
- Removed duplicate code between minigames
- Improved maintainability and consistency

### 🐛 Bug Fixes / Debugging
- Added console logging for config loading to help debug starting balance issues

## Technical Details

### Component API
```typescript
new ShuffleButton(
    stage: Konva.Stage,
    layer: Konva.Layer,
    parentGroup: Konva.Group,
    inputBoxWidth: number,
    inputBoxY: number,
    inputBoxHeight: number,
    onShuffle: () => void,  // Callback for shuffle logic
    spacing: number = 50   // Horizontal spacing from input box
)
```

### Shuffle Behavior
When a player clicks the shuffle button:
1. Decrements shuffle counter (if shuffles remain)
2. Clears current user input
3. Clears any feedback messages
4. Generates a new problem
5. Updates visual display (count and button state)

## User Experience

### Player Benefits
- **Skip difficult problems**: Players can shuffle to a different problem if stuck
- **Strategic resource**: Limited to 3 shuffles, encouraging thoughtful use
- **Clear feedback**: Visual counter shows remaining shuffles
- **Consistent UX**: Same behavior across both minigames

### Visual Design
- Circular button with shuffle icon (⇄)
- Positioned to the right of input box
- Shuffle count displayed below button
- Color changes when disabled (gray)
- Smooth hover effects

## Testing
- ✅ Shuffle button appears in both minigames
- ✅ Shuffle limit (3) enforced correctly
- ✅ Button disables after 3 uses
- ✅ Shuffle clears input and generates new problem
- ✅ Visual feedback updates correctly

## Files Changed
- `src/ui/ShuffleButton.ts` (new file)
- `src/CleaningMinigame.ts` (refactored to use ShuffleButton)
- `src/BakingMinigame.ts` (added ShuffleButton integration)
- `src/GameManager.ts` (added debug logging)

## Future Enhancements
- Consider making shuffle limit configurable
- Add animation/feedback when shuffle is used
- Track shuffle usage in game statistics

