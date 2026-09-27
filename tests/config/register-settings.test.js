import {beforeEach, describe, expect, it, vi} from "vitest";
import {registerSettings} from "../../src/config/register-settings.js";
import {I18N, MODULE_ID} from "../../src/core/constants.js";

/**
 * Un réglage est enregistré sous le nom du module : `game.settings.get` échoue
 * bruyamment sur un couple (module, clé) jamais enregistré, et la fenêtre de
 * configuration reste vide si les libellés ne sont pas traduits.
 */
describe("registerSettings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        registerSettings();
    });

    it("enregistre le réglage Debug sous le nom du module", () => {
        expect(game.settings.register).toHaveBeenCalledTimes(1);
        const [namespace, key] = game.settings.register.mock.calls[0];
        expect(namespace).toBe(MODULE_ID);
        expect(key).toBe("Debug");
    });

    it("localise son libellé et son aide", () => {
        expect(game.i18n.localize).toHaveBeenCalledWith(`${I18N}.DebugSetting`);
        expect(game.i18n.localize).toHaveBeenCalledWith(`${I18N}.DebugSettingHint`);
    });

    it("répercute le changement dans CONFIG sans attendre un rechargement", () => {
        const {onChange} = game.settings.register.mock.calls[0][2];
        onChange(true);
        expect(CONFIG.FqEnhancedCombat.options.debug).toBe(true);
    });
});
