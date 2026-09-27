# Release Notes

## v3.0.0

Initialisation du module : l'ossature est en place, aucune fonctionnalité n'est
encore embarquée.

FQ Enhanced Combat est le futur hôte des fonctionnalités de combat de
fq-card-engine qui relèvent de dnd5e plutôt que de Final Quest — extraites une à
une, pour être utilisables sans le système de cartes.

Le numéro de version suit celui de fq-card-engine et de fq-restrain-movement :
les trois modules sont publiés ensemble.

### Ossature

- Manifeste `module.json` : dnd5e 6.x, Foundry 14, aucune dépendance de module,
  socket désactivé — chaque extraction ajoutera ce dont elle a besoin.
- Chaîne de chargement `src/init-enhanced-combat.js` (façade
  `window.FqEnhancedCombatModule` et espace `CONFIG.FqEnhancedCombat`) puis les
  hooks `init` et `setup`.
- Réglage « Journaux de débogage », traduit en anglais et en français.
- Interface publique `game.modules.get("fq-enhanced-combat").api`, vide pour
  l'instant : le point d'entrée par lequel fq-card-engine appellera ce module.
- Outillage reprenant celui de fq-card-engine : ESLint (mêmes règles), Vitest,
  et une CI GitHub (lint + tests, release sur tag).
