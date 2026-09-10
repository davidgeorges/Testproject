# Charte graphique mobile — interface claire validée

Version : 1.0  
Écran de référence : `Main/Home`  
Support principal : iOS et Android, orientation portrait  
Base de conception : **390 × 844 points**

Cette charte décrit l’interface validée de l’accueil. Elle est la source de vérité pour étendre le même langage visuel aux autres pages. Le nom commercial du produit reste provisoire et ne doit pas être intégré dans les composants partagés.

## 1. Intention visuelle

L’interface doit évoquer un assistant budget simple, moderne et accessible. Elle utilise un fond gris très clair, des surfaces blanches, une encre presque noire et un jaune vif comme accent principal. Le violet sert aux graphiques, comparaisons et détails décoratifs discrets.

Les écrans doivent rester aérés malgré une densité d’information élevée. L’utilisateur doit identifier en quelques secondes :

1. la valeur principale de la page ;
2. les actions immédiates ;
3. les éléments récents ou prioritaires ;
4. la navigation principale.

Les composants ne doivent jamais simuler une donnée. Les montants, compteurs, dates, catégories et états viennent du backend. Un chargement affiche `—`, un squelette ou un message de chargement. Une collection vide affiche un état vide explicite.

## 2. Palette officielle

| Rôle | Valeur | Utilisation |
|---|---:|---|
| Fond de page | `#F4F3F7` | Fond général de tous les écrans clairs |
| Surface principale | `#FFFFFF` | Cartes, recherche, boutons rapides, navigation |
| Encre principale | `#171719` | Titres, montants et icônes actives |
| Texte courant | `#242328` | Libellés et lignes de liste |
| Texte secondaire | `#858489` | Actions secondaires, dates, métadonnées |
| Texte discret | `#A4A3A9` | Placeholders et informations désactivées |
| Séparateur | `#F0EFF2` | Lignes internes aux listes uniquement |
| Jaune principal | `#FFD900` | Accent, carte principale et action centrale |
| Jaune lumineux | `#FFE839` | Départ du dégradé principal |
| Jaune pâle | `#FFF26A80` | Halo décoratif à l’intérieur d’une carte jaune |
| Violet profond | `#3518B9` | Série secondaire ou détail décoratif |
| Violet clair | `#D8A9EF` | Comparaison ou état secondaire |
| Vert positif | `#10A330` | Revenus, économies confirmées et succès |
| Rouge négatif | `#B21D1D` | Dépassement de budget ou erreur bloquante |
| Avatar neutre | `#E8D6C8` | Avatar sans photo |

### Règles de couleur

- Une page utilise au maximum un grand composant jaune.
- Le violet ne remplace pas le jaune pour l’action principale.
- Le vert indique une valeur réellement positive. Il ne colore pas le fond complet d’une carte.
- Le rouge est réservé aux dépassements et erreurs. Une dépense ordinaire reste en encre principale.
- Les cartes de contenu restent blanches. Les grands aplats colorés sont réservés aux résumés.
- Aucun dégradé vert/bleu ou effet sombre translucide ne doit être réintroduit dans ce thème.

## 3. Typographie

Police : police système native, déclarée `System` dans le composant `Label`.

| Style | Taille | Interligne | Graisse | Usage |
|---|---:|---:|---:|---|
| Montant principal | 27 | 34 | 900 | Valeur de la grande carte |
| Titre de carte principal | 19 | automatique | 900 | Nom du résumé |
| Titre de section | 18 | 22 environ | 800 | `Aperçu`, `Historique`, titres de blocs |
| Titre de ligne | 15 | 20 | 700 | Marchand, abonnement, catégorie |
| Corps | 13–14 | 18–20 | 500 | Description courte |
| Action secondaire | 12–13 | 16 | 500 | `Voir tout`, `Voir plus` |
| Métadonnée | 11 | 15 | 500 | Banque, catégorie, date |
| Libellé d’action | 10 | 12 | 700 | Actions rapides et navigation |
| Sur-titre | 9–10 | 12 | 700 | Libellé en capitales au-dessus d’un montant |

