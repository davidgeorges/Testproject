# Revue complète de préproduction

**Date :** 10 septembre 2026
**Périmètre :** application Expo iOS Android Web, API ASP.NET Core, PostgreSQL, Redis, Firebase, Tink, RevenueCat, Expo Push, CI CD et exploitation
**Référence fonctionnelle :** `SmartSave_Cahier_des_charges_V1_v2.docx`, en ignorant son nom commercial comme demandé

## Décision proposée au comité

L'application constitue un prototype intégré solide, mais elle n'est pas prête pour une mise en production publique ni pour une soumission aux stores. L'architecture générale est saine, l'API protège correctement les routes utilisateur et le moteur métier est testé. En revanche, cinq blocages empêchent une sortie fiable : le parcours Tink natif revient vers `localhost`, la suppression complète d'un compte n'est pas garantie, le catalogue partenaire de production est vide, les produits Premium de production ne sont pas configurés et un secret PostgreSQL précédemment communiqué doit être renouvelé.

Le niveau recommandé aujourd'hui est **bêta technique contrôlée sur le Web**, avec des comptes de test. Un build Android interne peut servir à valider l'interface et les fonctions hors banque, mais son parcours Tink n'est pas prêt. Une bêta publique ou une publication store ne doit commencer qu'après clôture des éléments P0 et P1 de ce rapport.

## Résultat synthétique

| Domaine | État | Appréciation |
| --- | --- | --- |
| Produit V1 | Partiel | Parcours principal présent, valeur réelle limitée par le catalogue vide et plusieurs écrans incomplets |
| Interface | Bon prototype | Maquette sombre bien reprise, états principaux présents, accessibilité et appareils réels à valider |
| Backend | Bon socle | Architecture claire, persistance réelle, idempotence et isolation utilisateur bien traitées |
| Open Banking | Web testable | Tink fonctionne en sandbox Web, mais le retour natif, la pagination et le cycle de vie du jeton sont incomplets |
| Authentification | Partiel | E-mail et Google Web fonctionnent ; Google natif, Apple, vérification d'e-mail et MFA restent à finaliser |
| Premium | Partiel | Adaptateur RevenueCat présent ; produits, clés store, couverture des événements et fonctions Premium restent incomplets |
| Notifications | Partiel | File et envoi Expo présents ; reçus, désinscription à la déconnexion et credentials appareils restent à valider |
| Sécurité | Moyen | Bon contrôle d'accès API, mais secrets, export, suppression, webhooks et durcissement opérationnel restent à corriger |
| Conformité | Insuffisant | Aucun dossier juridique exploitable, preuve de consentement, politique publiée ou déclaration store finalisée |
| Exploitation | Insuffisant | Hébergement gratuit, absence d'alerting actif, de preuve de sauvegarde restaurable et de staging isolé |
| Qualité | Moyen à bon | 62 tests passent ; couverture mobile E2E, sécurité, charge et résilience absente |

## Blocages de sortie P0

### P0 01 Parcours bancaire impossible dans une application native

Le backend construit le lien Tink avec une URI de retour configurée. L'environnement actuellement utilisé redirige vers `http://localhost:8081/banking/callback`. Cette adresse ne désigne pas l'application installée sur le téléphone. Le client ouvre le lien par `Linking.openURL`, sans session OAuth native ni gestion complète du deep link.

**Impact :** un utilisateur Android ou iOS peut s'authentifier auprès de la banque puis ne jamais revenir correctement dans l'application.
**Correction :** enregistrer une URI HTTPS universelle ou `subscriptionapp://banking/callback` acceptée par Tink, utiliser `WebBrowser.openAuthSessionAsync`, gérer le deep link, valider `state` et tester le cycle sur appareils physiques.

### P0 02 Suppression de compte non garantie de bout en bout

Quand Firebase Admin est configuré, l'API supprime d'abord l'identité Firebase puis les données PostgreSQL. Une panne de base après la première étape laisse les données financières sans identité permettant à l'utilisateur de recommencer. Quand Firebase Admin n'est pas configuré, le mobile supprime d'abord la base puis tente Firebase ; si Firebase refuse la suppression, le client se déconnecte malgré une identité encore active.

