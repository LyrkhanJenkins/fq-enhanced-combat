import {I18N, MODULE_ID} from "../core/constants.js";
import {createInfo} from "../core/utils/chat.utils.js";
import {error} from "../core/utils/log.utils.js";
import {isLocalUserFirstActiveGM} from "../core/utils/gm.utils.js";
import DeathSave from "./death-save.js";

/**
 * Clé du réglage de monde qui active le compte à rebours de tour.
 * @type {string}
 */
export const TURN_TIMER_SETTING = "TurnTimer";

/**
 * Clé du réglage de monde qui fixe la durée d'un tour, en secondes.
 * @type {string}
 */
export const TURN_TIMER_DURATION_SETTING = "TurnTimerDuration";

/**
 * Nom du drapeau posé sur le combat, sous le nom du module, qui porte l'échéance
 * du tour en cours.
 * @type {string}
 */
export const TURN_TIMER_FLAG = "turnTimer";

/**
 * Compte à rebours du tour d'un combattant joué par un joueur : à l'expiration,
 * la main passe au combattant suivant.
 *
 * L'ÉCHÉANCE EST PARTAGÉE, pas le décompte. Le premier MJ actif inscrit dans un
 * drapeau du combat l'instant où le tour doit finir ; tous les clients en
 * déduisent le temps restant pour l'afficher (voir `ui/turn-timer-tracker.js`).
 * Un décompte propre à chaque client aurait dérivé d'un poste à l'autre, et un
 * joueur qui recharge sa page en milieu de tour serait reparti d'un tour plein.
 *
 * L'instant de référence est `game.time.serverTime` et non `Date.now()` : les
 * horloges des postes d'une table ne sont pas à la même heure, et une échéance
 * absolue lue sur l'horloge locale s'afficherait n'importe comment.
 *
 * LA PAUSE FOUNDRY GÈLE LE COMPTE À REBOURS : le drapeau passe alors d'une
 * échéance (`expiresAt`) à un reste figé (`remaining`), et la reprise recalcule
 * l'échéance. Sans cela le chronomètre tournerait pendant une interruption de
 * séance, et le tour serait perdu au retour.
 *
 * Seul le client du premier MJ actif écrit le drapeau et passe la main — comme
 * les autres automatismes du module. Un MJ qui se déconnecte en milieu de tour
 * laisse donc le compte à rebours s'afficher sans jamais expirer ; le tour
 * suivant, pris en charge par le nouveau premier MJ actif, repart normalement.
 *
 * Toutes les méthodes sont statiques : la classe sert de namespace.
 */
export default class TurnTimer {

    /**
     * La durée d'un tour par défaut, en secondes.
     * @type {number}
     */
    static DEFAULT_DURATION = 60;

    /**
     * La durée de tour la plus courte proposée par le réglage, en secondes.
     * @type {number}
     */
    static MIN_DURATION = 10;

    /**
     * La durée de tour la plus longue proposée par le réglage, en secondes.
     * @type {number}
     */
    static MAX_DURATION = 300;

    /**
     * Le compte à rebours local qui portera l'expiration, chez le premier MJ actif
     * seulement. `null` quand aucun tour n'est chronométré.
     * @type {*}
     */
    static expiry = null;

    /**
     * Indique si le compte à rebours de tour est activé dans le monde. Silencieuse
     * en l'absence de réglage (tests, chargement partiel) : la fonctionnalité est
     * alors simplement inactive.
     *
     * @returns {boolean} True si la fonctionnalité est activée.
     */
    static isEnabled() {
        try {
            return game.settings.get(MODULE_ID, TURN_TIMER_SETTING) === true;
        } catch {
            return false;
        }
    }

    /**
     * La durée d'un tour, en millisecondes. Une durée absente ou aberrante retombe
     * sur `DEFAULT_DURATION` : un tour de zéro seconde expirerait en boucle.
     *
     * @returns {number} La durée d'un tour en millisecondes.
     */
    static duration() {
        let seconds;
        try {
            seconds = Number(game.settings.get(MODULE_ID, TURN_TIMER_DURATION_SETTING));
        } catch {
            seconds = Number.NaN;
        }
        if (!Number.isFinite(seconds) || seconds <= 0) {
            seconds = TurnTimer.DEFAULT_DURATION;
        }
        return Math.round(seconds) * 1000;
    }

    /**
     * L'instant de référence du module : l'heure du serveur, la même pour tous les
     * postes. Isolée pour que les tests pilotent le temps.
     *
     * @returns {number} L'instant courant en millisecondes.
     */
    static now() {
        const serverTime = Number(game.time?.serverTime);
        return Number.isFinite(serverTime) && serverTime > 0 ? serverTime : Date.now();
    }

