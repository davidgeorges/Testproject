# Clarysio

Assistant personnel de budget, de documents et de foyer issu du cahier des charges fourni. Le nom commercial visible est **Clarysio**. Les identifiants techniques historiques `SubscriptionApp`, `subscription-project` et `subscriptionapp` restent stables afin de préserver les connexions Firebase, Expo et Tink déjà configurées.

## État de transmission du projet

**Dernière mise à jour : 11 septembre 2026**

Le dépôt contient une V1 intégrée et persistante, utilisable comme bêta technique. Elle n’est pas encore prête pour une publication publique sur l’App Store ou Google Play. Le fournisseur bancaire actuellement livré reste **Tink**. La migration envisagée vers Enable Banking a été arrêtée avant intégration et ne fait pas partie de la version stable.

### Ce qui est réalisé

| Domaine | État livré |
| --- | --- |
| Application | Expo SDK 57, React Native, TypeScript, navigation Web/iOS/Android et interface responsive |
| Design | Identité Clarysio, splash natif, thèmes clair/sombre, couleur d’accent personnalisable et écrans harmonisés |
| Authentification | Firebase e-mail, inscription, réinitialisation, Google Web, Expo Go et clients OAuth natifs configurés |
| Backend | API ASP.NET Core .NET 10, validation, limitation de débit, idempotence, audit et traitements en arrière-plan |
| Données | PostgreSQL Neon avec migrations automatiques contrôlables et clés Data Protection persistées |
| Banque | Plusieurs connexions Tink, consentement OAuth signé, callback Web/natif, comptes, transactions, pagination, synchronisation durable, webhook et révocation |
| Finances | Soldes, revenus/dépenses, cashflow, catégories, recherche, filtres par période, export CSV et règles de reclassement |
| Budgets | Budgets libres par catégorie ou intitulé personnalisé, suivi réel/prévu, alertes et suppression |
| Abonnements | Détection de récurrences, liste, détail, recherche, historique, correction et exclusion persistée |
| Économies | Calcul déterministe, recommandations explicables, alternatives, suivi des clics et économies réalisées |
| Documents | Import PDF/JPEG/PNG, chiffrement, OCR Tesseract français/anglais, recherche, classement, correction, ouverture et suppression |
| Échéances | Calendrier, rappels persistés, échéances manuelles ou extraites des documents et notifications |
| Foyer | Membres avec ou sans compte, invitations, droits, budgets/dépenses partagés, logements, véhicules et contrats |
| Notifications | Centre in-app, préférences, Expo Push/FCM, file d’envoi, reçus, reprises et retrait des jetons invalides |
| Premium | RevenueCat, entitlement `premium`, offres mensuelle/annuelle Test Store, restauration et webhooks signés |
| Suppression/export | Export autorisé sans secrets et suppression durable PostgreSQL/Firebase avec reprise après panne |
| Exploitation | Docker, Render, Redis Upstash, health checks, OpenTelemetry, Dependabot et CI GitHub complète |
| Qualité | Tests métier/API/sécurité, tests PostgreSQL/Redis en CI, format .NET, TypeScript, Expo Doctor et exports Web/Android/iOS |

### Services déjà configurés

- L’API est hébergée sur Render et utilise PostgreSQL Neon.
- Le mot de passe Neon précédemment exposé a été renouvelé ; l’ancien n’est plus valide.
- Firebase Admin est configuré pour l’identité et les notifications.
- Tink est configuré avec le callback `subscriptionapp://banking/callback`, le chiffrement séparé et son webhook signé.
- RevenueCat fonctionne avec les produits gratuits du Test Store `monthly` et `yearly`.
- L’envoi SMTP des invitations de foyer est prévu par configuration ; le partage natif reste disponible sans SMTP.

### Ce qui manque avant une bêta publique

