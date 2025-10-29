# Cookie Trailer Tykoon




# Oct 28, 2025


## How to install from git

git clone 
npm install konva
npm install --save-dev typescript vite

(needed cause node_modules is not uploaded to git)

## How to run

npm run dev

## Notice

- Cookie recipe is currently set to 1 for every ingredients (needs 1 unit of all ingredients)
- Ingredients needed for cookie is flour, butter, sugar, chocolate chip, baking soda as we have discussed

## Bug Fixes


## Feature addition

- Added images so that designer can work on it (background1.jpg, owl.png, order.png)

- Added How to Play screen

## Feature improvement

- Made everything responsive so that it works across display size (interoperability)




## What needs improvement

- Need to deal with really small display situation. Currently focused on laptop+ display size.

- Add help button. (Need to discuss with the team on what exactly will the help button on each screen will do)

- Need to add database to persist the user

- Need to add login page. 

- Need to add audio (thinking of heoric polonaise for victory screen and funeral march for the loss screen)

- Need to add Cookie recipe screen 

- Talkinb bubble for the owl on the Order screen 

- The size and placement of the images are out of place for Order Screen 

- Need to fix text getting clipped for how to play screen 

- Need some clarification from the team on Cash: $ Customer demand: buy ingredients just start screen 

- There's a funny bug where when you resize the display during baking phase, the whole thing resets. 


## Backlog 

### As a developer, I want to 





# Oct 26, 2025
## Yuheon Joh - Rough sketch

Ingredients for the game will be managed by ingredients.txt so that you don't have to change the code everytime
you want to add, edit or remove ingredient. In the same sense, debug_mode.txt has other game configuration so that
you can easily control the config settings. recipe.json determines the amounts of each ingredient required and base
price of the given bread. (below I explain why it's base price not the final price.)

The game ends in loss if the player goes bankrupt and ends in vicotry if the player meets the pre-determined victory
condition in debug_mode.txt.

First the player is given initial starting fund. Then he buys the ingredients using the initial starting fund. Then
the baking process begins. Set amount of time is given and the more problem he solves in this given time the higher quality 
the bread becomes and also more breads he makes. After the time runs out, the selling phase begins. The player can 
set the price of the bread for the given day. The user can input number and the game will give predictions of demand and
user review. The higher the quality of bread and the lower the price the higher the review becomes which determines
next day's (not the current day) review. Review is cumulative and it becomes harder to move as you progress but fluctuates
much faster early on (will not be implemeneted until the very end of the quarter. In the beginning I think we better
just have a rudimentary review system). Demand is determined by the review. If the user do not have enough bread to sell
that day, the review will go down. If there is a left-over bread, it can be sold the next day but the quality of the bread
will go down. 

After the selling phsae, cleaning dishes phase begins where solving multiplication problem cleans the dishes. 
If there's left over dishes, the user will be limited in how many breads he can bake. After the cleaning dishes phase,
the program calculates if the user's fund meets the victory condition and ends the game if the condition has been met.

There is daily utility/rent bill that's calculated after cleaning dish phase as well so that user doesn't cheat
by not doing anything and indefinitely playing. If the remaining fund goes negative or 0, the player has met the loss condition
and the game will end. 


## Yuheon Joh - What I did and what I haven't done yet

### What I did

- Barebone structure of the game
- Basic game loop (shopping → baking → selling → cleaning)
- Config loading system (debug_mode.txt)


### What I haven't done yet