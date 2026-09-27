import {MODULE_ID} from "../core/constants.js";
import {info} from "../core/utils/log.utils.js";

Hooks.once("setup", function () {
    // Les réglages sont relevés une fois, ici : `init` enregistre, `setup` lit.
    // Le reste du module se sert de CONFIG (voir `src/init-enhanced-combat.js`).
    CONFIG.FqEnhancedCombat.options.debug = game.settings.get(MODULE_ID, "Debug");

    // Interface publique offerte aux autres modules :
    // `game.modules.get("fq-enhanced-combat").api`. Vide pour l'instant — c'est
    // par là que fq-card-engine appellera les fonctionnalités qu'il lui cède.
    const module = game.modules.get(MODULE_ID);
    if (module) {
        module.api = {};
    }

    info(`prêt (v${module?.version ?? "inconnue"})`);
});
