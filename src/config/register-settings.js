import {I18N, MODULE_ID} from "../core/constants.js";

/**
 * Enregistrement des réglages du module (`game.settings.register`), appelé par
 * `src/hook/init.hook.js`.
 *
 * Chaque fonctionnalité extraite de fq-card-engine ajoute ici son propre
 * réglage, avec ses clés de libellé dans `lang/en.json` et `lang/fr.json`.
 *
 * @returns {void}
 */
export function registerSettings() {
    game.settings.register(MODULE_ID, "Debug", {
        name: game.i18n.localize(`${I18N}.DebugSetting`),
        hint: game.i18n.localize(`${I18N}.DebugSettingHint`),
        scope: "client",    // "world" = synchronisé en base, "client" = stockage local
        config: true,       // false pour un réglage caché de la fenêtre de configuration
        type: Boolean,
        default: false,
        onChange: value => {
            CONFIG.FqEnhancedCombat.options.debug = value;
        }
    });
}