    /**
     * Indique si le tour de ce combattant est chronométré : c'est celui d'un
     * JOUEUR, et non d'une créature du MJ dont il mène le tour lui-même.
     *
     * Un combattant à terre en est exclu : les jets de sauvegarde contre la mort
     * tiennent déjà son tour (voir `domain/death-save.js`) et passent la main au
     * bout de deux secondes — un compte à rebours de soixante secondes par-dessus
     * n'aurait rien à décompter.
     *
     * @param {Combatant} [combatant] - Le combattant dont le tour commence.
     *
     * @returns {boolean} True si le tour de ce combattant doit être chronométré.
     */
    static watchesTurnOf(combatant) {
        const actor = combatant?.actor;
        if (actor == null || actor.hasPlayerOwner !== true) {
            return false;
        }
        return !DeathSave.skipsTurn(actor);
    }

    /**
     * Remet le compte à rebours à zéro pour le tour courant, sur le client du
     * premier MJ actif : échéance posée si le tour est chronométré, drapeau effacé
     * sinon.
     *
     * Appelée à chaque changement de tour ET au changement des réglages du
     * chronomètre — de sorte qu'activer ou désactiver la fonctionnalité en pleine
     * bataille se voie tout de suite, sans attendre le tour suivant.
     *
     * Le garde du premier MJ actif n'est consulté QUE s'il y a quelque chose à
     * écrire : il avertit quand aucun MJ n'est connecté, et un avertissement à
     * chaque tour d'un monde sans chronomètre serait insupportable.
     *
     * @param {Combat} [combat] - Le combat dont le tour commence.
     *
     * @returns {Promise<boolean>} True si une échéance a été posée.
     */
    static async rearmForGM(combat = game.combat) {
        TurnTimer.cancel();
        const wanted = TurnTimer.isEnabled() && TurnTimer.watchesTurnOf(combat?.combatant);
        if (!wanted && TurnTimer.state(combat) == null) {
            return false;
        }
        if (!isLocalUserFirstActiveGM()) {
            return false;
        }
        if (!wanted) {
            await TurnTimer.clear(combat);
            return false;
        }
        await TurnTimer.arm(combat);
        return true;
    }

    /**
     * Inscrit l'échéance du tour dans le drapeau du combat et arme l'expiration.
     * Un jeu déjà en pause reçoit un chronomètre gelé : le tour ne commence à
     * s'écouler qu'à la reprise.
     *
     * @param {Combat} combat - Le combat dont le tour commence.
     *
     * @returns {Promise<void>}
     */
    static async arm(combat) {
        TurnTimer.cancel();
        const duration = TurnTimer.duration();
        const paused = Boolean(game.paused);
        const expiresAt = paused ? null : TurnTimer.now() + duration;
        await TurnTimer.write(combat, {duration, expiresAt, remaining: paused ? duration : null});
        TurnTimer.schedule(combat, expiresAt);
    }

    /**
     * Gèle ou relance le compte à rebours selon la pause de Foundry, sur le client
     * du premier MJ actif. Sans effet quand aucun tour n'est chronométré, ou quand
     * le drapeau est déjà dans l'état demandé — mettre deux fois en pause ne doit
     * pas rallonger le tour.
     *
     * @param {boolean} paused - L'état de pause du jeu.
     *
     * @returns {Promise<void>}
     */
    static async syncPauseForGM(paused) {
        const combat = game.combat;
        const state = TurnTimer.state(combat);
        if (state == null) {
            return;
        }
        const frozen = state.expiresAt == null;
        if (Boolean(paused) === frozen) {
            return;
        }
        if (!isLocalUserFirstActiveGM()) {
            return;
        }
        if (paused) {
            const remaining = TurnTimer.remainingMs(combat);
            TurnTimer.cancel();
            await TurnTimer.write(combat, {duration: state.duration, expiresAt: null, remaining});
            return;
        }
        const expiresAt = TurnTimer.now() + state.remaining;
        await TurnTimer.write(combat, {duration: state.duration, expiresAt, remaining: null});
        TurnTimer.schedule(combat, expiresAt);
    }

    /**
     * Arme le compte à rebours local qui portera l'expiration du tour. Une échéance
     * nulle (chronomètre gelé) n'arme rien : la reprise s'en chargera.
     *
     * @param {Combat}      combat    - Le combat dont le tour est chronométré.
     * @param {number|null} expiresAt - L'instant d'expiration, ou null si gelé.
     *
     * @returns {void}
     */
    static schedule(combat, expiresAt) {
        TurnTimer.cancel();
        if (expiresAt == null) {
            return;
        }
        const delay = Math.max(0, expiresAt - TurnTimer.now());
        TurnTimer.expiry = setTimeout(() => {
            TurnTimer.expiry = null;
            TurnTimer.expire(combat).catch(e => error("Expiration du timer de tour", e));
        }, delay);
    }

