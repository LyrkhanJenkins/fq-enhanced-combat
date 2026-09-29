import {beforeEach, describe, expect, it, vi} from "vitest";
import TurnTimer, {
    TURN_TIMER_DURATION_SETTING, TURN_TIMER_FLAG, TURN_TIMER_SETTING
} from "../../src/domain/turn-timer.js";
import {DEATH_SAVE_SETTING} from "../../src/domain/death-save.js";
import {MODULE_ID} from "../../src/core/constants.js";

/**
 * Le compte à rebours du tour.
 *
 * Ce qui est vérifié ici, c'est la RÈGLE : quels tours sont chronométrés, ce que
 * le drapeau du combat porte pour que tous les clients affichent la même chose,
 * ce que la pause en fait, et qui passe la main à l'expiration.
 *
 * Le temps est piloté par `TurnTimer.now` — isolée dans le code précisément pour
 * cela : les échéances sont des instants absolus, un test qui attendrait vraiment
 * soixante secondes n'aurait aucun intérêt. Les comptes à rebours locaux passent
 * par les faux timers de vitest.
 */

/**
 * L'instant de départ de tous les tests, arbitraire mais fixe.
 * @type {number}
 */
const NOW = 1_700_000_000_000;

/**
 * Un combat dont c'est le tour de ce combattant.
 *
 * `setFlag` et `unsetFlag` écrivent dans `flags` comme le ferait Foundry : le
 * module relit l'état qu'il vient d'inscrire (la reprise après pause, notamment).
 *
 * @param {object} [options] - Ce qui distingue ce combat.
 * @param {boolean} [options.player] - Le combattant courant appartient à un joueur.
 * @param {number} [options.hp] - Les points de vie du combattant courant.
 * @param {object|null} [options.flag] - L'état du chronomètre déjà inscrit.
 *
 * @returns {object} Le combat simulé.
 */
function makeCombat({player = true, hp = 10, flag = null} = {}) {
    const actor = {
        id: "actor1",
        name: "Ilda",
        type: "character",
        hasPlayerOwner: player,
        system: {attributes: {hp: {value: hp}, death: {success: 0, failure: 0}}},
        flags: {}
    };
    const combat = {
        id: "combat1",
        combatant: {name: "Ilda", actor},
        flags: flag == null ? {} : {[MODULE_ID]: {[TURN_TIMER_FLAG]: flag}},
        nextTurn: vi.fn(async () => undefined),
        setFlag: vi.fn(async (scope, key, value) => {
            combat.flags[scope] = {...combat.flags[scope], [key]: value};
        }),
        unsetFlag: vi.fn(async (scope, key) => {
            delete combat.flags[scope]?.[key];
        })
    };
    game.combat = combat;
    return combat;
}

/**
 * Les réglages du monde tels que le module les lira.
 *
 * @param {object} [options] - Les réglages à poser.
 * @param {boolean} [options.enabled] - Le chronomètre est activé.
 * @param {number} [options.duration] - La durée d'un tour, en secondes.
 * @param {boolean} [options.deathSave] - Les jets de mort sont activés.
 *
 * @returns {void}
 */
function setSettings({enabled = true, duration = 30, deathSave = false} = {}) {
    const values = {
        [TURN_TIMER_SETTING]: enabled,
        [TURN_TIMER_DURATION_SETTING]: duration,
        [DEATH_SAVE_SETTING]: deathSave
    };
    game.settings.get = vi.fn((namespace, key) =>
        (namespace === MODULE_ID ? values[key] : undefined));
}

/**
 * L'état inscrit dans le drapeau du combat par le module.
 *
 * @param {object} combat - Le combat inspecté.
 *
 * @returns {object|undefined} L'état, ou undefined si le drapeau est absent.
 */
