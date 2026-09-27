# TODO — FQ Enhanced Combat

Fonctionnalités prévues, avec ce que leur extraction depuis `fq-card-engine` a
déjà appris. Les mesures datent du 27/09/2026 et portent sur fq-card-engine 3.0.0.

## Timer de tour

Nouvelle fonctionnalité, à écrire ici — rien à extraire.

Un compte à rebours pendant le tour du combattant actif, pour les tables qui
veulent tenir le rythme. Points à trancher avant de commencer :

- **À l'expiration** : notifier seulement, ou passer la main au combattant
  suivant ? Un passage automatique est plus efficace mais peut couper un joueur
  au milieu d'une action.
- **Portée de l'affichage** : visible par tous, ou seulement par le joueur dont
  c'est le tour ?
- **Mise en pause** : suivre la pause de Foundry (`game.paused`) semble
  nécessaire, sinon le chronomètre tourne pendant une interruption de séance.
- **Durée** : un réglage de monde, en secondes.

Le hook `combatTurnChange` est déjà utilisé par les jets de mort
(`../src/hook/combat.hook.js`) : c'est là que le timer se remettra à zéro.

## Attaques d'opportunité

Reportées le 27/09/2026 : **trop liées au pipeline de fq-card-engine en l'état.**

Les quatre fichiers concernés sont propres (`opportunity-attack.js` 420 lignes,
`reach-profile.js` 112, `reach-rules.js` 93, `reaction-budget.js` 104) et ne
mentionnent jamais les cartes. Le problème est ailleurs : ils sont branchés en
**trois points** de `src/hook/integration/dnd5e.hook.js` du moteur de cartes.

- `OpportunityAttack.rememberContextFor(activity)` renvoie `true` au
  `dnd5e.preUseActivity`, ce qui **court-circuite le pipeline du moteur** : ni
  consommation des ressources FQ, ni ciblage.
- `OpportunityAttack.consumeContextFor(subject)` récupère la cible et le jeton
  source au `dnd5e.rollDamageV2`.
- Le chat du moteur affiche ensuite le tag « attaque d'opportunité ».

Autrement dit, les attaques d'opportunité **délèguent leur résolution de dégâts
et leur affichage au moteur de cartes**. Les extraire telles quelles imposerait
une API bidirectionnelle entre les deux modules, soit exactement la dépendance
qu'on cherche à éviter.

Prérequis avant de s'y remettre : que les attaques d'opportunité sachent résoudre
leurs dégâts par le pipeline dnd5e standard (`activity.use()`), sans rien attendre
de fq-card-engine. Le moteur pourra alors, s'il est présent, se contenter de
reconnaître une attaque d'opportunité pour l'afficher à sa façon.

À dupliquer ici le jour venu (ne pas partager : voir plus bas) —
`Tokens.areEnemies`, `Geometry.distanceBetweenTokens` et
`getMinDistanceBetweenTwoToken`, `ConditionProbe.of` avec la table
`CONDITION_EFFECTS`, et deux méthodes d'arme équipée :
`getEquippedMeleeReach` et le déclenchement de la première arme de mêlée.

## Tooltip de distance entre jetons

Reporté pour la même raison, plus nette encore : `target-distance-tooltip.js`
(146 lignes) n'a **aucun déclencheur propre**. C'est `card-actions.js` du moteur
de cartes qui l'active et le désactive, pendant le ciblage d'une carte.

Il faudrait donc lui donner un déclencheur autonome — s'afficher pendant un
ciblage dnd5e ordinaire, par exemple. C'est une fonctionnalité à concevoir, pas
un déplacement de fichier.

## Règle pour toute extraction à venir

**Ne jamais partager une brique avec fq-card-engine : la dupliquer.** Le nombre de
fichiers du moteur qui en dépendent, mesuré le 27/09/2026 :

| Brique | Consommateurs dans fq-card-engine |
|---|---|
| `domain/constants.js` | 33 |
| `engine/shared/targeting-predicates.js` | 14 |
| `core/utils/chat.utils.js` | 9 |
| `engine/shared/geometry.js` | 7 |
| `engine/roll/weapon-damage.js` | 7 |

Emprunter l'une d'elles rendrait fq-card-engine dépendant de CE module pour son
ciblage et ses dégâts — l'inverse du but. Les briques dupliquées ici (couleurs,
messages de chat, désignation du premier MJ actif) sont stables : elles ne
décriront jamais autre chose qu'une scène et un chat Foundry.
