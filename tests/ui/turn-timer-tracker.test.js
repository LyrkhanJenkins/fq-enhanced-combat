import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import TurnTimerTracker, {TIMER_CLASS} from "../../src/ui/turn-timer-tracker.js";
import TurnTimer, {TURN_TIMER_FLAG} from "../../src/domain/turn-timer.js";
import {MODULE_ID} from "../../src/core/constants.js";

/**
 * Le bandeau du compte à rebours dans le combat tracker.
 *
 * Ce qui est vérifié ici, c'est l'AFFICHAGE : où le bandeau se pose dans le
 * squelette du tracker, ce qu'il montre du temps restant, et le fait que le
 * battement d'affichage s'arrête de lui-même. Le temps restant lui-même appartient
 * à `TurnTimer` — il est simulé.
 */

/**
 * L'instant de départ de tous les tests.
 * @type {number}
 */
const NOW = 1_700_000_000_000;

/**
 * Un squelette de combat tracker, tel que Foundry le rend.
 *
 * @returns {HTMLElement} La racine du tracker, attachée au document.
 */
function makeTracker() {
    const root = document.createElement("section");
    root.innerHTML = `<header class="combat-tracker-header"></header>
        <ol class="combat-tracker"><li class="combatant"></li></ol>
        <footer class="directory-footer"></footer>`;
    document.body.append(root);
    return root;
}

/**
 * Le combat courant, avec l'état du chronomètre inscrit dans son drapeau.
 *
 * @param {object|null} flag - L'état du chronomètre, ou null pour un tour non chronométré.
 *
 * @returns {object} Le combat simulé.
 */
function setCombat(flag) {
    game.combat = {
        id: "combat1",
        flags: flag == null ? {} : {[MODULE_ID]: {[TURN_TIMER_FLAG]: flag}}
    };
    return game.combat;
}

/**
 * Le bandeau posé dans un tracker.
 *
 * @param {HTMLElement} root - La racine du tracker.
 *
 * @returns {HTMLElement|null} Le bandeau, ou null s'il n'y en a pas.
 */
function bannerIn(root) {
    return root.querySelector(`.${TIMER_CLASS}`);
}

/**
 * Le texte d'une zone du bandeau.
 *
 * @param {HTMLElement} banner - Le bandeau.
 * @param {string} part - Le nom de la zone (`label`, `value`).
 *
 * @returns {string} Son texte.
 */
function textOf(banner, part) {
    return banner.querySelector(`.${TIMER_CLASS}-${part}`).textContent;
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    document.body.innerHTML = "";
    TurnTimerTracker.stop();
    vi.spyOn(TurnTimer, "now").mockReturnValue(NOW);
    game.paused = false;
    setCombat({duration: 30_000, expiresAt: NOW + 30_000, remaining: null});
});

afterEach(() => {
    TurnTimerTracker.stop();
});

describe("TurnTimerTracker.render", () => {
    it("pose le bandeau au-dessus de la liste des combattants", () => {
        const root = makeTracker();

        TurnTimerTracker.render(root);

        // Sous l'en-tête du tracker : le bandeau reste visible quand la liste défile.
        expect(bannerIn(root).nextElementSibling.classList.contains("combat-tracker")).toBe(true);
    });

    it("se replie en tête du tracker quand la liste n'est pas là où on l'attend", () => {
        // Le squelette du tracker change d'une version de Foundry à l'autre : un
        // bandeau mal placé vaut mieux qu'un bandeau absent.
        const root = document.createElement("section");
        document.body.append(root);

        TurnTimerTracker.render(root);

        expect(root.firstElementChild.classList.contains(TIMER_CLASS)).toBe(true);
    });

    it("ne pose rien quand le tour n'est pas chronométré", () => {
        setCombat(null);
        const root = makeTracker();

        TurnTimerTracker.render(root);

        expect(bannerIn(root)).toBeNull();
    });

    it("ne laisse jamais deux bandeaux dans un même tracker", () => {
        // Foundry rend le tracker à répétition : le bandeau du rendu précédent ne
        // doit pas s'accumuler avec le nouveau.
        const root = makeTracker();

        TurnTimerTracker.render(root);
        TurnTimerTracker.render(root);

        expect(root.querySelectorAll(`.${TIMER_CLASS}`)).toHaveLength(1);
    });

    it("ne tombe pas sur un tracker absent", () => {
        expect(TurnTimerTracker.render(undefined)).toBeNull();
        expect(TurnTimerTracker.render(null)).toBeNull();
    });
});

