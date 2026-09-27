import {describe, expect, it} from "vitest";
import {existsSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import {I18N, MODULE_ID} from "../src/core/constants.js";

/**
 * Test de fumée du manifeste : Foundry ne charge que ce que `module.json`
 * déclare, et ne dit rien quand un chemin déclaré ne mène à rien — le module
 * s'active alors sans fonctionner. Ces assertions tiennent ce câblage à jour à
 * chaque fonctionnalité extraite de fq-card-engine.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} name - Le nom du fichier à lire à la racine du module.
 *
 * @returns {object} Son contenu JSON.
 */
function readJson(name) {
    return JSON.parse(readFileSync(resolve(root, name), "utf8"));
}

const manifest = readJson("module.json");

describe("module.json", () => {
    it("porte l'identifiant attendu par le code et par le dossier du module", () => {
        // Foundry exige que l'id du manifeste, le nom du dossier sous
        // Data/modules et l'identifiant utilisé dans le code coïncident.
        expect(manifest.id).toBe(MODULE_ID);
        expect(root.replaceAll("\\", "/").endsWith(`/${MODULE_ID}`)).toBe(true);
    });

    it("annonce la même version que package.json", () => {
        // Le workflow de release refuse un tag qui ne correspond pas à
        // `module.json` ; package.json suit, pour que `npm version` reste vrai.
        expect(manifest.version).toBe(readJson("package.json").version);
    });

    it("ne déclare que des fichiers qui existent", () => {
        const declared = [
            ...manifest.esmodules,
            ...manifest.styles,
            ...manifest.languages.map(language => language.path)
        ];
        const missing = declared.filter(path => !existsSync(resolve(root, path)));
        expect(missing).toEqual([]);
    });

    it("charge la façade avant les hooks qui s'en servent", () => {
        // `src/init-enhanced-combat.js` pose CONFIG.FqEnhancedCombat : un hook
        // chargé avant lui lirait un espace de configuration inexistant.
        expect(manifest.esmodules[0]).toBe("src/init-enhanced-combat.js");
    });
});

describe("lang", () => {
    const en = readJson("lang/en.json");
    const fr = readJson("lang/fr.json");

    it("traduit exactement les mêmes clés en anglais et en français", () => {
        expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    });

    it("préfixe toutes ses clés par celui du module", () => {
        const foreign = Object.keys(en).filter(key => !key.startsWith(`${I18N}.`));
        expect(foreign).toEqual([]);
    });

    it("ne laisse aucune traduction vide", () => {
        const empty = [...Object.entries(en), ...Object.entries(fr)]
            .filter(([, value]) => !String(value).trim())
            .map(([key]) => key);
        expect(empty).toEqual([]);
    });
});
