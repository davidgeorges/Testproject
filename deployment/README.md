# Déploiement backend

Le conteneur exécute l’API en utilisateur non privilégié sur le port 8080. Les secrets doivent être injectés par le gestionnaire de secrets de la plateforme et ne doivent jamais être intégrés à l’image.

## Configuration requise en production

- `ConnectionStrings__Postgres`
- `ConnectionStrings__Redis`
- `Firebase__ProjectId`
- `Firebase__MessagingProjectId`
- `Firebase__ServiceAccountJson`
- `Cors__Origins__0` et suivants
- `Affiliation__WebhookSecret`
- `OpenAI__ApiKey` et `OpenAI__Model` si les reformulations IA sont activées
- `OpenTelemetry__Endpoint` pour exporter traces et métriques via OTLP
- `AllowedHosts` avec les noms DNS servis par la plateforme

Le prestataire Open Banking et la validation des achats restent des adaptateurs à configurer dans le code tant qu’un fournisseur n’a pas été choisi. `/health/live` vérifie le processus. `/health/ready` renvoie 200 uniquement quand PostgreSQL et les intégrations indispensables sont disponibles.

Le back-office exige en production un JWT Firebase signé avec le claim personnalisé `admin: true`. `Admin__ApiKey` est réservé au mode de démonstration local.

## Publication

1. Construire et analyser l’image depuis la racine avec `docker build -f backend/SubscriptionApp.Api/Dockerfile -t subscription-api:<sha> .`.
2. Sauvegarder PostgreSQL et vérifier une restauration récente.
3. Exécuter `postgres-migrations.sql` avec un rôle de migration distinct du rôle runtime.
4. Déployer l’image par digest sur staging, attendre `/health/ready`, puis exécuter le parcours de fumée.
5. Promouvoir le même digest en production avec un déploiement progressif.

## Retour arrière

En cas d’erreur applicative, retirer la nouvelle révision du trafic et redéployer le digest précédent. Les migrations sont additives : conserver le schéma pendant le retour arrière. Une suppression de colonne ou de table doit faire l’objet d’une migration ultérieure après confirmation qu’aucune révision active ne l’utilise. En cas d’altération de données, isoler les écritures puis restaurer dans une nouvelle base avant bascule ; ne pas restaurer directement par-dessus la base active.
