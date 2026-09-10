# Sécurité du projet

Les vulnérabilités ne doivent pas être publiées dans une issue publique. Le canal privé de signalement devra être renseigné avant l’ouverture de la bêta : `SECURITY_CONTACT_A_DEFINIR`.

## Versions prises en charge

Seule la dernière version déployée de l’API et la dernière version mobile publiée sont prises en charge. Une correction critique doit produire un nouvel artefact signé et un déploiement traçable.

## Traitement d’un signalement

1. Accuser réception par le canal privé.
2. Créer un incident restreint et conserver les preuves sans copier de données personnelles.
3. Qualifier l’impact sur Firebase, Tink, PostgreSQL, Redis, RevenueCat, Expo et les stores.
4. Révoquer les secrets concernés, corriger, tester et déployer.
5. Documenter la chronologie, les utilisateurs affectés et les notifications réglementaires décidées par le responsable légal.

Les secrets ne doivent jamais être placés dans Git, une issue, une capture ou une conversation. Les valeurs de `.env`, les comptes de service Firebase, les clés Tink et RevenueCat serveur, les chaînes PostgreSQL et Redis et les secrets de webhook doivent rester dans les gestionnaires de secrets des plateformes.
