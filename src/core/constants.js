// Constantes de la couche `core` : aucune dépendance vers le reste du module.

/**
 * Identifiant du module, tel qu'il figure dans `module.json` et dans le nom du
 * dossier sous `Data/modules`. Foundry exige que les trois coïncident.
 *
 * @type {string}
 */
export const MODULE_ID = "fq-enhanced-combat";

/**
 * Préfixe des clés de traduction (`lang/en.json`, `lang/fr.json`).
 *
 * Abrégé, comme `FQRESTRAIN` pour fq-restrain-movement : les clés sont écrites
 * en entier partout dans le code, un préfixe long les rend illisibles.
 *
 * @type {string}
 */
export const I18N = "FQCOMBAT";
