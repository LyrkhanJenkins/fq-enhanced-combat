import {beforeEach, describe, expect, it, vi} from "vitest";
import {registerSettings} from "../../src/config/register-settings.js";
import {I18N, MODULE_ID} from "../../src/core/constants.js";
import {DEATH_SAVE_SETTING} from "../../src/domain/death-save.js";

/**
 * Un réglage est enregistré sous le nom du module : `game.settings.get` échoue
 * bruyamment sur un couple (module, clé) jamais enregistré, et la fenêtre de
 * configuration reste vide si les libellés ne sont pas traduits.
 *
 * Les réglages sont retrouvés par leur CLÉ et non par leur rang d'enregistrement :
 * chaque fonctionnalité ajoute le sien, et un test indexé se serait cassé au
 * premier ajout.
 */
describe("registerSettings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        registerSettings();
    });

    /**
     * Les options passées à `game.settings.register` pour une clé donnée.
     *
     * @param {string} key - La clé du réglage.
     *
     * @returns {object|undefined} Les options, ou undefined si la clé n'est pas enregistrée.
     */
    function optionsOf(key) {
        const call = game.settings.register.mock.calls.find(([, registered]) => registered === key);
        return call?.[2];
    }

    it("enregistre tous ses réglages sous le nom du module", () => {
        const namespaces = new Set(game.settings.register.mock.calls.map(([namespace]) => namespace));

        expect([...namespaces]).toEqual([MODULE_ID]);
    });

    it("enregistre un réglage par fonctionnalité, et pas deux fois la même clé", () => {
        const keys = game.settings.register.mock.calls.map(([, key]) => key);

        expect(keys).toEqual(expect.arrayContaining(["Debug", DEATH_SAVE_SETTING, "RollInitiative"]));
        expect(new Set(keys).size).toBe(keys.length);
    });

    it("localise le libellé et l'aide de chaque réglage", () => {
        for (const suffix of ["Debug", "DeathSave", "RollInitiative"]) {
            expect(game.i18n.localize).toHaveBeenCalledWith(`${I18N}.${suffix}Setting`);
            expect(game.i18n.localize).toHaveBeenCalledWith(`${I18N}.${suffix}SettingHint`);
        }
    });

    it("répercute le changement de Debug dans CONFIG sans attendre un rechargement", () => {
        optionsOf("Debug").onChange(true);

        expect(CONFIG.FqEnhancedCombat.options.debug).toBe(true);
    });

    it("réserve au monde les réglages qui changent les règles du combat", () => {
        // Un réglage `client` laisserait chaque joueur décider si les jets de mort
        // s'appliquent : la règle doit valoir pour la table entière.
        expect(optionsOf(DEATH_SAVE_SETTING).scope).toBe("world");
        expect(optionsOf("RollInitiative").scope).toBe("world");
    });

    it("laisse les automatismes de combat désactivés par défaut", () => {
        // Ils changent la façon de mener un combat : ce doit être un choix du MJ.
        expect(optionsOf(DEATH_SAVE_SETTING).default).toBe(false);
        expect(optionsOf("RollInitiative").default).toBe(false);
    });
});
