import {I18N, MODULE_ID} from "./core/constants.js";

/**
 * Espace de configuration du module dans `CONFIG`, sur le modèle de
 * `CONFIG.FqCardEngine` : les réglages y sont recopiés une fois au hook `setup`
 * (voir `src/hook/setup.hook.js`), et le reste du module lit `options` plutôt
 * que d'interroger `game.settings` à chaque passage.
 */
CONFIG.FqEnhancedCombat = {
    options: {
        debug: false
    }
};

/**
 * Façade globale du module, à l'image de `window.FqCardEngineModule` : un point
 * d'accès unique pour les macros et pour le code des autres modules FQ.
 *
 * Elle n'expose pour l'instant que l'identité du module — c'est ici que
 * viendront les entrées publiques des fonctionnalités de combat, au fur et à
 * mesure de leur extraction depuis fq-card-engine.
 */
window.FqEnhancedCombatModule = {
    moduleName: MODULE_ID,
    i18n: I18N
};
