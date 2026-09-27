import {beforeEach, describe, expect, it, vi} from "vitest";
import {MODULE_ID} from "../src/core/constants.js";

/**
 * L'entrée du module agit à l'import (comme `init-engine.js` dans
 * fq-card-engine) : elle pose `CONFIG.FqEnhancedCombat` et la façade globale.
 * D'où le `resetModules` — un module ESM n'est évalué qu'une fois par registre,
 * et `tests/setup.js` remet CONFIG à neuf avant chaque test.
 */
describe("init-enhanced-combat", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("ouvre l'espace de configuration du module, débogage éteint", async () => {
        await import("../src/init-enhanced-combat.js");
        expect(CONFIG.FqEnhancedCombat.options.debug).toBe(false);
    });

    it("expose la façade globale sous son identifiant de module", async () => {
        await import("../src/init-enhanced-combat.js");
        expect(window.FqEnhancedCombatModule.moduleName).toBe(MODULE_ID);
    });
});
