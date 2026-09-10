# Remédiation après la revue complète

**Date :** 10 septembre 2026
**Référence :** `audit-complet-application-2026-09-10.md`

## Résultat

Toutes les corrections prioritaires réalisables uniquement dans le dépôt ont été appliquées. Les éléments encore ouverts nécessitent une console fournisseur, un contrat, une identité d’entreprise, une décision juridique, un appareil physique ou un service payant. Aucun achat n’a été effectué.

## Éléments corrigés

| Référence audit | Correction livrée |
| --- | --- |
| P0 01 | Parcours Tink natif avec `openAuthSessionAsync`, deep link dédié et état OAuth signé, lié à l’utilisateur et expirant après dix minutes. |
| P0 02 | Demande de suppression persistante hors du graphe utilisateur, worker idempotent, reprise après panne, limite de tentatives et états consultables. Les données sont supprimées avant l’identité Firebase. |
| P0 05 / P1 15 | Avantages Premium alignés sur les fonctions réelles. Limite gratuite et alternatives Premium appliquées par l’API. Alertes d’économie réservées au droit Premium actif. |
| P1 01 | Export utilisateur fondé sur des DTO autorisés ; secrets Tink et jetons push exclus, avec test anti-régression. |
| P1 02 | Clé de chiffrement bancaire séparée et format de ciphertext versionné ; lecture des anciennes valeurs conservée pour migration. |
| P1 03 | Pagination Tink jusqu’à épuisement, limite de sécurité de 100 pages/10 000 opérations et erreur explicite plutôt qu’une troncature silencieuse. |
| P1 05–06 | Synchronisation mobile par job durable et interrogation d’état. Codes Tink conservés, erreurs permanentes classées et reconnexion demandée. |
| P1 07 | Webhook Tink Events v2 créé pour `refresh:finished`, `account-transactions:modified` et `account:updated`. Le corps brut est vérifié avec `X-Tink-Signature` (`t=…,v1=…`), HMAC-SHA256, comparaison en temps constant et fenêtre anti-rejeu de dix minutes. |
| P1 08 | Signature HMAC RevenueCat sur le corps brut avec timestamp et fenêtre anti-rejeu de cinq minutes. |
| P1 10–11 | Désinscription push au logout ; tickets Expo persistés, reçus contrôlés après quinze minutes, reprises et désactivation de `DeviceNotRegistered`. |
| P1 12 | Le profil existant et ses préférences ne sont plus écrasés lors de l’authentification. |
| P1 13 | Boutons Apple et biométrie non fonctionnels retirés. Messages Firebase internes remplacés par des messages utilisateurs stables. |
| P1 14 | Consentement CGU/confidentialité versionné, horodaté, persistant et idempotent. |
| P1 16 | Économie réalisée persistée avec date et montant annuel confirmé ; filtre et total Réalisées fonctionnels. |
| P1 17 | Chaque création/modification/désactivation d’offre administrateur produit maintenant un audit métier. |
| P1 21 | Arbre Expo dédupliqué ; Expo Doctor passe 20 contrôles sur 20 et est obligatoire en CI. |
| P2 03–04 | OpenAPI retiré de la production, informations de mode retirées de `/health`, CSP et HSTS ajoutées, en tenant compte du proxy HTTPS Render. |
| P2 10 | Plafond de cinq banques sérialisé en PostgreSQL par verrou transactionnel pour éviter la course concurrente. |
| P2 16 | Webhook d’affiliation protégé par timestamp signé et fenêtre anti-rejeu. |
| P2 17 | Plans RevenueCat déterminés par une table d’identifiants produits exacte, plus par recherche de mots dans le nom. |
| P2 18 | URLs d’offres limitées en production aux domaines partenaires configurés. |
| P2 19 | Erreurs Firebase mappées sans exposition des messages fournisseur. |
| P2 29–30 | CI enrichie avec format .NET, audit NuGet, audit npm niveau élevé, Expo Doctor, Dependabot npm/NuGet/Docker/Actions. Format .NET réparé. |