Les grands montants utilisent un espacement de lettre compris entre `-0.8` et `-0.4`. Les sur-titres utilisent des capitales et `letterSpacing: 0.7`. Une ligne de liste doit rester sur une ligne avec ellipse si nécessaire.

## 4. Grille, rythme et dimensions

La grille repose sur des multiples de 4 avec quelques valeurs optiques intermédiaires.

- Marge horizontale de page : **14 pt**.
- Espacement horizontal standard : **10–11 pt**.
- Espacement entre grandes sections : **18–24 pt**.
- Padding interne d’une carte : **15–17 pt**.
- Hauteur minimale d’une ligne de liste : **62 pt**.
- Hauteur de l’en-tête : **57 pt**.
- Padding inférieur d’une page avec navigation : **108 pt minimum**.
- Hauteur de la barre inférieure : **82 pt**.
- Zone tactile minimale : **43 × 43 pt** pour une action isolée.

Sur une largeur différente de 390 pt, les marges restent fixes et les cartes utilisent `left` et `right` plutôt qu’une largeur fixe. Les quatre actions rapides utilisent chacune `flex: 1`. À partir d’une largeur utile inférieure à 340 pt, les libellés peuvent passer sur deux lignes, mais les icônes ne rétrécissent pas.

## 5. Rayons et profondeur

| Élément | Rayon |
|---|---:|
| Carte principale colorée | 24 pt |
| Carte de contenu blanche | 17 pt |
| Bouton rapide | 19 pt |
| Champ de recherche | 23 pt |
| Bouton circulaire | 50 % de sa taille |
| Navigation, coins supérieurs | 25 pt |

Les ombres doivent rester diffuses et discrètes :

```ts
export const shadows = {
  card: {
    shadowColor: '#34313D',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  yellowHero: {
    shadowColor: '#B79B00',
    shadowOpacity: 0.20,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 9 },
  },
  bottomNav: {
    shadowColor: '#25233A',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -5 },
  },
};
```

Ne pas ajouter de bordure visible autour des cartes blanches. Utiliser un séparateur interne lorsque plusieurs lignes partagent la même carte.

## 6. Anatomie obligatoire d’un écran principal

### 6.1 En-tête compact

L’en-tête comporte trois zones :

- avatar de **43 × 43 pt** à gauche ;
- champ de recherche blanc de **46 pt** de haut au centre ;
- action contextuelle circulaire de **43 × 43 pt** à droite.

L’avatar ouvre le profil. Sans photo réelle, il affiche l’initiale du prénom. Le petit badge réglages mesure **18 × 18 pt**. Le champ recherche filtre le contenu réel de la page. L’action de droite ouvre les notifications ou l’action principale propre à l’écran.

Une page de détail utilise à la place un bouton retour ou fermeture de 43 pt, un titre central et une action optionnelle à droite. Elle conserve le même fond et le même rythme vertical.

### 6.2 En-tête de section

Le titre est à gauche en 18/800. L’action est à droite en 12–13 et en gris secondaire. La ligne utilise `alignItems: 'center'`. Aucun soulignement n’est nécessaire.

### 6.3 Résumé principal

Le résumé est un **panneau mensuel unique** afin de ne pas évoquer un portefeuille de cartes bancaires. Il mesure au minimum **215 pt** de haut, occupe toute la largeur utile et utilise un rayon de **24 pt**.

Le panneau jaune utilise le dégradé `#FFE839 → #FFD900`. Un halo circulaire jaune pâle peut dépasser dans l’angle supérieur droit et une forme violette très transparente peut décorer le bas du panneau. Aucun élément ne doit ressembler à une carte de paiement : pas de pile de cartes, puce, symbole sans-contact, numéro ou réseau de paiement.

Sa hiérarchie est fixe :

