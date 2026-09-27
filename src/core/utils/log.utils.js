import {MODULE_ID} from "../constants.js";

/**
 * Journalisation préfixée par le nom du module : dans la console d'un Foundry
 * chargé d'une dizaine de modules, un message sans préfixe n'appartient à
 * personne.
 *
 * `debug` ne parle que si le réglage « Debug » est actif (lu dans
 * `CONFIG.FqEnhancedCombat.options.debug` au hook `setup`) ; les trois autres
 * parlent toujours.
 */

/**
 * @param {...*} args - Ce qu'il y a à écrire.
 *
 * @returns {void}
 */
export function debug(...args) {
    if (CONFIG.FqEnhancedCombat?.options?.debug) {
        console.debug(`${MODULE_ID} |`, ...args);
    }
}

/**
 * @param {...*} args - Ce qu'il y a à écrire.
 *
 * @returns {void}
 */
export function info(...args) {
    console.info(`${MODULE_ID} |`, ...args);
}

/**
 * @param {...*} args - Ce qu'il y a à écrire.
 *
 * @returns {void}
 */
export function warn(...args) {
    console.warn(`${MODULE_ID} |`, ...args);
}

/**
 * @param {...*} args - Ce qu'il y a à écrire.
 *
 * @returns {void}
 */
export function error(...args) {
    console.error(`${MODULE_ID} |`, ...args);
}
