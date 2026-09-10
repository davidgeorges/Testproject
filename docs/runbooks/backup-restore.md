# Sauvegarde et restauration

Cette procédure doit être exécutée sur un environnement isolé avec des données synthétiques avant une bêta publique.

1. Activer les sauvegardes et la restauration à un instant donné chez PostgreSQL/Neon selon l’objectif RPO/RTO décidé par l’entreprise.
2. Créer une branche de restauration isolée. Ne jamais restaurer par-dessus la production pour un exercice.
3. Restaurer un point antérieur, utiliser un compte applicatif temporaire en lecture seule et vérifier les nombres de profils, banques, transactions, consentements, suppressions, offres et abonnements Premium.
4. Démarrer la même image API que la production avec `Database__ApplyMigrationsOnStartup=false`.
5. Exécuter `/health/live`, `/health/ready`, une lecture utilisateur synthétique et une synchronisation Tink sandbox.
6. Détruire l’environnement d’exercice et révoquer ses identifiants temporaires.
7. Enregistrer la date, la durée, le point restauré, les écarts, le RPO/RTO mesuré et la personne ayant validé.

Redis ne constitue pas la source de vérité. Sa perte doit seulement invalider les caches et verrous temporaires. Les configurations et secrets sont sauvegardés par leur gestionnaire de secrets, séparément des données.
