// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

function createKonvaMock() {
  class Base {
    config: any;
    children: any[] = [];
    parent: any = null;
    constructor(cfg: any = {}) {
      this.config = { ...cfg };
    }
    add(node: any) {
      node.parent = this;
      this.children.push(node);
      return this;
    }
    getChildren() {
      return this.children;
    }
    getParent() {
      return this.parent;
    }
    remove() {
      if (this.parent) {
        this.parent.children = this.parent.children.filter((c: any) => c !== this);
      }
    }
  }
  class Stage extends Base {
    containerEl: any;
    constructor(cfg: any) {
      super(cfg);
      this.containerEl = cfg.container || { style: {} };
    }
    width(val?: number) {
      if (val !== undefined) this.config.width = val;
      return this.config.width ?? 800;
    }
    height(val?: number) {
      if (val !== undefined) this.config.height = val;
      return this.config.height ?? 600;
    }
    container() {
      return this.containerEl;
    }
  }
  class Layer extends Base {
    draw = vi.fn();
    batchDraw = vi.fn();
  }
  class Group extends Base {}
  class Rect extends Base {
    width(val?: number) {
      if (val !== undefined) this.config.width = val;
      return this.config.width ?? 0;
    }
    height(val?: number) {
      if (val !== undefined) this.config.height = val;
      return this.config.height ?? 0;
    }
    x(val?: number) {
      if (val !== undefined) this.config.x = val;
      return this.config.x ?? 0;
    }
    y(val?: number) {
      if (val !== undefined) this.config.y = val;
      return this.config.y ?? 0;
    }
  }
  class Text extends Base {
    text(val?: string) {
      if (val !== undefined) this.config.text = val;
      return this.config.text ?? "";
    }
    width(val?: number) {
      if (val !== undefined) this.config.width = val;
      return this.config.width ?? 0;
    }
    height(val?: number) {
      if (val !== undefined) this.config.height = val;
      return this.config.height ?? 0;
    }
  }
  class Image extends Base {
    image(val?: any) {
      if (val !== undefined) this.config.image = val;
      return this.config.image;
    }
    width(val?: number) {
      if (val !== undefined) this.config.width = val;
      return this.config.width ?? 0;
    }
    height(val?: number) {
      if (val !== undefined) this.config.height = val;
      return this.config.height ?? 0;
    }
    moveToBottom() {}
  }
  return { default: { Stage, Layer, Group, Rect, Text, Image } };
}

const lastShopping: {
  onPurchaseComplete?: Function;
  onViewRecipe?: Function;
} = {};