1. icône calendrier, libellé `Ce mois` et période réelle ;
2. montant dépensé principal ;
3. jauge calculée depuis le budget mensuel ou, à défaut, depuis les revenus ;
4. libellé de progression et montant disponible.

Si aucun budget ni revenu n’est disponible, la jauge reste vide et propose de définir un budget. Toute la surface ouvre le détail Finances. Les autres écrans reprennent ce panneau avec leur propre indicateur principal, sans réintroduire la métaphore bancaire.

### 6.4 Actions rapides

Afficher au maximum quatre actions sur une ligne. Chaque action contient :

- une surface blanche de **57 × 63 pt**, rayon 19 ;
- un noyau sombre de **24 × 28 pt**, rayon 7 ;
- une icône Ionicons blanche de 15 pt ;
- un libellé centré en 10/700, placé 8 pt sous la surface.

Les actions déclenchent une navigation ou une opération existante. Ne pas afficher un bouton inactif pour compléter la ligne.

### 6.5 Carte de liste

Une liste est contenue dans une seule carte blanche, rayon 17. Son en-tête utilise 15 pt de padding horizontal, 17 pt en haut et 9 pt avant la première ligne. Chaque ligne comprend :

- une icône ou initiale de **40 × 40 pt** ;
- un titre 15/700 ;
- une métadonnée 11/500 ;
- une valeur alignée à droite 14/800 ;
- un séparateur `#F0EFF2`, sauf après la dernière ligne.

Un revenu peut utiliser un disque jaune pâle et une valeur verte. Une dépense utilise un disque sombre et une valeur noire.

### 6.6 Navigation inférieure

La navigation comporte cinq entrées : Accueil, Abonnements, Finances, Économies et Profil.

- surface blanche presque opaque `#FFFFFFFA` ;
- hauteur 82 pt ;
- coins supérieurs de 25 pt ;
- icônes ordinaires de 22 pt ;
- texte de 10 pt ;
- entrée active en `#171719` ;
- entrées inactives en `#929295`.

L’entrée centrale Finances utilise un disque jaune de **55 × 55 pt**, bordé de 5 pt dans la couleur du fond et remonté de 18 pt. Le contenu d’une page doit pouvoir défiler derrière la barre, avec un padding inférieur suffisant pour rester accessible.

Le profil conserve le comportement validé : pas de barre inférieure, bouton de fermeture en haut pour revenir à l’écran précédent.

## 7. Iconographie

Bibliothèque officielle : `Ionicons` via `@expo/vector-icons`.

- Trait fin ou moyen pour les icônes de navigation et d’en-tête.
- Icône pleine autorisée dans un noyau sombre ou pour l’état actif.
- Taille courante : 20–23 pt.
- Taille interne aux actions rapides : 15 pt.
- Une même action conserve la même icône sur tous les écrans.
- Les emojis ne remplacent pas les icônes d’interface.

## 8. États et interactions

### Pression

- Bouton ou ligne : opacité `0.65–0.72`.
- Grande carte : opacité `0.90`.
- Ne pas déplacer brutalement le composant lors de la pression.

### Animation

Les animations durent **160 à 240 ms**, avec une décélération douce. Elles sont réservées à :

- apparition d’une carte ou d’un état ;
- sélection d’un onglet ;
- changement d’une période ;
- développement d’un détail ;
- mise à jour d’un montant après retour du serveur.

Éviter les rebonds importants, rotations décoratives continues et arrière-plans animés.

### Chargement

- Conserver les dimensions finales pour éviter les sauts de mise en page.
- Afficher `—` à la place d’un montant encore inconnu.
- Une liste utilise un libellé centré ou un squelette de même hauteur.
- Une erreur locale reste dans le composant concerné avec une action Réessayer.

### Accessibilité