function flagOf(combat) {
    return combat.flags?.[MODULE_ID]?.[TURN_TIMER_FLAG];
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    TurnTimer.cancel();
    vi.spyOn(TurnTimer, "now").mockReturnValue(NOW);
    setSettings();
    game.paused = false;
    // Le module est le premier MJ actif dans la majorité des tests : c'est lui qui
    // écrit le drapeau et passe la main.
    game.user = {id: "gm1", isGM: true};
    game.userId = "gm1";
    game.users = {activeGM: {id: "gm1"}};
});

describe("TurnTimer.watchesTurnOf", () => {
    it("chronomètre le tour d'un combattant appartenant à un joueur", () => {
        const combat = makeCombat({player: true});

        expect(TurnTimer.watchesTurnOf(combat.combatant)).toBe(true);
    });

    it("laisse au MJ les tours qu'il mène lui-même", () => {
        // Un monstre sans propriétaire joueur : le MJ n'a pas à être chronométré.
        const combat = makeCombat({player: false});

        expect(TurnTimer.watchesTurnOf(combat.combatant)).toBe(false);
    });

    it("ne chronomètre pas un combattant à terre quand les jets de mort le prennent en charge", () => {
        // Les jets de mort passent la main en deux secondes : un compte à rebours
        // de trente secondes par-dessus n'aurait rien à décompter.
        setSettings({deathSave: true});
        const combat = makeCombat({hp: 0});

        expect(TurnTimer.watchesTurnOf(combat.combatant)).toBe(false);
    });

    it("chronomètre un combattant à terre quand les jets de mort sont éteints", () => {
        // Personne ne tient son tour : il se joue, donc il se décompte.
        setSettings({deathSave: false});
        const combat = makeCombat({hp: 0});

        expect(TurnTimer.watchesTurnOf(combat.combatant)).toBe(true);
    });

    it("ignore un combattant sans acteur", () => {
        expect(TurnTimer.watchesTurnOf({name: "vide"})).toBe(false);
        expect(TurnTimer.watchesTurnOf(undefined)).toBe(false);
    });
});

describe("TurnTimer.duration", () => {
    it("lit la durée du monde, en millisecondes", () => {
        setSettings({duration: 45});

        expect(TurnTimer.duration()).toBe(45_000);
    });

    it("retombe sur la durée par défaut plutôt que sur un tour de zéro seconde", () => {
        // Un tour de durée nulle expirerait en boucle, sans laisser jouer personne.
        for (const duration of [0, -10, Number.NaN, undefined, "trente"]) {
            game.settings.get = vi.fn((namespace, key) =>
                (namespace === MODULE_ID && key === TURN_TIMER_DURATION_SETTING ? duration : undefined));
            expect(TurnTimer.duration()).toBe(TurnTimer.DEFAULT_DURATION * 1000);
        }
    });

    it("reste muette si le réglage n'est pas enregistré", () => {
        game.settings.get = vi.fn(() => {
            throw new Error("réglage inconnu");
        });

        expect(TurnTimer.duration()).toBe(TurnTimer.DEFAULT_DURATION * 1000);
        expect(TurnTimer.isEnabled()).toBe(false);
    });
});

