# Cookie Trailer Tycoon

## Overview
**Cookie Trailer Tycoon** is an educational game designed to help players practice arithmethic through an interactive baking simulation. Player will solve math problems involving multiplication and division as they go through the day cycles of buying ingredients, baking cookies, and managing their funds.

---

## Core Game Loop
### Game Flow
1. **Homepage:** Player enters their name and starts the game.  
2. **Storyline Screen:** Introduction to the game’s story.  
3. **How to Play:** Tutorial and instructions accessible anytime via the “?” button.  
4. **Daily Cycle:**
   - **Order List:** Displays the current day’s demand and customer orders.  
   - **Shop Ingredients:** Buy ingredients based on demand and available funds.
      - Ingredients:
         - Flour  
         - Sugar  
         - Butter  
         - Chocolate Chips  
         - Baking Soda  
      - Cannot proceed if funds are insufficient or if ingredients are not enough to fulfill orders.  
   - **View Recipe Button:** Shows the recipe per cookie:
      ```
      3 cups flour  
      1 cup sugar  
      8 tbsp butter  
      1 cup chocolate chips  
      2 tsp baking soda
      ```
   - **Gameplay:** Animation of the baking process.
   - **Minigame 1 — Baking (Division):**
      - Optional: Solve division problems to speed up baking and earn tips.
   - **Minigame 2 — Cleaning (Multiplication):**
      - Optional: Solve multiplication problems to clean dishes.
      - Increases or decreases next day’s demand depending on success.
5. **End-of-Day Summary:** Displays:
   - Total Sales  
   - Expenses  
   - Profit  
   - Tips  
6. **End of Game Conditions:**
   - **Victory:** Player reaches a target cash balance (win threshold).  
   - **Defeat:** Player balance reaches $0 (bankruptcy).  

--- 

## Technical Documentation
For detailed information about architecture, configuration, and development progress, see:

- [Technical Architecture and Configuration](./docs/TechnicalArchitectureAndConfiguration.md)    
- [Development Log](./docs/DevelopmentLog.md)

---

## Installation

```bash
git clone <repository-url>
npm install
```

---

## How To Run
```bash
npm run dev
```

---

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment (Recommended)

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

2. **Push to main/master branch:**
   - The workflow will automatically build and deploy when you push to `main` or `master`
   - You can also manually trigger it from the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

3. **Configure the base path (if needed):**
   - If deploying to a **project page** (e.g., `username.github.io/repository-name`), the base path is already set to `/cse-110-project-team-31/` in `.github/workflows/deploy.yml`
   - If deploying to a **user/organization page** (e.g., `username.github.io`), change `BASE_PATH: /cse-110-project-team-31/` to `BASE_PATH: /` in the workflow file

### Manual Deployment

If you prefer to deploy manually:

```bash
# Build the project
npm run build

# The dist/ folder contains the built files
# You can deploy this folder to GitHub Pages using gh-pages or other methods
```

### Accessing Your Deployed Site

After deployment, your site will be available at:
- **Project page:** `https://[username].github.io/cse-110-project-team-31/`
- **User/Org page:** `https://[username].github.io/`

---

