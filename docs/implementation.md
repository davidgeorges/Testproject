# Suivi du développement

## Périmètre de cette première tranche

Le document `SmartSave_Cahier_des_charges_V1_v2.docx` sert de référence fonctionnelle. Son nom commercial n’est pas repris dans le produit, conformément à la demande. L’interface a ensuite été reconstruite à partir de la planche sombre fournie : les 23 vues et les limites des assets sont décrites dans [Interface de référence](ui-reference.md).

| Exigence | État actuel |
| --- | --- |
| Expo, TypeScript, React Navigation, TanStack Query | Implémenté |
| Thèmes centralisés sombre et clair | Implémenté ; sombre au premier lancement |
| Splash et quatre étapes d’onboarding | Accueil de présentation et onboarding implémentés |
| Authentification Firebase côté API | Validation JWT et clés publiques mise en cache ; configuration du projet requise |
| Connexion bancaire et consentement | Identifiant fournisseur interne, URL d’autorisation transitoire, consentement et révocation derrière interface |
| Synchronisation | Synchrone pour le parcours mobile et file durable avec baux, reprises et états consultables |
| Récurrences | Détection configurable mensuelle, trimestrielle, annuelle ; calculs `decimal` |
| Dashboard et abonnements | Listes, détails, recherche, filtres, historique et prochaine date estimée |
| Corrections d’abonnement | Catégorie modifiable et retrait des analyses, persistés par utilisateur |
| Recommandations | Calcul, sélection du meilleur gain par paiement, frais inclus, hypothèses explicites |
| Offres et affiliation | Catalogue derrière interface ; clic traçable et conversions reçues par webhook HMAC dédupliqué |
| Profil et suppression | Prénom, thème, suppression des données et suppression préalable de l’identité Firebase |
| Premium | Tarifs illustratifs de la maquette ; aucun achat ni droit Premium actif |
| PostgreSQL | Comptes, transactions, analyses, offres, préférences, consentements, notifications, appareils push, Premium et audit persistés |
| Redis | Cache partagé du catalogue pendant 5 minutes, invalidation sur écriture et repli PostgreSQL |
| Notifications | Succès, opportunité et échec de synchronisation, historique in-app, lecture, registre iOS/Android et isolation utilisateur |
| Catalogue / back-office API | Offres administrables ; clé dédiée en démo, claim Firebase `admin` en production |
| Premium backend | Vérification signée de démonstration, anti-rejeu, statut persistant et webhooks renouvellement/annulation/expiration dédupliqués |
| IA explicative | Adaptateur Responses API optionnel, entrée limitée aux faits, `store: false`, validation et repli déterministe |
| Push FCM | Registre, worker, tentatives et FCM HTTP v1 avec OAuth de compte de service |
| Rétention | Purge quotidienne : idempotence expirée, jobs à 90 jours, notifications et audit à 2 ans |
| Stores réels, export métriques | Adaptateurs externes à finaliser avec les comptes fournisseurs |
| CI | Workflow de build, TypeScript, format, tests HTTP/métier/PostgreSQL et export des bundles mobiles |
| Release iOS et Android | À configurer et valider avec les comptes développeur |

## Règles implémentées

Le moteur ne regroupe jamais deux utilisateurs, deux comptes ou deux devises. Il exclut les crédits, les devises autres que l’euro, les paiements futurs, les séries irrégulières et les séries devenues anciennes. Il reconnaît les fins de mois calendaires et déduplique les imports. Il exige trois occurrences par défaut. Un paiement n’est exposé comme abonnement que si sa catégorie décrit un service continu ; les autres paiements récurrents devront être exposés séparément dans une prochaine tranche. Les transactions fournies par le connecteur fictif comportent déjà une catégorie ; la classification réelle des marchands reste à intégrer.

Pour les économies, les offres inactives, les prix invalides et les gains nuls ou négatifs sont exclus. Le gain sur douze mois inclut les frais de mise en service. Une seule meilleure offre est retenue par paiement afin de ne pas additionner des alternatives incompatibles. Les informations d’usage et d’éligibilité ne sont pas connues : la confiance de comparaison est faible et le texte l’indique. Aucun moteur IA ne participe aux calculs. L’agrégation actuelle correspond à un potentiel théorique : les coûts de résiliation et l’équivalence des garanties ne sont pas connus.