describe("TurnTimer.rearmForGM", () => {
    it("inscrit l'échéance du tour dans le drapeau du combat", async () => {
        const combat = makeCombat();

        await TurnTimer.rearmForGM(combat);

        // L'échéance est un instant partagé, et non une durée : tous les clients en
        // déduisent le même temps restant, y compris celui qui arrive en cours de tour.
        expect(flagOf(combat)).toEqual({duration: 30_000, expiresAt: NOW + 30_000, remaining: null});
    });

    it("efface le drapeau au tour d'un combattant du MJ", async () => {
        const combat = makeCombat({player: false, flag: {duration: 30_000, expiresAt: NOW, remaining: null}});

        await TurnTimer.rearmForGM(combat);

        expect(combat.unsetFlag).toHaveBeenCalledWith(MODULE_ID, TURN_TIMER_FLAG);
        expect(TurnTimer.state(combat)).toBeNull();
    });

    it("n'écrit rien quand il n'y a ni échéance à poser ni drapeau à effacer", async () => {
        // Un combat de PNJ ne doit pas produire une mise à jour de document par tour.
        const combat = makeCombat({player: false});

        await TurnTimer.rearmForGM(combat);

        expect(combat.setFlag).not.toHaveBeenCalled();
        expect(combat.unsetFlag).not.toHaveBeenCalled();
    });

    it("n'avertit pas de l'absence de MJ quand le chronomètre est éteint", async () => {
        // `isLocalUserFirstActiveGM` avertit quand aucun MJ n'est connecté : un
        // avertissement par tour dans un monde sans chronomètre serait insupportable.
        setSettings({enabled: false});
        game.users = {activeGM: null};
        const combat = makeCombat();

        await TurnTimer.rearmForGM(combat);

        expect(ui.notifications.warn).not.toHaveBeenCalled();
    });

    it("laisse le drapeau au client d'un joueur", async () => {
        // Sans ce garde, chaque client connecté réécrirait l'échéance.
        game.userId = "player1";
        const combat = makeCombat();

        await TurnTimer.rearmForGM(combat);

        expect(combat.setFlag).not.toHaveBeenCalled();
    });

    it("pose un chronomètre déjà gelé si le jeu est en pause", async () => {
        // Le tour ne doit pas commencer à s'écouler avant la reprise de la séance.
        game.paused = true;
        const combat = makeCombat();

        await TurnTimer.rearmForGM(combat);

        expect(flagOf(combat)).toEqual({duration: 30_000, expiresAt: null, remaining: 30_000});
    });

    it("repart à zéro quand le MJ revient sur un tour déjà joué", async () => {
        const combat = makeCombat({flag: {duration: 30_000, expiresAt: NOW + 2_000, remaining: null}});

        await TurnTimer.rearmForGM(combat);

        // Le combattant sur lequel le MJ revient reprend son tour du début : c'est
        // la différence avec les jets de mort, qui ignorent le retour en arrière.
        expect(TurnTimer.remainingMs(combat)).toBe(30_000);
    });
});

describe("TurnTimer.remainingMs", () => {
    it("déduit le temps restant de l'échéance partagée", () => {
        const combat = makeCombat({flag: {duration: 30_000, expiresAt: NOW + 12_000, remaining: null}});

        expect(TurnTimer.remainingMs(combat)).toBe(12_000);
    });

    it("rend le reste figé d'un chronomètre en pause, qui ne bouge plus", () => {
        const combat = makeCombat({flag: {duration: 30_000, expiresAt: null, remaining: 8_000}});

        TurnTimer.now.mockReturnValue(NOW + 60_000);

        expect(TurnTimer.remainingMs(combat)).toBe(8_000);
    });

    it("ne descend jamais sous zéro", () => {
        // Le MJ peut s'être déconnecté sans faire expirer le tour : l'affichage
        // montre alors zéro, pas un temps négatif.
        const combat = makeCombat({flag: {duration: 30_000, expiresAt: NOW - 5_000, remaining: null}});

        expect(TurnTimer.remainingMs(combat)).toBe(0);
    });

    it("rend null quand le tour n'est pas chronométré", () => {
        expect(TurnTimer.remainingMs(makeCombat())).toBeNull();
        expect(TurnTimer.remainingMs(undefined)).toBeNull();
    });

    it("rend null sur un drapeau inexploitable plutôt que d'afficher n'importe quoi", () => {
        for (const flag of [{}, {duration: 0, expiresAt: NOW}, {duration: 30_000}]) {
            expect(TurnTimer.remainingMs(makeCombat({flag}))).toBeNull();
        }
    });
});