Autres changements livrés : suppression de compte mobile sans faux succès, webhook RevenueCat étendu aux pauses, problèmes de facturation et remboursements, audit des consentements et économies réalisées, clés ASP.NET persistées dans PostgreSQL entre les redéploiements, image Alpine complétée pour Npgsql, configuration Tink native documentée, procédures de réponse à incident, rotation, sauvegarde/restauration, publication et inventaire des données.

## Validation exécutée

| Contrôle | Résultat |
| --- | --- |
| Build .NET Release | réussi, 0 avertissement |
| Tests .NET | 67 réussis, 0 échec, 2 ignorés faute de Docker local |
| TypeScript | réussi |
| Prettier | réussi |
| Export Expo Web | réussi |
| Export Expo Android et iOS | réussi |
| Expo Doctor | 20/20 |
| Audit NuGet transitif | aucune vulnérabilité connue |
| Audit npm production | 0 haute, 0 critique ; 17 modérées transitives, sans correctif compatible complet |
| Script de migrations idempotent | régénéré avec les opérations durables |

Les deux tests ignorés couvrent PostgreSQL et Redis et sont exécutés par la CI avec ses services. Docker Desktop n’était pas actif sur la machine pendant cette validation, donc l’image Docker locale n’a pas été reconstruite.

## Actions qui nécessitent un accès externe ou une décision

1. **Neon :** valider dans la console la réinitialisation du mot de passe PostgreSQL précédemment communiqué, puis mettre à jour immédiatement `ConnectionStrings__Postgres` sur Render et vérifier la readiness.
2. **Tink :** se reconnecter à la console pour ajouter `subscriptionapp://banking/callback` aux URI autorisées, puis tester le retour sur Android/iOS physiques. Le webhook Events v2 est déjà créé, signé et testé en production.
3. **RevenueCat et stores :** les produits gratuits du Test Store `monthly` et `yearly` sont associés à l’offering. Les produits sandbox Apple/Google exigent les comptes développeur et la création préalable des abonnements dans App Store Connect et Play Console ; cette étape n’a pas été effectuée puisqu’aucun achat en ligne n’est autorisé.
4. **Catalogue :** obtenir les domaines, offres et accords partenaires vérifiés. Le code refuse désormais un domaine non autorisé, mais ne peut pas inventer une offre commerciale réelle.
5. **Juridique :** fournir l’identité de l’entreprise, le responsable de traitement, le support et les décisions de conservation afin de publier les CGU, la politique de confidentialité, les mentions légales et les déclarations stores définitives.
6. **Infrastructure :** aligner les régions, créer un staging séparé, brancher OpenTelemetry à une plateforme d’alertes et exécuter une restauration Neon suivant le runbook.
7. **Recette :** tester appareils réels, accessibilité, charge, panne fournisseur, sauvegarde, rollback et réaliser un test d’intrusion indépendant.

## Configuration fournisseur vérifiée

- Render contient les clés de chiffrement bancaire, le callback Tink natif, les secrets de webhooks Tink et RevenueCat, la table exacte des produits RevenueCat et le compte de service Firebase Admin.
- `/health/ready` répond `200` avec tous les indicateurs à `true`, dont `database`, `bankingWebhook`, `bankingEncryption`, `bankingNative`, `identity`, `push`, `premiumProducts` et `premiumEvents`.
- Le webhook Tink de production répond `200` à un événement de test signé selon le format Events v2.
- Firebase Admin est actif pour l’identité et les notifications push.
- RevenueCat est opérationnel avec son Test Store gratuit ; l’association aux stores Apple et Google reste dépendante des comptes et produits externes.

## Risques techniques encore ouverts dans le code

- cycle Tink complet de renouvellement et révocation distante à confirmer selon le contrat/API activé ;
- événement RevenueCat `TRANSFER` et réconciliation périodique globale à compléter après définition du modèle d’identité commercial ;
- back-office graphique avec brouillon, validation à deux personnes et gestion des rôles ;
- pagination SQL généralisée, rétention des transactions, mode maintenance et version mobile minimale ;
- tests E2E mobile/appareils, charge, DAST, SAST et accessibilité automatisée ;
- internationalisation complète, calibration du moteur sur un jeu français représentatif et prise en charge multi-devise.