**Impact :** non-respect possible de la demande de suppression et état irrécupérable ou incohérent.
**Correction :** créer une demande de suppression durable, bloquer immédiatement le compte, purger chaque système avec reprises idempotentes, conserver une preuve minimale de traitement, exposer l'état de la demande et tester les pannes entre chaque étape.

### P0 03 Secret PostgreSQL à renouveler

La chaîne de connexion Neon a été communiquée en clair pendant les opérations précédentes. Le scan du dépôt et de son historique n'a pas trouvé ce motif, mais le secret doit être considéré exposé hors Git.

**Impact :** accès direct potentiel à la base si la valeur est encore valide.
**Correction :** renouveler immédiatement le mot de passe Neon, mettre à jour Render, révoquer l'ancien accès, contrôler les journaux de connexion et ne plus transmettre de secret dans une conversation ou un fichier client.

### P0 04 Aucune économie de production sans catalogue partenaire

Les fausses offres ont été retirées, ce qui est correct, mais le catalogue de production démarre vide. Le dashboard observé affiche six abonnements et zéro euro économisable. Le moteur ne peut produire une recommandation actionnable sans offre vérifiée.

**Impact :** la promesse centrale du produit n'est pas délivrée en production.
**Correction :** signer au moins un partenariat réel, définir le format des garanties et frais, importer les offres, mettre en place une validation métier et juridique, suivre les dates de validité et afficher clairement le caractère affilié.

### P0 05 Premium de production non commercialisable

L'application sait appeler RevenueCat, mais le profil EAS de production ne contient aucune clé SDK Apple ou Google. Les produits App Store et Play Store, les abonnements, l'offering et la soumission store ne sont pas prouvés. Plusieurs avantages affichés ne correspondent à aucune fonction livrée.

**Impact :** achat impossible ou promesse commerciale trompeuse.
**Correction :** créer les produits store, associer les packages RevenueCat, ajouter les clés publiques de chaque plateforme dans EAS, tester achat renouvellement annulation remboursement restauration et supprimer de l'écran toute promesse non disponible.

## Risques élevés P1

