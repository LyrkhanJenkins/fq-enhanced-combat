import {MODULE_ID} from "../core/constants.js";
import {info} from "../core/utils/log.utils.js";
import DeathSave from "../domain/death-save.js";

Hooks.once("setup", function () {
    // Les réglages sont relevés une fois, ici : `init` enregistre, `setup` lit.
    // Le reste du module se sert de CONFIG (voir `src/init-enhanced-combat.js`).
    CONFIG.FqEnhancedCombat.options.debug = game.settings.get(MODULE_ID, "Debug");

    // Interface publique offerte aux autres modules :
    // `game.modules.get("fq-enhanced-combat").api`. Vide pour l'instant — c'est
    // par là que fq-card-engine appellera les fonctionnalités qu'il lui cède.
    const module = game.modules.get(MODULE_ID);
    if (module) {
        module.api = {
            /**
             * Jets de sauvegarde contre la mort. `skipsTurn` dit si le début de
             * tour d'un acteur est pris en charge ici : fq-card-engine s'en sert
             * pour ne pas faire piocher un porteur à terre.
             */
            deathSave: {
                isEnabled: () => DeathSave.isEnabled(),
                skipsTurn: actor => DeathSave.skipsTurn(actor)
            }
        };
    }

    info(`prêt (v${module?.version ?? "inconnue"})`);
});
