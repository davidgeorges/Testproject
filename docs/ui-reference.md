# Interface de référence

> La charte active de l’interface claire validée est décrite dans
> [`charte-graphique-mobile.md`](./charte-graphique-mobile.md). Ce document historique décrit la
> première planche sombre et ne doit plus servir de référence pour créer de nouveaux écrans.

La refonte reprend la planche sombre fournie par l’utilisateur. L’application reste en React Native / Expo : les textes, champs, cartes, listes, boutons, graphiques et la navigation sont des composants interactifs. L’ancien tableau de bord large est remplacé par une composition mobile à une colonne.

Sur ordinateur, un cadre de 390 × 844 points, adapté à la hauteur disponible, permet d’explorer les 23 vues depuis le sélecteur latéral. Sur petit écran, l’interface occupe la largeur disponible et le sélecteur est accessible par le bouton grille. Le nom commercial reste à définir ; le logo et le libellé du splash sont provisoires.

Les vues comprennent le splash, la connexion, l’inscription, quatre étapes d’onboarding, la sélection bancaire, la synchronisation, le dashboard, les abonnements et leur détail, les économies et leur détail, Premium, le profil, les notifications, les paramètres, les états erreur/absence d’économie/réussite et le menu. Le dernier accès de la planche montre l’accueil sombre. La réinitialisation du mot de passe et les pages d’information complètent les liens de navigation.

Les illustrations, le portrait et certains logos sont réutilisés depuis la planche fournie, affichés dans des fenêtres de cadrage React Native (`ReferenceCrop`). Leur netteté reste celle de cette image composite : les sources graphiques originales seront préférables pour les assets de production. Aucun écran entier n’est remplacé par une image.

## Données et fonctionnement

Le mode maquette utilise des exemples explicitement identifiés en dehors du cadre mobile. Il conserve les chiffres affichés dans la référence, y compris ses différences entre le dashboard et les détails : les valeurs 420 €, 496 €, 180 € et 240 € ne forment pas un jeu de données comptable cohérent. Ces exemples ne sont jamais injectés dans le moteur métier.

Le parcours **Connexion bancaire → Autoriser et continuer** bascule sur l’API locale avec une banque fictive. Les chiffres des mêmes composants proviennent alors du serveur. Revenir à un écran du sélecteur repasse en mode maquette sans effacer la session de test. Les notifications affichent les exemples de la maquette en mode aperçu. Dans le parcours connecté, elles proviennent de l’API, sont générées après la synchronisation et peuvent être marquées comme lues. Les formulaires d’authentification et les tarifs Premium restent des présentations de démonstration ; ils ne créent pas d’identité, ne valident pas de souscription et n’effectuent pas de paiement.

Les composants partagés sont dans `src/design/ui.tsx`, les exemples et hooks de données dans `src/design/reference.ts`, et les écrans dans `MainScreens.tsx`, `EntryScreens.tsx` et `AccountScreens.tsx`. Les anciens chemins `src/features` réexportent ces écrans afin de conserver une entrée par fonctionnalité.

## Vérification

Contrôle visuel des vues de la planche dans le navigateur, puis contrôle sur petit écran. Parcours bancaire simulé vérifié jusqu’au dashboard calculé et à l’enregistrement d’un clic partenaire. TypeScript, formatage et exports des bundles web/iOS/Android vérifiés ; la compilation native et la recette sur appareils restent distinctes de ces exports.
