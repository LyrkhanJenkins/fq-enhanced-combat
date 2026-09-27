import {WARNING_COLOR} from "../constants.js";

/**
 * Messages de chat stylisés.
 *
 * COPIE de `core/utils/chat.utils.js` de fq-card-engine, dont les jets de mort se
 * servent. Dupliqué et non emprunté : l'original est importé par neuf fichiers du
 * moteur de cartes, si bien que le partager rendrait fq-card-engine dépendant de
 * CE module — alors qu'il doit tourner seul, sans Final Quest.
 */

/**
 * Publie dans le chat un message d'avertissement stylisé (span italique coloré).
 *
 * @param {string} message - Le texte déjà localisé/formaté à afficher.
 * @param {object} [options] - Options d'affichage.
 * @param {object} [options.actor] - L'acteur speaker du message.
 * @param {string} [options.color=WARNING_COLOR] - La couleur du texte (ex. `FAIL_COLOR`).
 * @param {boolean} [options.prependActorName=false] - Préfixe le message du nom de l'acteur.
 *
 * @returns {void}
 */
export function createWarning(message, {actor = null, color = WARNING_COLOR, prependActorName = false} = {}) {
    const text = prependActorName && actor?.name ? `${actor.name} ${message}` : message;
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `<span style='color: ${color}; font-style: italic'>${text}</span>`
    });
}

/**
 * Publie dans le chat un message d'information stylisé (div italique).
 *
 * @param {string} message - Le texte déjà localisé/formaté à afficher.
 * @param {object} [options] - Options d'affichage.
 * @param {object} [options.actor] - L'acteur speaker du message.
 *
 * @returns {void}
 */
export function createInfo(message, {actor = null} = {}) {
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `<div style='font-style: italic'>${message}</div>`
    });
}

/**
 * Publie dans le chat un message de statut stylisé (div italique grasse colorée).
 *
 * @param {string} message - Le texte déjà localisé/formaté à afficher.
 * @param {object} [options] - Options d'affichage.
 * @param {object} [options.actor] - L'acteur speaker du message.
 * @param {string} [options.color="green"] - La couleur du texte.
 *
 * @returns {void}
 */
export function createStatus(message, {actor = null, color = "green"} = {}) {
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `<div style='color: ${color};font-style: italic;font-weight: 700'>${message}</div>`
    });
}
