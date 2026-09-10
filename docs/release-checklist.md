# Checklist de mise en production

## Technique

- CI verte : build, tests .NET/PostgreSQL/Redis, format, TypeScript, Expo Doctor, exports Web/Android/iOS et audits sans vulnérabilité haute ou critique.
- Migration appliquée par une étape contrôlée et rollback documenté.
- Même artefact promu du staging vers la production.
- Tink testé sur Web, Android et iOS avec reconnexion et webhook.
- RevenueCat testé pour achat, restauration, renouvellement, annulation, remboursement et expiration.
- Push testé sur appareils réels Android/iOS, y compris déconnexion et jeton invalide.
- Suppression durable testée avec panne avant/après PostgreSQL et Firebase.
- Restauration PostgreSQL réalisée et chronométrée.
- Alertes, traces et tableaux de bord vérifiés.

## Produit et conformité

- Nom, domaines, bundle IDs, package Android, icônes et splash définitifs.
- Catalogue d’offres vérifié, dates de validité, frais, équivalence et domaines partenaires autorisés.
- CGU, confidentialité, mentions légales, conditions Premium, affiliation et support publiés avec version.
- Registre des sous-traitants et transferts, durées de conservation et procédure d’exercice des droits validés.
- App Privacy Apple, Data safety et Financial features Google complétés.
- Accessibilité, petits et grands écrans, thème clair/sombre et lecteurs d’écran validés.

Chaque ligne doit porter une preuve et un responsable avant le feu vert.
