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

/**
 * Couleur des avertissements publiés dans le chat. Reprise telle quelle de
 * fq-card-engine : les deux modules parlent dans le même chat, un ton différent
 * pour un même niveau de message se remarquerait.
 *
 * @type {string}
 */
export const WARNING_COLOR = "#E36934";

/**
 * Couleur d'un échec — un jet de sauvegarde contre la mort raté, notamment.
 *
 * @type {string}
 */
export const FAIL_COLOR = "red";
