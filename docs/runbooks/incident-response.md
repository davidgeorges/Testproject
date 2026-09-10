# Procédure de réponse à incident

## Déclenchement

Ouvrir un incident pour toute fuite suspectée, suppression incomplète, attribution Premium incorrecte, import bancaire appartenant à un autre utilisateur, hausse anormale des erreurs ou indisponibilité durable.

## Actions immédiates

1. Noter l’heure UTC, le déclarant, les versions API/mobile et les identifiants de corrélation.
2. Limiter l’impact : suspendre l’intégration ou le déploiement fautif, sans effacer les preuves.
3. Révoquer et remplacer le secret compromis. Mettre à jour le consommateur avant de révoquer l’ancienne valeur lorsque la continuité l’exige.
4. Examiner les audits applicatifs et les journaux des fournisseurs sans exporter de jetons ni de données financières complètes.
5. Corriger dans une branche dédiée, exécuter la CI et conserver le lien vers l’artefact déployé.

## Rotation par intégration

| Secret | Rotation | Contrôle après rotation |
| --- | --- | --- |
| Neon PostgreSQL | Nouveau mot de passe/rôle, mise à jour Render, révocation de l’ancien | `/health/ready`, connexion et synchronisation sandbox |
| Upstash Redis | Nouvelle clé, mise à jour Render, révocation de l’ancienne | idempotence et rate limit |
| Tink client secret | Rotation Tink puis Render | callback et synchronisation ; les jetons restent lisibles grâce à la clé de chiffrement séparée |
| Clé de chiffrement bancaire | Déploiement avec version de clé et ré-encryptage avant retrait | lecture de tous les consentements actifs |
| Firebase service account | Nouvelle clé, Render, suppression de l’ancienne | push et suppression de compte |
| RevenueCat secret/webhook | Nouvelle valeur des deux côtés | achat sandbox et webhook signé |

## Clôture

Le compte rendu doit contenir la cause, la portée, les données concernées, la correction, la preuve de validation, les actions préventives et la décision du responsable légal sur les notifications aux personnes et autorités.