1. **Choisir définitivement le fournisseur Open Banking.** Tink fonctionne en sandbox. Pour de vraies données publiques, il faut signer un contrat de production avec Tink, Powens, Bridge ou Enable Banking. Un changement de fournisseur nécessitera un nouvel adaptateur et la reconnexion des banques existantes.
2. **Tester sur de vrais appareils.** Valider Google, le deep link bancaire, plusieurs banques, les notifications, la reconnexion et la persistance sur un iPhone et un Android physiques.
3. **Créer un staging séparé.** Utiliser des projets et secrets distincts de la production, puis tester sauvegarde, restauration et rollback.
4. **Brancher l’observabilité.** Envoyer OpenTelemetry vers un collecteur, créer des tableaux de bord et des alertes sur les erreurs d’authentification, de banque, de push et de base.
5. **Finaliser les partenaires.** Signer les accords commerciaux, vérifier les offres, leurs frais et leur date de validité, puis autoriser uniquement les domaines contractuels.
6. **Finaliser le Premium des stores.** Créer les produits dans App Store Connect et Google Play Console, les associer à RevenueCat et tester achat, restauration, renouvellement, annulation et remboursement.
7. **Fournir l’identité juridique.** Compléter l’éditeur, le responsable de traitement, le support, le médiateur éventuel et les durées de conservation.
8. **Publier les textes juridiques.** Faire valider puis publier les CGU, la politique de confidentialité, les mentions légales, les conditions Premium et la transparence d’affiliation.
9. **Faire la recette de sortie.** Tests E2E mobiles, accessibilité, charge, panne fournisseur, test d’intrusion et validation des déclarations Apple/Google.
10. **Décider du périmètre IA.** L’adaptateur explicatif est optionnel ; aucun assistant intelligent général ne doit être activé avant la définition des usages, du budget et des évaluations.

### Décisions à conserver

- L’application ne réalise aucun paiement ni virement vers un tiers ; seul l’achat Premium passe par les stores.
- Les données de production ne doivent jamais être remplacées par des données de démonstration.
- Les enfants ou proches peuvent appartenir à un foyer sans créer de compte.
- Une information déduite doit être proposée à l’utilisateur pour confirmation, jamais présentée comme certaine.
- Les offres commerciales restent inactives sans partenariat et validation juridique.
- Les secrets doivent être enregistrés dans Render/EAS, jamais dans Git ou dans un fichier `.env` commité.

Les preuves et procédures détaillées sont disponibles dans [le suivi d’implémentation](docs/implementation.md), [la remédiation de sécurité](docs/remediation-apres-audit-2026-09-10.md), [la recette mobile](docs/recette-mobile-2026-09-11.md), [la checklist de publication](docs/release-checklist.md) et [le formulaire d’identité juridique](docs/identite-juridique-a-renseigner.md).

L’application Expo communique avec une API ASP.NET Core .NET 10. Son interface reproduit la composition mobile de la maquette sombre fournie. En production, les données viennent exclusivement de Firebase, Tink, PostgreSQL et RevenueCat. Les données de présentation ne sont accessibles que si `EXPO_PUBLIC_ENABLE_PREVIEW=true` est explicitement défini en développement. Les détails de l’interface sont dans [docs/ui-reference.md](docs/ui-reference.md).

## Démarrer en local

Prérequis : Node.js 22, npm et SDK .NET 10. Les commandes se lancent à la racine du dépôt.

```powershell
npm ci
dotnet restore SubscriptionApp.sln
npm run api
```

Dans un second terminal :

```powershell
npm run web
```

Créer `apps/mobile/.env` à partir de `.env.example`, puis ouvrir http://localhost:8081. Le serveur écoute sur http://localhost:5080. Son contrat OpenAPI est disponible sur http://localhost:5080/openapi/v1.json.

Le backend exige Firebase et PostgreSQL hors du mode de développement. Le mode simulé est limité à `Development` et doit être activé explicitement avec `Demo__Enabled=true`.

## Mobile

```powershell
npm start
```

