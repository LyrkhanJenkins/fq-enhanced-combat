import {I18N} from "../constants.js";

/**
 * Désignation du client qui exécute les opérations partagées d'un combat.
 *
 * COPIE de `CombatTurn.isLocalUserFirstActiveGM` de fq-card-engine, dupliquée
 * plutôt qu'emprunté : `combat-turn.js` est l'un des fichiers les plus liés au
 * jeu de cartes (pioche, défausse, sbires), et l'importer aurait tiré tout le
 * moteur ici.
 */

/**
 * L'utilisateur local est-il le premier MJ actif ?
 *
 * Tout ce qui modifie des documents pendant un changement de tour doit passer par
 * ce garde : sans lui, chaque client connecté exécuterait la même mise à jour, et
 * un jet de sauvegarde partirait autant de fois qu'il y a de MJ.
 *
 * Avertit si aucun MJ n'est connecté : la fonctionnalité est alors inerte, et le
 * silence donnerait à croire qu'elle est cassée.
 *
 * @returns {boolean} True si l'utilisateur local est le premier MJ actif.
 */
export function isLocalUserFirstActiveGM() {
    if (game.user == null || game.users == null || game.users.activeGM == null) {
        ui.notifications.warn(game.i18n.localize(`${I18N}.GMMustBeConnected`));
        return false;
    }
    return game.userId === game.users.activeGM.id;
}