function setupMocks(options: { animResolves?: boolean; backgroundFails?: boolean } = {}) {
  // Audio stub
  class FakeAudio {
    loop = false;
    volume = 1;
    currentTime = 0;
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
  }
  vi.stubGlobal("Audio", FakeAudio as any);

  // Image stub
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 100;
      height = 50;
      set src(val: string) {
        if (options.backgroundFails || val.includes("fail")) {
          this.onerror?.();
        } else {
          this.onload?.();
        }
      }
    }
  );

  const konvaMock = createKonvaMock();
  vi.doMock("konva", () => konvaMock);

  vi.doMock("./config", () => ({
    ConfigManager: {
      getInstance: () => ({
        getConfig: () => ({
          startingFunds: 100,
          winThreshold: 150,
          bankruptcyThreshold: -50,
          flourPriceMin: 0,
          flourPriceMax: 0,
          bakingTime: 0,
          cleaningTime: 0,
          maxBreadCapacity: 20,
          divisionProblems: 0,
          multiplicationProblems: 0,
          cookiePrice: 10,
        }),
      }),
    },
  }));

  vi.doMock("./AnimationPlayer", () => ({
    AnimationPlayer: class {
      start = vi.fn();
      destroy = vi.fn();
      load() {
        return options.animResolves === false ? Promise.reject("fail") : Promise.resolve();
      }
    },
  }));

  vi.doMock("./BakingMinigame", () => ({
    BakingMinigame: class {
      cb: any;
      cleanup = vi.fn();
      constructor(_s: any, _l: any, _c: number, cb: any) {
        this.cb = cb;
      }
    },
  }));

  vi.doMock("./CleaningMinigame", () => ({
    CleaningMinigame: class {
      cb: any;
      cleanup = vi.fn();
      constructor(_s: any, _l: any, _d: number, cb: any) {
        this.cb = cb;
      }
    },
  }));

  // Simple no-op screens
  ["HowToPlayScreen", "StoryScreen", "OrderScreen", "RecipeBookScreen", "DaySummaryScreen", "VictoryScreen", "LoseScreen", "LoginScreen"].forEach(
    (mod) => {
      vi.doMock(`./${mod}`, () => ({
        [mod]: class {
          volumeChangeCallback?: (v: number) => void;
          constructor(...args: any[]) {
            // capture callbacks if present
            const last = args[args.length - 1];
            if (typeof last === "function") {
              (this as any).cb = last;
            }
          }
          setVolume(_v: number) {}
        },
      }));
    }
  );

  vi.doMock("./ShoppingScreen", () => ({
    ShoppingScreen: class {
      cleanup = vi.fn();
      constructor(
        _s: any,
        _l: any,
        _funds: number,
        _day: number,
        _demand: number,
        _orders: any,
        onPurchaseComplete: any,
        onViewRecipe: any
      ) {
        lastShopping.onPurchaseComplete = onPurchaseComplete;
        lastShopping.onViewRecipe = onViewRecipe;
      }
      getIngredientValues() {
        return new Map([["Flour", "5"]]);
      }
    },
  }));
}