Le code cible Expo SDK 57 / React Native 0.86.3. Firebase conserve la session native dans AsyncStorage, Expo enregistre les appareils pour le push et RevenueCat gère Premium. Google fonctionne sur le Web, dans Expo Go et dans les builds signés ; les builds Android/iOS utilisent leurs identifiants OAuth propres décrits par `.env.example`.

### Premium avec RevenueCat

Le client mobile utilise `react-native-purchases`. Dans RevenueCat, créer l’entitlement `premium`, deux produits mensuel et annuel, puis une offering courante qui contient les packages `$rc_monthly` et `$rc_annual`. Copier les clés SDK publiques Apple et Google dans `apps/mobile/.env` à partir de `.env.example`. Les achats réels nécessitent un development build Expo ou une application signée ; Expo Go et le navigateur ne peuvent pas ouvrir les feuilles d’achat App Store/Play Store.

Sur le backend Render, désactiver le mode démo et définir les variables suivantes :

```text
Demo__Enabled=false
RevenueCat__SecretApiKey=<clé secrète RevenueCat v1>
RevenueCat__EntitlementId=premium
RevenueCat__WebhookAuthorization=Bearer <secret aléatoire long>
RevenueCat__WebhookSigningSecret=<secret HMAC RevenueCat>
RevenueCat__Products__Monthly__0=<identifiant produit mensuel exact>
RevenueCat__Products__Annual__0=<identifiant produit annuel exact>
Banking__TokenEncryptionKey=<clé aléatoire indépendante de Tink, 32 caractères minimum>
Tink__NativeRedirectUri=subscriptionapp://banking/callback
Tink__WebhookAuthorization=Bearer <secret aléatoire long>
Offers__AllowedDomains__0=<domaine du premier partenaire autorisé>
```

Dans RevenueCat, créer un webhook vers `https://testproject-s3qv.onrender.com/api/v1/webhooks/revenuecat` et lui donner exactement la même valeur dans le champ Authorization. Le backend vérifie l’entitlement directement auprès de RevenueCat après achat ou restauration, puis traite les renouvellements, annulations et expirations envoyés par le webhook. La clé secrète RevenueCat ne doit jamais être ajoutée au fichier `.env` du mobile.

Dans Tink, autoriser aussi `subscriptionapp://banking/callback`. Le Web continue d’utiliser `Tink__RedirectUri`; Android et iOS utilisent la session OAuth native et `Tink__NativeRedirectUri`. La clé `Banking__TokenEncryptionKey` doit être sauvegardée et tournée selon la procédure de sécurité : sa perte rend les consentements bancaires existants illisibles. Les URLs d’offres sont refusées en production tant que leur domaine n’est pas déclaré dans `Offers__AllowedDomains`.

## PostgreSQL local

Docker Desktop doit être démarré. La configuration Compose est destinée au développement local et n’écoute que sur loopback.

```powershell
docker compose up -d
dotnet tool restore
$env:ConnectionStrings__Postgres='Host=localhost;Database=subscriptions;Username=subscriptions;Password=local-development-only'
dotnet ef database update --project backend/SubscriptionApp.Persistence
npm run api
```

Les migrations créent notamment les profils, connexions, comptes et transactions bancaires, consentements, analyses, notifications, appareils push, clés d’idempotence, abonnements et événements Premium, et événements d’audit. En production elles sont appliquées au démarrage avant l’ouverture de l’API. `Database__ApplyMigrationsOnStartup=false` permet de déléguer cette étape à une procédure externe.

## Documents et OCR

Le coffre documentaire accepte les PDF, JPEG et PNG jusqu’à 10 Mo. Les fichiers sont chiffrés avec ASP.NET Data Protection avant leur stockage dans PostgreSQL ; les réponses de liste et l’export de données ne contiennent jamais les octets du fichier. Le conteneur exécute Poppler pour lire ou convertir les PDF et Tesseract 5 avec les modèles français et anglais pour les pages scannées. L’analyse est limitée à dix pages et 45 secondes afin de protéger la mémoire du service gratuit. Le titre, la catégorie, l’organisme, le montant, les dates et le numéro de contrat détectés restent modifiables par l’utilisateur.