describe("affichage du temps restant", () => {
    it("montre le temps restant et la part du tour qui reste", () => {
        setCombat({duration: 60_000, expiresAt: NOW + 45_000, remaining: null});
        const root = makeTracker();

        const banner = TurnTimerTracker.render(root);

        expect(textOf(banner, "value")).toBe("0:45");
        // La largeur relue est normalisée par le navigateur : « 75.0% » devient « 75% ».
        expect(banner.querySelector(`.${TIMER_CLASS}-bar`).style.width).toBe("75%");
    });

    it("arrondit à la seconde supérieure, pour n'annoncer 0:00 qu'épuisé", () => {
        expect(TurnTimerTracker.format(30_000)).toBe("0:30");
        expect(TurnTimerTracker.format(29_001)).toBe("0:30");
        expect(TurnTimerTracker.format(60_000)).toBe("1:00");
        expect(TurnTimerTracker.format(1)).toBe("0:01");
        expect(TurnTimerTracker.format(0)).toBe("0:00");
    });

    it("passe en alerte dans les dernières secondes", () => {
        setCombat({duration: 30_000, expiresAt: NOW + 3_000, remaining: null});
        const root = makeTracker();

        const banner = TurnTimerTracker.render(root);

        expect(banner.classList.contains("is-urgent")).toBe(true);
    });

    it("annonce la pause et fige le décompte", () => {
        setCombat({duration: 30_000, expiresAt: null, remaining: 12_000});
        const root = makeTracker();

        const banner = TurnTimerTracker.render(root);

        expect(banner.classList.contains("is-paused")).toBe(true);
        expect(textOf(banner, "label")).toContain("TurnTimerPaused");
        expect(textOf(banner, "value")).toBe("0:12");
    });

    it("fige l'affichage dès la pause locale, sans attendre le MJ", () => {
        // Entre la pause et l'inscription du reste dans le drapeau par le MJ, il y a
        // un aller-retour : sans cela le décompte continuerait de tomber entre-temps.
        game.paused = true;
        const root = makeTracker();

        const banner = TurnTimerTracker.render(root);

        expect(banner.classList.contains("is-paused")).toBe(true);
        expect(banner.classList.contains("is-urgent")).toBe(false);
    });
});

describe("battement d'affichage", () => {
    it("repeint le décompte à chaque seconde", async () => {
        const root = makeTracker();
        const banner = TurnTimerTracker.render(root);
        expect(textOf(banner, "value")).toBe("0:30");

        TurnTimer.now.mockReturnValue(NOW + 5_000);
        await vi.advanceTimersByTimeAsync(TurnTimerTracker.TICK_INTERVAL);

        expect(textOf(banner, "value")).toBe("0:25");
    });

    it("repeint les deux trackers d'un client qui a détaché sa fenêtre", async () => {
        const sidebar = makeTracker();
        const popout = makeTracker();
        TurnTimerTracker.render(sidebar);
        TurnTimerTracker.render(popout);

        TurnTimer.now.mockReturnValue(NOW + 10_000);
        await vi.advanceTimersByTimeAsync(TurnTimerTracker.TICK_INTERVAL);

        expect(textOf(bannerIn(sidebar), "value")).toBe("0:20");
        expect(textOf(bannerIn(popout), "value")).toBe("0:20");
    });

    it("ne lance qu'un seul battement, quel que soit le nombre de rendus", () => {
        const root = makeTracker();

        TurnTimerTracker.render(root);
        const first = TurnTimerTracker.ticker;
        TurnTimerTracker.render(root);

        expect(TurnTimerTracker.ticker).toBe(first);
    });

    it("retire le bandeau et s'arrête quand le tour cesse d'être chronométré", async () => {
        const root = makeTracker();
        TurnTimerTracker.render(root);

        // Le combat s'est terminé, ou le tour est passé à une créature du MJ.
        setCombat(null);
        await vi.advanceTimersByTimeAsync(TurnTimerTracker.TICK_INTERVAL * 2);

        expect(bannerIn(root)).toBeNull();
        expect(TurnTimerTracker.ticker).toBeNull();
    });

    it("s'arrête quand le tracker est refermé", async () => {
        const root = makeTracker();
        TurnTimerTracker.render(root);

        root.remove();
        await vi.advanceTimersByTimeAsync(TurnTimerTracker.TICK_INTERVAL);

        expect(TurnTimerTracker.ticker).toBeNull();
    });
});