## Contrat API disponible

Le schéma exact est généré par `/openapi/v1.json`. Les routes métier exigent `Authorization: Bearer <jeton-démo>`. `POST /api/v1/demo/sessions` crée une session temporaire dans l’environnement Development.

Routes implémentées : profil GET/PATCH, connexions et comptes bancaires GET/POST/DELETE, synchronisation immédiate ou mise en file et état GET, dashboard GET, abonnements GET liste/détail et PATCH préférences, recommandations GET liste/détail/alternatives et suivi vue/clic, offres GET et administration PUT/DELETE, webhooks d’affiliation et Premium signés, consentements GET/DELETE, notifications GET/lecture POST, appareils push GET/POST/DELETE, Premium GET/vérification POST, export RGPD GET et suppression du compte DELETE. La liste des abonnements accepte `page` et `limit` (1 à 100). Les autres petites listes restent non paginées.

Les créations de connexion, synchronisations, clics et validations Premium exigent `Idempotency-Key` (8 à 128 caractères). Une réservation atomique PostgreSQL conserve la réponse réussie pendant 24 heures et permet son rejeu entre plusieurs réplicas ; un contenu différent avec la même clé renvoie 409. En mode mémoire, le même contrat est appliqué dans le processus. L’import PostgreSQL utilise un verrou transactionnel par connexion et des contraintes d’unicité. La déconnexion et la révocation locale bloquent immédiatement toute nouvelle synchronisation ; la révocation distante passe par l’interface du prestataire Open Banking.

## Prochaines tranches

1. Configurer le projet Firebase réel, brancher la création/connexion/réinitialisation mobile, puis ajouter la révocation et la suppression de l’identité via un compte de service.
2. Choisir le prestataire Open Banking et implémenter ses redirections, webhooks signés, révocation distante et erreurs de synchronisation partielles derrière `IBankingProvider`.
3. Brancher les événements ou webhooks du fournisseur bancaire réel sur la file durable de synchronisation.
4. Connecter le catalogue partenaire réel et ses contrats commerciaux au catalogue administrable.
5. Brancher App Store/Play Store ou RevenueCat sur les interfaces de vérification d’achat et d’événements ; les signatures HMAC actuelles sont réservées aux tests locaux.
6. Configurer le gestionnaire de secrets, le collecteur OTLP, l’alerting, les sauvegardes/restauration et les recettes de sécurité dans les environnements externes.

## Références techniques

- [Expo SDK 55](https://expo.dev/changelog/sdk-55) : ligne de base conservée conformément au cahier des charges ; compatibilité des modules vérifiée avec `expo/bundledNativeModules.json` installé.
- [Politique de support .NET](https://dotnet.microsoft.com/en-us/platform/support/policy) : backend sur .NET 10 LTS.
- [Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) : requêtes stateless avec sortie JSON structurée pour l’explication optionnelle.
- [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api) : envoi serveur avec jeton OAuth 2.0 de compte de service.

Les dépendances npm sont figées par `package-lock.json`, celles .NET par les versions explicites et `packages.lock.json`. La CI est créée localement ; aucun dépôt distant ni déploiement n’a été configuré dans cette tranche.

## Vérifications locales du premier lot

50 tests métier, sécurité et HTTP réussis ; les 2 tests PostgreSQL et Redis sont ignorés explicitement faute de serveurs Docker démarrés. La CI démarre les deux services et exécute ces tests. Le build backend Release passe sans erreur. Les migrations couvrent désormais le modèle persistant étendu.

Parcours vérifié dans le navigateur : quatre étapes de présentation, session de test, consentement fictif, connexion/synchronisation, tableau de bord, détail d’une recommandation et enregistrement du clic. Vérification visuelle aux largeurs desktop et 390 px ; ajustement de la taille du montant mensuel pour éviter le retour à la ligne.

Audit NuGet : les dépendances initialement signalées à gravité élevée ont été mises à jour. Audit npm du 8 septembre 2026 : zéro vulnérabilité élevée ou critique, 16 entrées modérées transitives liées à `decode-uri-component` et `uuid` dans Expo/React Navigation. Aucun correctif non cassant n’est proposé par l’audit pour cette combinaison ; ne pas appliquer `npm audit fix --force`, qui suggère notamment un retour à Expo 46. Réévaluer ces dépendances avant la phase de durcissement et de publication.
