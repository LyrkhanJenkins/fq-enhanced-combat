import DeathSave from "../domain/death-save.js";
import {isLocalUserFirstActiveGM} from "../core/utils/gm.utils.js";
import {MODULE_ID} from "../core/constants.js";

/**
 * Les deux automatismes de combat du module.
 *
 * Deux gardes valent pour les deux :
 *
 * 1. Ils ne s'exécutent que sur le client du PREMIER MJ ACTIF, car ils modifient
 *    des documents partagés (jet de sauvegarde, initiative de tous les
 *    combattants) : sans cela chaque client connecté rejouerait l'opération.
 * 2. Ils sont désormais les SEULS à porter ces deux règles : fq-card-engine les a
 *    cédées et se contente d'interroger l'API publique pour savoir si un début de
 *    tour lui échappe.
 */

/**
 * Début de tour d'un combattant à 0 point de vie : jet de sauvegarde contre la
 * mort pour un personnage, dissipation pour un sbire, retrait du combat pour un
 * PNJ. Voir `domain/death-save.js` pour la règle appliquée.
 *
 * Un retour en arrière dans l'ordre du combat ne déclenche rien : le MJ qui
 * revient sur un tour déjà joué ne doit pas faire relancer son jet au combattant.
 */
Hooks.on("combatTurnChange", async function (combat, _prior, _current) {
    const goingBackwards = combat.round < combat.previous?.round
        || (combat.round === combat.previous?.round && combat.turn < combat.previous?.turn);
    if (goingBackwards) {
        return;
    }
    if (!DeathSave.isEnabled() || !isLocalUserFirstActiveGM()) {
        return;
    }
    await DeathSave.resolveTurnStart(combat);
});

/**
 * Initiative lancée d'office à l'entrée en combat, pour tous les combattants qui
 * n'en ont pas encore.
 *
 * Branché sur `createCombatant` et non sur `createCombat` : les combattants sont
 * ajoutés un à un, souvent après la création du combat, et `rollAll` ne touche
 * que ceux dont l'initiative manque — l'appel répété est donc sans effet de bord.
 */
Hooks.on("createCombatant", async function (_combatant, _data, _options) {
    if (!game.settings.get(MODULE_ID, "RollInitiative")) {
        return;
    }
    if (!isLocalUserFirstActiveGM()) {
        return;
    }
    await game.combat?.rollAll();
});