| ID | Constat vérifié | Impact | Action attendue |
| --- | --- | --- | --- |
| P1 01 | L'export RGPD sérialise les objets `BankConnection` et `PushDevice` complets. `BankConnection` contient `ProviderSecret`. | Divulgation de jetons bancaires chiffrés et de jetons push dans un export utilisateur. | Créer des DTO d'export explicitement autorisés et exclure tous les secrets, jetons, baux techniques et empreintes. |
| P1 02 | Le chiffrement AES GCM du jeton Tink dérive sa clé du secret client Tink. | Une rotation du secret Tink rend tous les jetons stockés illisibles. | Utiliser une clé de chiffrement séparée, versionnée, dans un gestionnaire de secrets ou KMS, avec procédure de rotation. |
| P1 03 | L'import Tink s'arrête après cinq pages de 100 transactions. | Troncature silencieuse au-delà de 500 opérations et abonnements manqués. | Paginer jusqu'à épuisement avec une limite de sécurité visible, stocker un curseur et signaler toute synchronisation partielle. |
| P1 04 | Aucun mécanisme de rafraîchissement de jeton ou de renouvellement continu Tink n'est visible ; l'expiration du consentement est fixée localement à 90 jours. | Synchronisations futures imprévisibles et statut de consentement inexact. | Implémenter le cycle de vie officiel Tink, les événements de consentement et la reconnexion contrôlée. |
| P1 05 | Le mobile utilise la synchronisation HTTP longue avec un délai réseau de 15 secondes alors qu'une file durable existe. | Faux échec côté mobile pendant les appels Tink lents ou le réveil de Render. | Toujours créer un job, puis interroger son état avec reprise et retour en arrière plan. |
| P1 06 | Le worker transforme les erreurs Tink en `SYNC_FAILED` générique et ne passe pas automatiquement la connexion en `reconnect_required`. | Diagnostic médiocre et boucle d'échecs lorsque le jeton est invalide. | Conserver les codes Tink sûrs, classer les erreurs permanentes et notifier une reconnexion. |
| P1 07 | Le webhook Tink exige un secret mais sa présence n'entre pas dans `/health/ready`. | Le service annonce `ready` alors que les mises à jour bancaires automatiques peuvent être inactives. | Vérifier la configuration webhook dans la readiness et tester un événement signé de bout en bout. |
| P1 08 | RevenueCat est authentifié par un en-tête statique uniquement. Le support HMAC avec horodatage n'est pas implémenté. | Rejeu possible d'un corps intercepté et protection inférieure à l'option actuelle de RevenueCat. | Activer et vérifier `X-RevenueCat-Webhook-Signature`, sa fenêtre temporelle et le corps brut. |
| P1 09 | Les événements RevenueCat `TRANSFER`, `BILLING_ISSUE`, `SUBSCRIPTION_PAUSED`, remboursements et changements d'identité ne sont pas traités. | Droits Premium incohérents ou attribués au mauvais utilisateur. | Couvrir l'ensemble des événements utiles et réconcilier régulièrement l'état avec RevenueCat. |
| P1 10 | À la déconnexion, le token Expo n'est pas retiré du backend. | Un appareil partagé peut continuer à recevoir les notifications financières de l'ancien compte. | Désactiver le device côté API avant de supprimer la session et gérer les échecs en reprise. |
| P1 11 | Le serveur traite les tickets Expo mais ne consulte jamais les reçus. | Échecs APNs FCM invisibles et jetons invalides conservés. | Stocker les IDs de tickets, lire les reçus après délai et désactiver `DeviceNotRegistered`. |
| P1 12 | À chaque authentification, l'écran sauvegarde `theme=dark` et `notificationsEnabled=true`. | Les préférences existantes sont écrasées à chaque connexion. | Créer le profil uniquement s'il n'existe pas et fusionner sans écraser les choix enregistrés. |
| P1 13 | Google natif attend des client IDs Android et iOS absents des profils EAS. Apple et biométrie ne sont pas implémentés. | Boutons incomplets ou erreurs sur les builds natifs. | Configurer les clients OAuth natifs et retirer ou livrer Apple biométrie selon le périmètre final. |
| P1 14 | L'acceptation des CGU et de la politique de confidentialité est une case UI sans version ni horodatage persistant. | Impossible de prouver le texte accepté et sa version. | Publier les textes, stocker type version date source et permettre le retrait lorsque pertinent. |
| P1 15 | Les avantages Premium affichent analyses illimitées, alertes de hausse, rapports PDF et support prioritaire, sans implémentation complète ni contrôle d'accès correspondant. | Risque produit, commercial et store. | Définir les droits, les appliquer serveur, livrer chaque fonction ou corriger les libellés. |
| P1 16 | Le filtre Économies « Réalisées » affiche toujours un état vide ; aucun événement de réalisation n'est stocké. | Une vue de la maquette est factice. | Ajouter un statut accepté réalisé refusé, la date, le montant confirmé et un calcul distinct du potentiel. |
| P1 17 | Le back-office est seulement une API protégée par un claim `admin`; aucune interface, gestion des rôles, audit métier des modifications ou double validation. | Catalogue difficile à administrer et erreur humaine non contrôlée. | Construire un outil minimal, journaliser chaque changement et prévoir publication brouillon validation. |
| P1 18 | Render tourne sur une instance gratuite en Virginie, la base Neon se trouve en Europe centrale. | Réveil à froid, délai supérieur au timeout mobile, latence interrégion et questions de transferts de données. | Mettre API base et Redis dans une même région UE avec niveau de service adapté avant la bêta publique. |
| P1 19 | Aucun collecteur OTLP ni service d'alerte actif n'est prouvé. | Incidents et régressions invisibles en dehors des logs Render. | Configurer traces métriques erreurs alertes, masquer les données sensibles et définir les seuils d'astreinte. |
| P1 20 | Aucune restauration de sauvegarde récente n'est attestée. | Perte de données non maîtrisée. | Activer sauvegardes et PITR adaptés, chiffrer, tester une restauration complète et documenter RPO RTO. |
| P1 21 | Expo Doctor échoue : `expo-font` 55.0.8 et 57.0.3 coexistent via `@expo/vector-icons`. | Build natif ou comportement runtime imprévisible. | Aligner les versions Expo compatibles et exiger Expo Doctor 20 sur 20 dans la CI. |
| P1 22 | Aucun test mobile automatisé, E2E bancaire, RevenueCat sandbox, push appareil ou parcours de suppression en panne. | Les parcours les plus risqués régressent sans détection. | Ajouter tests composants et E2E sur vrais builds, fixtures webhook et scénarios de panne. |