describe("TurnTimer.syncPauseForGM", () => {
    it("gèle le temps restant à la pause", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);

        TurnTimer.now.mockReturnValue(NOW + 10_000);
        game.paused = true;
        await TurnTimer.syncPauseForGM(true);

        // Vingt secondes gardées de côté : une interruption de séance ne doit pas
        // manger le tour du joueur.
        expect(flagOf(combat)).toEqual({duration: 30_000, expiresAt: null, remaining: 20_000});
    });

    it("recalcule l'échéance à la reprise", async () => {
        const combat = makeCombat({flag: {duration: 30_000, expiresAt: null, remaining: 20_000}});

        game.paused = false;
        await TurnTimer.syncPauseForGM(false);

        expect(flagOf(combat)).toEqual({duration: 30_000, expiresAt: NOW + 20_000, remaining: null});
    });

    it("ne rallonge pas le tour quand la pause est demandée deux fois", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);
        TurnTimer.now.mockReturnValue(NOW + 10_000);
        game.paused = true;
        await TurnTimer.syncPauseForGM(true);
        combat.setFlag.mockClear();

        TurnTimer.now.mockReturnValue(NOW + 25_000);
        await TurnTimer.syncPauseForGM(true);

        expect(combat.setFlag).not.toHaveBeenCalled();
        expect(TurnTimer.remainingMs(combat)).toBe(20_000);
    });

    it("n'écrit rien quand aucun tour n'est chronométré", async () => {
        const combat = makeCombat();

        await TurnTimer.syncPauseForGM(true);

        expect(combat.setFlag).not.toHaveBeenCalled();
    });
});

describe("expiration du tour", () => {
    it("passe la main au combattant suivant quand le temps est écoulé", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);

        TurnTimer.now.mockReturnValue(NOW + 30_000);
        await vi.advanceTimersByTimeAsync(30_000);

        expect(combat.nextTurn).toHaveBeenCalledTimes(1);
        // Un message de chat laisse la trace du tour perdu, comme les jets de mort.
        expect(ChatMessage.create).toHaveBeenCalledTimes(1);
    });

    it("n'expire pas avant le terme du tour", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);

        await vi.advanceTimersByTimeAsync(29_000);

        expect(combat.nextTurn).not.toHaveBeenCalled();
    });

    it("n'arme rien sur le client d'un joueur", async () => {
        game.userId = "player1";
        const combat = makeCombat({flag: {duration: 30_000, expiresAt: NOW + 30_000, remaining: null}});

        await TurnTimer.rearmForGM(combat);
        await vi.advanceTimersByTimeAsync(60_000);

        // Sinon la main passerait autant de fois qu'il y a de clients connectés.
        expect(combat.nextTurn).not.toHaveBeenCalled();
    });

    it("n'arme pas d'expiration pendant la pause", async () => {
        game.paused = true;
        const combat = makeCombat();

        await TurnTimer.rearmForGM(combat);
        await vi.advanceTimersByTimeAsync(60_000);

        expect(combat.nextTurn).not.toHaveBeenCalled();
    });

    it("désarme l'expiration du tour précédent à chaque remise à zéro", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);

        await vi.advanceTimersByTimeAsync(20_000);
        TurnTimer.now.mockReturnValue(NOW + 20_000);
        await TurnTimer.rearmForGM(combat);
        await vi.advanceTimersByTimeAsync(20_000);

        // Le compte à rebours du tour précédent ne doit pas faire passer la main
        // au milieu du tour suivant.
        expect(combat.nextTurn).not.toHaveBeenCalled();
    });

    it("ne passe pas la main d'un combat qui n'est plus celui en cours", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);

        // Le combat s'est terminé pendant que le tour s'écoulait.
        game.combat = null;
        await vi.advanceTimersByTimeAsync(30_000);

        expect(combat.nextTurn).not.toHaveBeenCalled();
    });

    it("laisse `cancel` désarmer un compte à rebours en cours", async () => {
        const combat = makeCombat();
        await TurnTimer.rearmForGM(combat);

        TurnTimer.cancel();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(TurnTimer.expiry).toBeNull();
        expect(combat.nextTurn).not.toHaveBeenCalled();
    });
});
