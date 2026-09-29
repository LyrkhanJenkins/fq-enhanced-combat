import {I18N} from "../core/constants.js";
import TurnTimer from "../domain/turn-timer.js";

/**
 * Classe CSS du bandeau, racine de tout ce que la feuille de style habille.
 * Préfixée `fqec-` comme les jetons de `styles/globals.css` : fq-card-engine
 * occupe déjà `fq-`, et les deux modules peuvent tourner dans le même monde.
 * @type {string}
 */
export const TIMER_CLASS = "fqec-turn-timer";

/**
 * Le bandeau de compte à rebours du combat tracker.
 *
 * Deux temps bien séparés :
 *
 * 1. `render` CONSTRUIT le bandeau, à chaque rendu du tracker — Foundry refait
 *    tout son DOM, un bandeau conservé d'un rendu à l'autre serait orphelin.
 * 2. `tick` le REPEINT chaque seconde, en ne touchant que le texte et la largeur
 *    de la barre. Reconstruire le bandeau à chaque seconde aurait coupé la
 *    transition CSS de la barre et lutté contre le DOM de Foundry.
 *
 * L'horloge n'est lue nulle part ici : le temps restant vient de `TurnTimer`, qui
 * le déduit de l'échéance partagée par le drapeau du combat. Le bandeau s'affiche
 * donc à l'identique chez le MJ et chez les joueurs, même chez un joueur arrivé
 * en milieu de tour.
 *
 * Le battement ne tourne que lorsqu'un bandeau est à l'écran et s'arrête de
 * lui-même : tracker fermé ou tour non chronométré, il n'y a plus rien à
 * décompter.
 *
 * Toutes les méthodes sont statiques : la classe sert de namespace.
 */
export default class TurnTimerTracker {

    /**
     * L'intervalle entre deux repeints, en millisecondes. Une seconde : c'est
     * l'unité affichée, et la barre glisse entre deux battements par transition CSS.
     * @type {number}
     */
    static TICK_INTERVAL = 1000;

    /**
     * En dessous de ce reste, en millisecondes, le bandeau passe en alerte.
     * @type {number}
     */
    static URGENT_MS = 5000;

    /**
     * Le battement d'affichage, partagé par tous les bandeaux à l'écran (le
     * tracker de la barre latérale et sa fenêtre détachée en affichent un chacun).
     * @type {*}
     */
    static ticker = null;

    /**
     * Construit — ou retire — le bandeau dans un rendu du combat tracker.
     *
     * @param {HTMLElement} [root] - L'élément racine du tracker fraîchement rendu.
     *
     * @returns {HTMLElement|null} Le bandeau posé, ou null si ce tour n'est pas chronométré.
     */
    static render(root) {
        if (root?.querySelector == null) {
            return null;
        }
        root.querySelectorAll(`.${TIMER_CLASS}`).forEach(stale => stale.remove());
        if (TurnTimer.remainingMs(game.combat) == null) {
            TurnTimerTracker.stop();
            return null;
        }
        const banner = TurnTimerTracker.build();
        TurnTimerTracker.insert(root, banner);
        TurnTimerTracker.paint(banner);
        TurnTimerTracker.start();
        return banner;
    }

    /**
     * Le bandeau vide, avec ses trois zones : le libellé, le temps restant et la
     * barre. Le texte est posé par `paint`.
     *
     * @returns {HTMLElement} Le bandeau construit.
     */
    static build() {
        const banner = document.createElement("div");
        banner.classList.add(TIMER_CLASS);
        for (const part of ["label", "value", "track"]) {
            const element = document.createElement("div");
            element.classList.add(`${TIMER_CLASS}-${part}`);
            banner.append(element);
        }
        const bar = document.createElement("div");
        bar.classList.add(`${TIMER_CLASS}-bar`);
        banner.querySelector(`.${TIMER_CLASS}-track`).append(bar);
        return banner;
    }

    /**
     * Insère le bandeau juste AU-DESSUS de la liste des combattants : sous
     * l'en-tête du tracker, il reste visible quand la liste défile.
     *
     * Deux sélecteurs, puis un repli en tête du tracker : le squelette du tracker
     * change d'une version de Foundry à l'autre, et un bandeau mal placé vaut mieux
     * qu'un bandeau absent.
     *
     * @param {HTMLElement} root   - L'élément racine du tracker.
     * @param {HTMLElement} banner - Le bandeau à insérer.
     *
     * @returns {void}
     */
    static insert(root, banner) {
        const list = root.querySelector("ol.combat-tracker, ol.directory-list");
        if (list?.parentElement != null) {
            list.parentElement.insertBefore(banner, list);
            return;
        }
        root.prepend(banner);
    }

    /**
     * Repeint un bandeau depuis l'état courant du chronomètre, et le retire si le
     * tour n'est plus chronométré (combat terminé, tour d'un PNJ).
     *
     * L'affichage est gelé dès la pause LOCALE, sans attendre que le MJ ait inscrit
     * le reste dans le drapeau : sinon le décompte continuerait de tomber le temps
     * de l'aller-retour.
     *
     * @param {HTMLElement} banner - Le bandeau à repeindre.
     *
     * @returns {boolean} True si le bandeau est toujours à l'écran.
     */
    static paint(banner) {
        const combat = game.combat;
        const state = TurnTimer.state(combat);
        const remaining = TurnTimer.remainingMs(combat);
        if (state == null || remaining == null) {
            banner.remove();
            return false;
        }
        const paused = Boolean(game.paused) || state.expiresAt == null;
        const ratio = Math.max(0, Math.min(1, remaining / state.duration));

        banner.querySelector(`.${TIMER_CLASS}-label`).textContent =
            game.i18n.localize(`${I18N}.${paused ? "TurnTimerPaused" : "TurnTimerLabel"}`);
        banner.querySelector(`.${TIMER_CLASS}-value`).textContent = TurnTimerTracker.format(remaining);
        banner.querySelector(`.${TIMER_CLASS}-bar`).style.width = `${(ratio * 100).toFixed(1)}%`;
        banner.classList.toggle("is-paused", paused);
        banner.classList.toggle("is-urgent", !paused && remaining <= TurnTimerTracker.URGENT_MS);
        return true;
    }

    /**
     * Le temps restant en `m:ss`, arrondi à la seconde SUPÉRIEURE : un tour affiche
     * sa durée pleine à la première seconde, et n'affiche `0:00` qu'épuisé.
     *
     * @param {number} ms - Le temps restant en millisecondes.
     *
     * @returns {string} Le temps restant formaté.
     */
    static format(ms) {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }

    /**
     * Repeint tous les bandeaux à l'écran, et arrête le battement quand il n'en
     * reste aucun.
     *
     * @returns {void}
     */
    static tick() {
        const banners = document.querySelectorAll(`.${TIMER_CLASS}`);
        if (banners.length === 0) {
            TurnTimerTracker.stop();
            return;
        }
        banners.forEach(banner => TurnTimerTracker.paint(banner));
    }

    /**
     * Lance le battement d'affichage s'il ne tourne pas déjà.
     *
     * @returns {void}
     */
    static start() {
        if (TurnTimerTracker.ticker != null) {
            return;
        }
        TurnTimerTracker.ticker = setInterval(() => TurnTimerTracker.tick(), TurnTimerTracker.TICK_INTERVAL);
    }

    /**
     * Arrête le battement d'affichage.
     *
     * @returns {void}
     */
    static stop() {
        if (TurnTimerTracker.ticker != null) {
            clearInterval(TurnTimerTracker.ticker);
            TurnTimerTracker.ticker = null;
        }
    }
}