## Risques moyens P2

1. Les listes de transactions, abonnements et notifications sont souvent chargées en totalité puis filtrées ou paginées en mémoire. Il faut paginer en SQL et imposer des limites serveur.
2. L'API applique les migrations au démarrage. Une migration lente ou bloquée empêche le déploiement et mélange les droits runtime avec les droits de schéma.
3. Le contrat OpenAPI est public en production et les endpoints de santé révèlent le mode et les intégrations configurées. Ce n'est pas une vulnérabilité directe, mais l'exposition doit être volontaire.
4. Les en-têtes `nosniff`, `DENY`, `no-referrer`, Permissions Policy et `no-store` sont présents. Une politique CSP manque pour la version Web.
5. La terminaison TLS est assurée par Render Cloudflare, mais l'application ne configure pas explicitement les en-têtes transférés ni une redirection HTTPS. Il faut définir le modèle de confiance proxy.
6. Les appels Tink Firebase RevenueCat Expo n'ont pas de stratégie commune de timeout reprise exponentielle circuit breaker et limitation de concurrence.
7. La file de synchronisation retente rapidement sans champ `nextAttemptAt`, sans file morte et sans commande opérateur de reprise.
8. La révocation locale d'un consentement ne garantit pas une révocation distante chez Tink. Le sens présenté à l'utilisateur doit correspondre à l'action réelle.
9. La déconnexion bancaire dépend du succès du fournisseur avant la suppression locale. Il faut pouvoir bloquer localement immédiatement et terminer la révocation distante en arrière plan.
10. Le plafond de cinq banques par utilisateur est contrôlé avant insertion sans verrou métier explicite. Deux requêtes concurrentes peuvent dépasser la limite.
11. La rétention automatique couvre notifications, audits, jobs et idempotence, mais pas les transactions et analyses tant que le compte existe. Une politique par finalité est nécessaire.
12. Les clés publiques Firebase et RevenueCat dans les builds sont normales, mais les restrictions d'API Firebase, App Check et la séparation dev staging production ne sont pas prouvées.
13. La session Firebase native repose sur AsyncStorage. Une conservation dans SecureStore ou un modèle de session plus court réduirait le risque sur un appareil compromis.
14. La vérification d'adresse e-mail et l'authentification multifacteur ne sont pas imposées. Elles sont recommandées pour l'export, la suppression et les actions sensibles.
15. Le rôle administrateur est un simple claim. Il manque une politique d'autorisation explicite, une MFA administrateur et une revue périodique des accès.
16. Le webhook affiliation vérifie un HMAC, mais sans timestamp signé ni fenêtre anti-rejeu indépendante de l'identifiant de conversion.
17. Le calcul du plan RevenueCat se base sur le texte de l'identifiant produit contenant `annual` ou `year`. Utiliser une table de correspondance contrôlée.
18. Les offres peuvent contenir n'importe quelle URL HTTPS créée par un admin. Une liste de domaines partenaires et un écran de sortie réduiraient le phishing et les erreurs.
19. Les erreurs Firebase brutes sont parfois affichées par le mobile. Mapper les codes vers des messages stables sans détail fournisseur.
20. Il n'existe pas de cache hors ligne persistant, de mode maintenance, de version minimale d'application ou de stratégie OTA documentée.
21. L'accessibilité n'est pas qualifiée : petits textes, contraste, Dynamic Type, lecteur d'écran, clavier Web et tailles tactiles doivent être testés.
22. Le support tablette est déclaré sans preuve de recette tablette. Le retirer ou ajouter une vraie matrice de validation.
23. L'internationalisation est seulement amorcée ; de nombreux textes restent écrits directement dans les composants.
24. Le nom, le bundle ID, le package Android, les icônes, splash et métadonnées utilisent encore des valeurs provisoires.
25. Le moteur de catégorisation repose en partie sur des règles de chaînes et une liste limitée de marchands. Il faut mesurer précision rappel et taux de faux positifs sur un jeu français représentatif.
26. Les devises autres que l'euro sont exclues. Ce comportement doit être visible pour les comptes multi devises.
27. Le moteur IA est optionnel et dispose d'un repli déterministe, ce qui est sain, mais aucune clé, aucun modèle de production, aucun budget ni évaluation de qualité n'est attesté.
28. Les métriques internes sont perdues si aucun collecteur OTLP n'est raccordé. Il manque aussi des tableaux de bord métier et des alertes.
29. La CI ne lance pas `npm audit`, l'audit NuGet, Expo Doctor, `dotnet format`, SAST, analyse d'image Docker ou DAST.
30. `dotnet format --verify-no-changes` échoue actuellement sur le fournisseur Tink et deux migrations. La CI ne le détecte pas.

