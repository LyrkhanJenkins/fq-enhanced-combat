# Release Notes

## v3.0.0

Premier module : l'ossature, deux fonctionnalités reprises de fq-card-engine et
une écrite ici. Les trois sont désactivées par défaut.

FQ Enhanced Combat est l'hôte des fonctionnalités de combat de fq-card-engine qui
relèvent de dnd5e plutôt que de Final Quest — extraites une à une, pour être
utilisables sans le système de cartes.

Le numéro de version suit celui de fq-card-engine et de fq-restrain-movement :
les trois modules sont publiés ensemble.

### Timer de tour

Écrit ici, rien à extraire : un compte à rebours sur le tour des combattants
appartenant à un joueur, qui passe la main au combattant suivant à l'expiration.

- Bandeau dans le combat tracker : le temps restant en `m:ss`, une barre qui se
  vide, une alerte dans les cinq dernières secondes.
- **Le même décompte pour tous.** Le premier MJ actif inscrit l'échéance du tour
  dans un drapeau du combat et chaque client en déduit le temps restant, à partir
  de l'heure du serveur (`game.time.serverTime`) et non de l'horloge locale. Un
  joueur qui recharge sa page en milieu de tour voit le temps qu'il lui reste
  vraiment.
- La pause de Foundry gèle le compte à rebours et la reprise rend au joueur
  exactement le temps qu'il lui restait : une interruption de séance ne mange
  plus un tour.
- Les tours menés par le MJ ne sont pas chronométrés, non plus que celui d'un
  combattant à 0 point de vie quand les jets de mort le prennent déjà en charge.
- Deux réglages de monde : l'activation, et la durée d'un tour (curseur de 10 à
  300 secondes, 60 par défaut). Un changement vaut pour le tour en cours.

### Jets de sauvegarde contre la mort

Au début du tour d'un combattant à 0 point de vie : jet de sauvegarde pour un
personnage (trois réussites le remettent à 1 point de vie, trois échecs le tuent),
dissipation pour un sbire, sortie de combat pour un PNJ.

### Initiative lancée d'office

À l'entrée en combat, l'initiative est lancée pour tous les combattants qui n'en
ont pas encore.

### Ossature

- Manifeste `module.json` : dnd5e 6.x, Foundry 14, aucune dépendance de module,
  socket désactivé — chaque extraction ajoutera ce dont elle a besoin.
- Chaîne de chargement `src/init-enhanced-combat.js` (façade
  `window.FqEnhancedCombatModule` et espace `CONFIG.FqEnhancedCombat`) puis les
  hooks `init` et `setup`.
- Réglage « Journaux de débogage », traduit en anglais et en français.
- Interface publique `game.modules.get("fq-enhanced-combat").api` : le point
  d'entrée par lequel fq-card-engine interroge ce module (`deathSave.skipsTurn`
  pour savoir si un début de tour lui échappe, `turnTimer.remainingMs` pour le
  temps restant au tour courant).
- Outillage reprenant celui de fq-card-engine : ESLint (mêmes règles), Vitest,
  et une CI GitHub (lint + tests, release sur tag).
