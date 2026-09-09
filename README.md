# Projet abonnements

Application de gestion d’abonnements issue du cahier des charges fourni. Le nom commercial reste à choisir. Les noms techniques `SubscriptionApp` et `subscription-project` sont provisoires.

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

Le code cible Expo SDK 55 / React Native 0.83.10. Firebase conserve la session native dans AsyncStorage, Expo enregistre les appareils pour le push et RevenueCat gère Premium. Google fonctionne sur le Web ; les builds Android/iOS exigent leurs identifiants OAuth propres dans les variables décrites par `.env.example`.

### Premium avec RevenueCat

Le client mobile utilise `react-native-purchases`. Dans RevenueCat, créer l’entitlement `premium`, deux produits mensuel et annuel, puis une offering courante qui contient les packages `$rc_monthly` et `$rc_annual`. Copier les clés SDK publiques Apple et Google dans `apps/mobile/.env` à partir de `.env.example`. Les achats réels nécessitent un development build Expo ou une application signée ; Expo Go et le navigateur ne peuvent pas ouvrir les feuilles d’achat App Store/Play Store.

Sur le backend Render, désactiver le mode démo et définir les variables suivantes :

```text
Demo__Enabled=false
RevenueCat__SecretApiKey=<clé secrète RevenueCat v1>
RevenueCat__EntitlementId=premium
RevenueCat__WebhookAuthorization=Bearer <secret aléatoire long>
```

Dans RevenueCat, créer un webhook vers `https://testproject-s3qv.onrender.com/api/v1/webhooks/revenuecat` et lui donner exactement la même valeur dans le champ Authorization. Le backend vérifie l’entitlement directement auprès de RevenueCat après achat ou restauration, puis traite les renouvellements, annulations et expirations envoyés par le webhook. La clé secrète RevenueCat ne doit jamais être ajoutée au fichier `.env` du mobile.

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