## Écart au cahier des charges fonctionnel

| Exigence V1 | État observé | Écart restant |
| --- | --- | --- |
| Compte, connexion, réinitialisation | Implémenté | Vérification e-mail, MFA et messages d'erreur à renforcer |
| Suppression de compte | Partiel | Orchestration durable et preuve de suppression manquent |
| Une ou plusieurs banques | Web sandbox fonctionnel | Parcours natif, renouvellement, webhook et résilience incomplets |
| Import et synchronisation | Implémenté | Limite silencieuse de 500, timeout mobile et incrémental manquants |
| Détection récurrente | Implémenté | Validation sur données réelles françaises et mesure de qualité manquent |
| Catégorisation | Partiel | Couverture marchands et correction utilisateur plus riche à construire |
| Dashboard | Implémenté | Valeur d'économie nulle sans catalogue réel |
| Opportunités télécom Internet assurance | Structure présente | Catalogue, règles d'équivalence, frais et partenaires absents |
| Fiche de recommandation | Implémentée | Données réelles, contrôle juridique et statut réalisé manquent |
| Notifications push | Partiel | Credentials appareils, reçus, logout et tests réels manquent |
| Premium store | Partiel | Produits et droits fonctionnels non finalisés |
| Back-office minimal | Partiel | Routes API seulement, pas d'interface ni workflow de publication |
| IA explicative | Adaptateur optionnel | Configuration, évaluation, coût et observabilité non validés |
| Sentry et Application Insights | Non livré | OpenTelemetry existe mais aucun backend actif n'est prouvé |
| Staging séparé | Non prouvé | Les configurations observées pointent vers le même Firebase et la même API |
| Tests E2E et sécurité | Non livré | Uniquement tests backend et contrôles statiques de base |
| Build release reproductible | Partiel | Build EAS initié, Expo Doctor échoue et publication store non validée |

## Fonctions affichées mais non terminées

- économies réalisées et confirmation du montant réellement économisé ;
- rapports Premium mensuels PDF ;
- alertes de hausse de prix ;
- support prioritaire ;
- analyses illimitées avec quota ou droit vérifié côté serveur ;
- connexion Google native complète ;
- connexion Apple et biométrie si elles restent dans l'interface ;
- pages CGU, politique de confidentialité, mentions légales, affiliation et support réelles ;
- gestion opérationnelle des partenaires et recommandations ;
- reconnexion bancaire guidée après expiration ou invalidation ;
- synchronisation automatique fiable en arrière plan ;
- interface d'administration et tableaux de bord techniques.