Les clés Data Protection persistées sont indispensables pour relire les documents après un redéploiement. Leur perte rend les fichiers stockés illisibles.

## Échéances et rappels

Le calendrier réunit les échéances créées par l’utilisateur et les dates détectées dans ses documents. Les échéances manuelles, leur catégorie, leur note, leur date, leur heure, leur délai de rappel et leur état sont persistés dans PostgreSQL. Un traitement serveur vérifie les rappels toutes les cinq minutes et crée une notification unique, ensuite distribuée par le pipeline Expo/FCM existant. Les dates provenant d’un document ouvrent directement ce document et déclenchent un rappel sept jours avant l’échéance.

## Vérifier le code

```powershell
npm run typecheck
npm run format:check
npm run build:web
dotnet test SubscriptionApp.sln
```

Pour inclure le test PostgreSQL, définir `TEST_POSTGRES` vers une **base dédiée aux tests**. Le test applique les migrations et utilise des données isolées qu’il supprime ensuite. Sans cette variable, ce test est explicitement ignoré. La CI le configure avec un service PostgreSQL.

## Organisation

- `apps/mobile/src` : écrans React Native, React Navigation, TanStack Query, client API centralisé, formulaires Zod et tokens dark/light.
- `backend/SubscriptionApp.Domain` : détection des récurrences et calcul des économies en `decimal`, sans IA ni réseau.
- `backend/SubscriptionApp.Application` : interfaces et orchestration de l’analyse.
- `backend/SubscriptionApp.Infrastructure` : banque et offres fictives, stockage en mémoire de développement.
- `backend/SubscriptionApp.Persistence` : EF Core, PostgreSQL et migrations.
- `backend/SubscriptionApp.Api` : routes `/api/v1`, sessions de démonstration, contrôle d’accès, validation et idempotence.
- `backend/SubscriptionApp.Tests` : tests métier, contrats HTTP et intégration PostgreSQL.
- `docs/reference` : texte et maquettes extraits du document source, conservés comme référence, y compris son ancien nom.

## État de la V1

La V1 technique relie Firebase, Tink, Neon PostgreSQL, Upstash Redis, RevenueCat et Expo Push. Le catalogue de production démarre vide et s’administre via les routes réservées aux comptes portant le claim Firebase `admin=true`. Les produits réels App Store/Google Play, les contrats de partenaires et la publication sur les stores demandent des comptes commerciaux et restent hors de ce lot.

Le suivi détaillé des exigences et les décisions sont dans [docs/implementation.md](docs/implementation.md).

## Foyer partagé

L’écran **Foyer** gère des membres avec ou sans compte, des invitations temporaires partageables par e-mail, des droits détaillés, des budgets mensuels, les logements, les véhicules et les contrats. Les enfants et proches peuvent rester de simples profils gérés : aucune inscription n’est nécessaire pour les inclure dans un budget.

Les budgets utilisent un grand livre PostgreSQL réel. Une dépense peut être saisie manuellement ou provenir d’une transaction bancaire d’un membre lié, puis être affectée à un budget et répartie entre plusieurs personnes. L’API calcule le consommé, le restant et le taux mensuel ; un franchissement de 80 % ou 100 % crée une notification unique pour tous les comptes liés. Un document peut être confirmé comme contrat du foyer et sa date de renouvellement devient une échéance partagée avec rappel.

L’envoi automatique des invitations utilise SMTP lorsqu’il est configuré avec `InvitationEmail__SmtpHost`, `InvitationEmail__SmtpPort`, `InvitationEmail__SmtpUser`, `InvitationEmail__SmtpPassword`, `InvitationEmail__From` et `InvitationEmail__EnableSsl`. Sans serveur SMTP, l’application ouvre le partage natif avec le code temporaire au lieu de perdre l’invitation.