- Toute zone pressable reçoit `accessibilityRole` et `accessibilityLabel`.
- Zone tactile minimale : 43 pt.
- Le sens ne repose jamais uniquement sur une couleur.
- Les textes doivent accepter l’agrandissement système sans masquer un bouton critique.
- Les contrastes doivent rester lisibles en plein jour.

## 9. Graphiques et données chiffrées

Les graphiques suivent la même palette :

- série principale : `#FFD900` avec contour `#171719` si nécessaire ;
- série de comparaison : `#3518B9` ;
- grille : `#E7E6EA` ;
- labels : `#858489` ;
- valeur sélectionnée : encre principale sur bulle blanche.

Un graphique est placé dans une carte blanche de rayon 17. Il ne dépasse pas 220 pt de haut sur mobile. Montrer au maximum deux séries simultanées. Les axes affichent des libellés courts et les valeurs détaillées apparaissent au toucher. Toute donnée doit venir du backend et indiquer sa période.

## 10. Application aux autres pages

| Page | Résumé principal | Actions rapides | Liste principale |
|---|---|---|---|
| Abonnements | Coût mensuel + nombre actif | Rechercher, catégories, à vérifier, synchroniser | Abonnements détectés |
| Finances | Dépensé + reste du budget | Transactions, budgets, comptes, exporter | Dernières transactions |
| Économies | Économie annuelle potentielle | Recommandations, réalisées, catégories, historique | Opportunités réelles |
| Banque/Connexions | Nombre de banques et dernière synchro | Ajouter, synchroniser, autorisations, aide | Comptes connectés |
| Détail abonnement | Prix et prochaine échéance | Modifier, catégorie, historique, résilier/aide | Paiements associés |
| Profil | En-tête de détail sans bottom bar | Aucun groupe artificiel | Réglages regroupés dans une carte blanche |

Une page ne doit pas recopier aveuglément la métaphore de carte bancaire. Elle reprend les proportions, couleurs, surfaces et hiérarchie tout en représentant la bonne information métier.

## 11. Règles de contenu

- Employer des phrases courtes et concrètes.
- Afficher la période près du montant : `ce mois`, `/ mois`, `/ an`.
- Indiquer la source réelle dans la métadonnée : banque, connexion ou détection.
- Utiliser `Voir tout` pour ouvrir une collection et `Voir plus` pour prolonger une liste.
- Éviter le jargon bancaire et les formulations alarmistes.
- Ne jamais proposer de paiement ou de virement vers un tiers.

## 12. Référence technique

L’implémentation validée se trouve dans :

- `apps/mobile/src/design/MainScreens.tsx` — `DashboardScreen` ;
- `apps/mobile/src/design/MainScreens.tsx` — `BottomBar` ;
- `apps/mobile/src/design/ui.tsx` — `Page`, `Label` et composants partagés ;
- `apps/mobile/src/services/api.ts` — sources de données financières ;
- `apps/mobile/src/utils/format.ts` — formatage des montants et dates.

Les autres écrans doivent extraire des composants partagés dès qu’un même motif apparaît deux fois. Les valeurs de couleur, dimensions et ombres de cette charte doivent être centralisées dans un fichier de tokens avant une refonte globale afin d’éviter les divergences.

## 13. Checklist de validation d’un nouvel écran

- [ ] Fond `#F4F3F7` et marge horizontale 14 pt.
- [ ] Une seule information principale immédiatement visible.
- [ ] En-tête compact conforme ou variante détail conforme.
- [ ] Titres, montants et métadonnées aux bonnes tailles.
- [ ] Cartes blanches sans bordure visible, rayon 17.
- [ ] Jaune réservé à l’accent principal.
- [ ] Quatre actions rapides maximum.
- [ ] États chargement, vide, erreur et succès présents.
- [ ] Données obtenues par API, sans valeur simulée.
- [ ] Navigation et retour réellement fonctionnels.
- [ ] Contenu non masqué par la barre inférieure.
- [ ] Contrôle à 390 × 844 pt puis sur un petit écran.
- [ ] TypeScript et export Expo validés.