## Sécurité déjà bien traitée

- validation serveur des JWT Firebase avec signature RS256, issuer, audience, durée de vie, `sub` et `auth_time` ;
- contrôle systématique du propriétaire sur les ressources utilisateur examinées ;
- erreurs de production sans stack trace ni détail interne ;
- limite globale de requêtes et taille maximale de corps ;
- idempotence durable et déduplication des transactions et webhooks ;
- comparaisons constantes des secrets de webhook ;
- requêtes EF Core paramétrées et contraintes d'unicité pertinentes ;
- chiffrement authentifié AES GCM du jeton bancaire au repos ;
- conteneur Docker exécuté sans privilège ;
- dépendances .NET verrouillées et aucune vulnérabilité NuGet connue lors de l'audit ;
- en-têtes HTTP de base présents et trafic public servi en HTTPS ;
- mode démo bloqué en production.

## Résultats des contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| Tests .NET Release | 62 réussis, 0 échec, 2 ignorés localement |
| Tests PostgreSQL Redis | Ignorés localement ; la CI fournit les services, dernier résultat distant non vérifié ici |
| TypeScript | Réussi |
| Prettier mobile | Réussi |
| `dotnet format --verify-no-changes` | Échec sur formatage Tink et encodage fin de ligne de deux migrations |
| Expo Doctor | 19 sur 20, échec pour doublon `expo-font` 55 et 57 |
| Audit NuGet | Aucune vulnérabilité connue |
| Audit npm production | 17 modérées, 0 haute, 0 critique |
| Recherche de secrets dans Git | Aucun motif privé recherché trouvé ; les configurations Firebase et clés SDK publiques restent visibles par conception |
| API publique `/health` | 200, mode production, PostgreSQL |
| API publique `/openapi/v1.json` | 200, contrat complet publiquement lisible |
| Headers publics | HTTPS, no-store, nosniff, frame deny, no-referrer, permissions policy présents ; CSP absente |

Les alertes npm concernent surtout des dépendances transitives Expo et React Navigation. `npm audit` propose une rétrogradation cassante vers Expo 46 pour une partie des alertes ; cette commande ne doit pas être appliquée aveuglément. Il faut suivre les versions corrigées compatibles avec Expo SDK 55 et vérifier l'exploitabilité dans le contexte mobile.

## Conformité et publication

Avant une diffusion publique, il faut constituer un dossier vérifiable : responsable de traitement, finalités et bases légales, registre des sous-traitants, accords avec Tink Firebase Google RevenueCat Expo Render Neon et Upstash, lieux de traitement et transferts, durée de conservation par catégorie, exercice des droits, notification d'incident, analyse d'impact si le conseil juridique la juge nécessaire, et règles d'usage des données pour l'affiliation.

L'application doit publier et lier depuis l'interface sa politique de confidentialité, ses CGU, ses mentions légales, les conditions Premium et la transparence d'affiliation. Les consentements nécessaires doivent référencer une version exacte. L'App Store exige la déclaration des données collectées par l'application et ses SDK. Google Play exige la fiche Data safety, une politique de confidentialité, un mécanisme de suppression et la déclaration des fonctions financières. Une validation par un juriste spécialisé en protection des données et services financiers est nécessaire avant production.

## Exploitation et continuité

Il manque un environnement staging réellement séparé, des secrets distincts, un responsable d'incident, des alertes, des objectifs de disponibilité, un budget de capacité, une sauvegarde restaurée récemment, un plan de reprise et une procédure documentée de rotation de chaque secret. Les migrations doivent être exécutées comme une étape contrôlée avec un rôle dédié. La production doit conserver le même artefact validé entre staging et production et disposer d'un rollback testé.

La readiness actuelle vérifie surtout la présence de configuration et la base. Elle ne prouve pas qu'un appel réel à Tink Firebase RevenueCat Expo ou Redis réussira. Ajouter des probes synthétiques non destructives et des parcours de fumée après déploiement.

## Plan de correction recommandé