describe("GameManager coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    lastShopping.onPurchaseComplete = undefined;
    lastShopping.onViewRecipe = undefined;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const makeContainer = () => {
    const container = document.createElement("div") as HTMLDivElement;
    Object.defineProperty(container, "offsetWidth", { value: 800 });
    Object.defineProperty(container, "offsetHeight", { value: 600 });
    return container;
  };

  it("covers primary flows and calculations", async () => {
    setupMocks();
    const { GameManager } = await import("./GameManager");
    const gm: any = new GameManager(makeContainer());
    gm.audioUnlocked = true;

    // Music switch cases
    gm.currentPhase = 0; // LOGIN
    gm.updateBackgroundMusic();
    gm.currentPhase = 6; // SHOPPING
    gm.updateBackgroundMusic();
    gm.currentPhase = 11; // VICTORY
    gm.updateBackgroundMusic();

    gm.handleResize(makeContainer());

    // Shopping phase and callbacks
    gm.renderShoppingPhase();
    const purchase = new Map([
      ["Flour", 3],
      ["Sugar", 1],
      ["Butter", 8],
      ["Chocolate", 1],
      ["Baking Soda", 2],
    ]);
    lastShopping.onPurchaseComplete?.(purchase, 10);
    lastShopping.onViewRecipe?.();

    // Baking calculations
    gm.player.ingredients = new Map([
      ["Flour", 9],
      ["Sugar", 3],
      ["Butter", 8],
      ["Chocolate", 2],
      ["Baking Soda", 2],
    ]);
    gm.player.currentDayDemand = 2;
    gm.renderBakingPhase();
    // trigger baking completion through the captured callback
    (gm as any).currentBakingMinigameInstance.cb({ correctAnswers: 2 }, false);

    // Cleaning completion paths
    gm.renderCleaningPhase();
    const cleaningCb =
      (gm as any).currentCleaningMinigame?.cb ??
      vi.fn();
    (gm as any).currentCleaningMinigame = { cb: cleaningCb };
    cleaningCb({ correctAnswers: 0 }, true);
    cleaningCb({ correctAnswers: 5 }, false);

    // Summary outcome branches
    gm.player.funds = 200;
    gm.renderDaySummaryPhase();
    gm.player.funds = -10;
    gm.player.ingredients.clear();
    expect(gm.checkBankruptcy()).toBe(true);
    gm.renderGameOverPhase();

    // Victory/defeat screens
    gm.renderVictoryPhase();
    gm.renderLosePhase();

    gm.player.ingredients = new Map([
      ["Flour", 3],
      ["Sugar", 1],
      ["Butter", 8],
      ["Chocolate", 1],
      ["Baking Soda", 2],
    ]);
    expect(gm.calculateMaxCookies()).toBeGreaterThanOrEqual(0);
    expect(gm.canMakeCookies()).toBe(true);
    gm.resetGame();
  });

  it("covers animation failures and background load error", async () => {
    setupMocks({ animResolves: false, backgroundFails: true });
    const { GameManager } = await import("./GameManager");
    const gm: any = new GameManager(makeContainer());
    gm.audioUnlocked = true;

    // Animation load rejections
    await gm.renderPostBakingAnimation();
    await gm.renderNewDayAnimation();

    // Cleanup with active references
    gm.currentBakingMinigameInstance = { cleanup: vi.fn() };
    gm.currentCleaningMinigame = { cleanup: vi.fn() };
    gm.postBakingAnimation = { destroy: vi.fn() };
    gm.newDayAnimation = { destroy: vi.fn() };
    gm.backgroundImage = new (await import("konva")).default.Image();
    gm.layer.add(gm.backgroundImage);
    gm.cleanupCurrentPhase();

    // Bankruptcy false branch
    gm.player.ingredients.set("Flour", 100);
    gm.player.ingredients.set("Sugar", 100);
    expect(gm.checkBankruptcy()).toBe(false);
  });

  it("exercises renderCurrentPhase branches and music gating", async () => {
    setupMocks();
    const { GameManager } = await import("./GameManager");
    const { GamePhase } = await import("./types");
    const konva = (await import("konva")).default as any;
    const gm: any = new GameManager(makeContainer());

    // unlock audio via event listeners
    window.dispatchEvent(new Event("pointerdown"));
    expect(gm.audioUnlocked).toBe(true);

    // cover playBGM null path and unknown phase music
    gm.playBGM?.(null);
    gm.currentPhase = -1 as any;
    gm.updateBackgroundMusic();

    // add background image then render an in-game phase that should keep it
    gm.backgroundImage = new konva.Image();
    gm.layer.add(gm.backgroundImage);
    gm.currentPhase = GamePhase.ORDER;
    gm.renderCurrentPhase();

    // cover remaining phase switch cases
    const phases = [
      GamePhase.LOGIN,
      GamePhase.STORYLINE,
      GamePhase.HOW_TO_PLAY,
      GamePhase.RECIPE_BOOK,
      GamePhase.BAKING,
      GamePhase.POST_BAKING_ANIMATION,
      GamePhase.CLEANING,
      GamePhase.DAY_SUMMARY,
      GamePhase.NEW_DAY_ANIMATION,
      GamePhase.VICTORY,
      GamePhase.DEFEAT,
      GamePhase.GAME_OVER,
    ];
    phases.forEach((phase) => {
      gm.currentPhase = phase;
      gm.renderCurrentPhase();
    });

    // shopping path where cookies cannot be made -> cleaning alert path
    vi.stubGlobal("alert", vi.fn());
    gm.player.ingredients.clear();
    gm.player.funds = 0;
    gm.renderShoppingPhase();
    lastShopping.onPurchaseComplete?.(new Map(), 0);

    // baking when no ingredients results in zero dishes
    gm.player.currentDayDemand = 1;
    gm.renderBakingPhase();
    expect(gm.player.dishesToClean).toBe(0);

    // cleanup resize with background present
    const container = document.createElement("div") as HTMLDivElement;
    Object.defineProperty(container, "offsetWidth", { value: 640, configurable: true });
    Object.defineProperty(container, "offsetHeight", { value: 480, configurable: true });
    gm.backgroundImage = new konva.Image();
    gm.layer.add(gm.backgroundImage);
    gm.handleResize(container);
    expect(gm.layer.batchDraw).toHaveBeenCalled();
  });
});
