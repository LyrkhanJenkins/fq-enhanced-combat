import {MODULE_ID} from "../core/constants.js";
import TurnTimerTracker from "../ui/turn-timer-tracker.js";

/**
 * L'affichage du compte à rebours de tour dans le combat tracker.
 *
 * Contrairement aux hooks de `combat.hook.js`, ceux-ci tournent sur TOUS les
 * clients : ils ne modifient aucun document, ils ne font que lire l'échéance
 * inscrite dans le drapeau du combat par le premier MJ actif. Les joueurs voient
 * donc le même décompte que le MJ.
 */

/**
 * Le tracker vient d'être rendu : le bandeau y est (re)posé. Foundry refait tout
 * le DOM du tracker à chaque rendu — rien à conserver d'un rendu au suivant.
 *
 * `element` est un `HTMLElement` depuis l'ApplicationV2 de Foundry v13 ; le repli
 * sur `[0]` couvre un tracker encore rendu en jQuery.
 */
Hooks.on("renderCombatTracker", function (_app, element, _data) {
    TurnTimerTracker.render(element instanceof HTMLElement ? element : element?.[0]);
});

/**
 * Le drapeau du chronomètre a changé : le tracker est rendu à nouveau, pour faire
 * apparaître le bandeau au début d'un tour chronométré (ou le faire disparaître
 * au tour d'un PNJ).
 *
 * Filtré sur le drapeau du module : un rendu à chaque mise à jour de combat serait
 * gratuit. Une pose comme un effacement passent tous deux par `flags[MODULE_ID]`
 * — l'effacement sous la forme `-=turnTimer`.
 */
Hooks.on("updateCombat", function (_combat, changes, _options, _userId) {
    if (changes?.flags?.[MODULE_ID] == null) {
        return;
    }
    ui.combat?.render();
});

/**
 * Le combat est terminé : plus rien à décompter, le battement d'affichage
 * s'arrête. Le drapeau, lui, part avec le combat supprimé.
 */
Hooks.on("deleteCombat", function (_combat, _options, _userId) {
    TurnTimerTracker.stop();
});