### Phase 1 dans les 48 heures

1. Renouveler le mot de passe Neon et vérifier les accès.
2. Exclure `ProviderSecret` et les tokens push de l'export.
3. Corriger le callback Tink natif et utiliser la file de synchronisation.
4. Corriger la suppression de compte avec un workflow durable.
5. Retirer les promesses Premium non livrées.
6. Corriger le doublon Expo et exiger Expo Doctor 20 sur 20.

### Phase 2 avant bêta externe

1. Finaliser Tink : pagination complète, rafraîchissement, webhook, reconnexion, erreurs et tests appareil.
2. Désinscrire les tokens push au logout et traiter les reçus Expo.
3. Corriger l'écrasement des préférences à la connexion.
4. Livrer un catalogue d'offres validé et un back-office minimal.
5. Configurer RevenueCat et les produits sandbox avec tous les événements.
6. Créer staging, observabilité, alertes et restauration de sauvegarde.
7. Ajouter tests E2E mobile, charge, sécurité, résilience et accessibilité.

### Phase 3 avant publication store

1. Clore tous les P0 et P1 avec preuves de recette.
2. Finaliser identité visuelle, nom, package IDs, icônes, splash et textes store.
3. Publier les documents juridiques et enregistrer les consentements versionnés.
4. Compléter App Privacy, Data safety et Financial features.
5. Tester achats, restauration, remboursements, push et Open Banking sur iOS et Android physiques.
6. Réaliser une revue juridique et un test d'intrusion indépendant.
7. Exécuter un exercice de rollback, restauration et gestion d'incident.

## Critères de feu vert

Le comité peut autoriser une bêta externe lorsque : aucun P0 n'est ouvert ; les P1 relatifs à l'identité, la banque, la suppression, l'export, Premium, push et sauvegarde sont clos ; la CI est verte avec Expo Doctor ; un parcours complet passe sur iOS et Android ; Tink et RevenueCat ont été testés avec webhooks ; les données de staging sont séparées ; les alertes fonctionnent ; la sauvegarde a été restaurée ; les documents juridiques sont publiés.

La publication publique exige en plus un catalogue réel, les déclarations stores validées, une recette d'accessibilité, un test d'intrusion sans constat critique ou élevé non accepté, et une décision formelle produit sécurité développement.

## Références officielles consultées

- Expo, reçus de notifications push : https://docs.expo.dev/push-notifications/sending-notifications/
- Expo, configuration FCM : https://docs.expo.dev/push-notifications/fcm-credentials/
- Firebase, nature publique et restrictions des clés : https://firebase.google.com/docs/projects/api-keys
- RevenueCat, webhooks et signature HMAC : https://www.revenuecat.com/docs/integrations/webhooks
- RevenueCat, clés publiques et secrètes : https://www.revenuecat.com/docs/projects/authentication
- Apple, informations de confidentialité App Store : https://developer.apple.com/app-store/app-privacy-details/
- Google Play, Data safety : https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play, déclaration des fonctions financières : https://support.google.com/googleplay/android-developer/answer/13849271
- CNIL, recommandation relative aux applications mobiles : https://www.cnil.fr/sites/cnil/files/2024-09/recommandation-applications-mobiles.pdf
- CNIL, définition et contenu d'une AIPD : https://www.cnil.fr/fr/definition/analyse-dimpact-aipd
- OWASP, standard MASVS pour la sécurité mobile : https://mas.owasp.org/MASVS/
- Microsoft, ASP.NET Core derrière un proxy : https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0

## Limites de la revue

Cette revue couvre le code, la configuration versionnée, les endpoints publics et l'exécution locale disponibles le 10 septembre 2026. Elle ne prouve pas le contenu exact des consoles privées, les règles Firebase et Google Cloud, les journaux Neon, les sauvegardes, les credentials APNs FCM, les paramètres Tink et RevenueCat, les protections GitHub, ni le dernier résultat de chaque build EAS. Ces points doivent produire une capture ou un export de configuration et une preuve de test avant le feu vert.
