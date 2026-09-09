# Projet abonnements

Première tranche de développement issue du cahier des charges fourni. Le nom commercial reste à choisir. Les noms techniques `SubscriptionApp` et `subscription-project` sont provisoires.

L’application Expo communique avec une API ASP.NET Core .NET 10. Son interface reproduit la composition mobile de la maquette sombre fournie. Sur ordinateur, un sélecteur permet d’explorer les 23 vues dans un cadre de téléphone. Le mode maquette emploie les chiffres d’exemple du document ; le parcours bancaire simulé affiche ensuite les valeurs calculées par le backend. Les détails de la refonte sont dans [docs/ui-reference.md](docs/ui-reference.md).

## Démarrer la démonstration

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

Ouvrir http://localhost:8081. L’accueil de la maquette s’affiche immédiatement. Utiliser le sélecteur pour explorer les écrans, ou choisir **Connexion bancaire → une banque → autoriser l’analyse fictive → Autoriser et continuer → Voir mon résumé** pour tester le backend. Le serveur écoute sur http://localhost:5080. Son contrat OpenAPI est disponible sur http://localhost:5080/openapi/v1.json.

Sans chaîne de connexion PostgreSQL, les données restent en mémoire. Le serveur les perd à son arrêt. Le jeton de démonstration est conservé uniquement en mémoire dans l’application : un rechargement revient à l’accueil en mode maquette et efface la session locale. Ce jeton expire après huit heures.

Les exemples génèrent 8 services, un coût mensuel total de **223,84 €** et **501 € d’économies annuelles estimées**, dont 39 € de frais de mise en service déduits pour l’offre Internet. Ces montants proviennent de données fictives et ne constituent pas des tarifs commerciaux vérifiés.

## Mobile

```powershell
npm start
```

Le code cible Expo SDK 55 / React Native 0.83.10. Un émulateur Android utilise par défaut `http://10.0.2.2:5080`. Pour un téléphone physique, renseigner `EXPO_PUBLIC_API_URL` dans `apps/mobile/.env` avec une API joignable sur le réseau de développement et adapter les hôtes autorisés côté serveur. Ne pas exposer cette API de démonstration publiquement. Les builds natives et la validation sur appareils restent à effectuer.

## PostgreSQL facultatif

Docker Desktop doit être démarré. La configuration Compose est destinée au développement local et n’écoute que sur loopback.

```powershell
docker compose up -d
dotnet tool restore
$env:ConnectionStrings__Postgres='Host=localhost;Database=subscriptions;Username=subscriptions;Password=local-development-only'
dotnet ef database update --project backend/SubscriptionApp.Persistence
npm run api
```

Les migrations créent notamment les profils, connexions, comptes et transactions bancaires, consentements, analyses, notifications, appareils push, clés d’idempotence, abonnements et événements Premium, et événements d’audit. Les suppressions de profil effacent les données liées par cascade. Les réponses idempotentes sont partagées par PostgreSQL entre les réplicas ; Redis fournit le cache court partagé du catalogue d’offres lorsqu’il est configuré. Aucun changement de schéma n’est appliqué automatiquement au démarrage de l’API.

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

Ce dépôt constitue un parcours fonctionnel avancé, pas encore une V1 publiée. L’API accepte le mode production uniquement avec un identifiant de projet Firebase et valide alors les JWT Firebase ; la route de session fictive disparaît. Les connecteurs Open Banking et achats restent fermés hors démo tant que leurs fournisseurs réels ne sont pas configurés. Le catalogue administrable, les conversions d’affiliation signées, la file durable de synchronisation, les traitements de consentement, les notifications in-app et FCM, l’idempotence PostgreSQL, le cycle Premium côté serveur (achat, renouvellement, annulation, expiration), l’export et la rétention RGPD, l’explication IA contrôlée, les métriques produit et l’audit sont présents. Les adaptateurs stores réels, l’export des métriques et la configuration des environnements de déploiement restent à connecter.

Le suivi détaillé des exigences et les décisions sont dans [docs/implementation.md](docs/implementation.md).
