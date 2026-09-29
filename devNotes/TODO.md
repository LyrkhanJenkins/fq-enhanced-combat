# TODO — FQ Enhanced Combat

Fonctionnalités prévues, avec ce que leur extraction depuis `fq-card-engine` a
déjà appris. Les mesures datent du 27/09/2026 et portent sur fq-card-engine 3.0.0.

## Timer de tour — FAIT le 29/09/2026

Écrit ici, rien à extraire. `src/domain/turn-timer.js` pour la règle,
`src/ui/turn-timer-tracker.js` pour le bandeau, `src/hook/combat-tracker.hook.js`
pour l'affichage.

Ce qui a été tranché :

- **À l'expiration** : la main passe au combattant suivant, avec un message de
  chat qui laisse la trace du tour perdu.
- **Portée** : les tours des combattants appartenant à un joueur
  (`actor.hasPlayerOwner`) seulement — le MJ mène ses créatures à son rythme.
  Un combattant à terre est exclu quand les jets de mort sont actifs : ils
  tiennent déjà son tour et passent la main en deux secondes.
- **Affichage** : un bandeau au-dessus de la liste du combat tracker, chez tout
  le monde, avec le temps en `m:ss` et une barre qui se vide.
- **Mise en pause** : suit `game.paused` par le hook `pauseGame`.
- **Durée** : réglage de monde, curseur de 10 à 300 secondes, 60 par défaut. Une
  nouvelle durée vaut pour le tour en cours, pas seulement pour le suivant.

Deux choix d'architecture qui ont demandé réflexion, et qu'il ne faut pas
défaire :

1. **L'échéance est partagée, pas le décompte.** Le premier MJ actif inscrit
   l'instant de fin du tour dans un drapeau du combat
   (`flags.fq-enhanced-combat.turnTimer`) ; chaque client en déduit le temps
   restant. Un décompte local par client aurait dérivé d'un poste à l'autre, et
   un joueur qui recharge sa page en milieu de tour serait reparti d'un tour plein.
2. **L'instant de référence est `game.time.serverTime`, pas `Date.now()`.** Les
   horloges des postes d'une table ne sont pas à la même heure : une échéance
   absolue lue sur l'horloge locale s'afficherait n'importe comment.

La pause oblige à deux états dans le drapeau : une échéance (`expiresAt`) quand
le temps court, un reste figé (`remaining`) quand il est gelé. C'est ce qui
permet à la reprise de rendre au joueur exactement le temps qu'il lui restait.

Reste ouvert, si le besoin s'en fait sentir : un réglage « notifier seulement »
au lieu de passer la main, et un bandeau réservé au joueur dont c'est le tour.

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