    /**
     * Désarme le compte à rebours local. Appelée sur tous les clients à chaque
     * changement de tour : chez un joueur, il n'y a jamais rien à désarmer.
     *
     * @returns {void}
     */
    static cancel() {
        if (TurnTimer.expiry != null) {
            clearTimeout(TurnTimer.expiry);
            TurnTimer.expiry = null;
        }
    }

    /**
     * Le temps du tour est écoulé : la main passe au combattant suivant.
     *
     * Le drapeau n'est pas effacé ici — `nextTurn` relance `combatTurnChange`, qui
     * repose l'échéance du tour suivant ou efface le drapeau si ce tour n'est pas
     * chronométré. L'effacer d'abord aurait fait clignoter le bandeau chez tout le
     * monde.
     *
     * @param {Combat} combat - Le combat dont le tour expire.
     *
     * @returns {Promise<void>}
     */
    static async expire(combat) {
        // Le combat a pu changer, ou se terminer, pendant que le tour s'écoulait.
        if (!TurnTimer.isEnabled() || combat?.id == null || combat.id !== game.combat?.id) {
            return;
        }
        const combatant = combat.combatant;
        createInfo(
            game.i18n.format(`${I18N}.TurnTimerExpired`, {name: combatant?.name ?? ""}),
            {actor: combatant?.actor ?? null});
        await combat.nextTurn?.();
    }

    /**
     * Inscrit l'état du chronomètre dans le drapeau du combat. Les trois clés sont
     * toujours écrites : `setFlag` fusionne, et un `remaining` laissé de côté
     * survivrait à la reprise en figeant l'affichage.
     *
     * @param {Combat} combat - Le combat chronométré.
     * @param {{duration: number, expiresAt: number|null, remaining: number|null}} state - L'état à inscrire.
     *
     * @returns {Promise<void>}
     */
    static async write(combat, state) {
        await combat?.setFlag?.(MODULE_ID, TURN_TIMER_FLAG, state);
    }

    /**
     * Efface le drapeau du chronomètre. Sans écriture quand il n'y en a pas : un
     * combat de PNJ ne doit pas produire une mise à jour de document par tour.
     *
     * @param {Combat} [combat] - Le combat à libérer.
     *
     * @returns {Promise<void>}
     */
    static async clear(combat) {
        TurnTimer.cancel();
        if (TurnTimer.state(combat) == null) {
            return;
        }
        await combat?.unsetFlag?.(MODULE_ID, TURN_TIMER_FLAG);
    }

    /**
     * L'état du chronomètre lu dans le drapeau du combat, ou `null` si le tour
     * courant n'est pas chronométré. Les drapeaux sont lus directement plutôt que
     * par `getFlag` : l'affichage les relit chaque seconde, et un objet nu suffit.
     *
     * @param {Combat} [combat] - Le combat inspecté.
     *
     * @returns {{duration: number, expiresAt: number|null, remaining: number|null}|null} L'état, ou null.
     */
    static state(combat) {
        const flag = combat?.flags?.[MODULE_ID]?.[TURN_TIMER_FLAG];
        if (flag == null) {
            return null;
        }
        const duration = Number(flag.duration);
        const expiresAt = TurnTimer.finiteOrNull(flag.expiresAt);
        const remaining = TurnTimer.finiteOrNull(flag.remaining);
        if (!Number.isFinite(duration) || duration <= 0 || (expiresAt == null && remaining == null)) {
            return null;
        }
        return {duration, expiresAt, remaining};
    }

    /**
     * Le temps restant au tour courant, en millisecondes, ou `null` si ce tour
     * n'est pas chronométré. Jamais négatif : un tour dont l'échéance est passée
     * mais que le MJ n'a pas encore fait expirer affiche zéro.
     *
     * @param {Combat} [combat] - Le combat inspecté.
     *
     * @returns {number|null} Le temps restant en millisecondes, ou null.
     */
    static remainingMs(combat) {
        const state = TurnTimer.state(combat);
        if (state == null) {
            return null;
        }
        if (state.expiresAt == null) {
            return Math.max(0, state.remaining);
        }
        return Math.max(0, state.expiresAt - TurnTimer.now());
    }

    /**
     * La valeur si elle est un nombre utilisable, `null` sinon. Les deux instants
     * du drapeau valent tour à tour un nombre et `null`.
     *
     * @param {*} value - La valeur lue dans le drapeau.
     *
     * @returns {number|null} Le nombre, ou null.
     */
    static finiteOrNull(value) {
        if (value == null) {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }
}
