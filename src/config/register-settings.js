import {I18N, MODULE_ID} from "../core/constants.js";
import {DEATH_SAVE_SETTING} from "../domain/death-save.js";

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
    game.settings.register(MODULE_ID, DEATH_SAVE_SETTING, {
        name: game.i18n.localize(`${I18N}.DeathSaveSetting`),
        hint: game.i18n.localize(`${I18N}.DeathSaveSettingHint`),
        scope: "world",     // la règle vaut pour la table entière, pas par client
        config: true,
        type: Boolean,
        // Désactivée par défaut : elle confie au module la mort des personnages et
        // la disparition des sbires, ce doit être un choix explicite du MJ.
        default: false
    });

    game.settings.register(MODULE_ID, "RollInitiative", {
        name: game.i18n.localize(`${I18N}.RollInitiativeSetting`),
        hint: game.i18n.localize(`${I18N}.RollInitiativeSettingHint`),
        scope: "world",
        config: true,
        type: Boolean,
        // Désactivée par défaut : lancer l'initiative d'office change la façon de
        // démarrer un combat, le MJ doit le demander.
        default: false
    });

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
