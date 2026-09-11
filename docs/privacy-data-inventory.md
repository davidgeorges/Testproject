# Inventaire des données à valider

Ce document décrit le traitement technique observé. Les bases légales, responsables, durées finales et textes publiés doivent être validés par l’entreprise et son conseil juridique.

| Donnée                                         | Finalité technique                              | Système                                        | Suppression                                      |
| ---------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Identifiant, e-mail et nom                     | Authentification et personnalisation            | Firebase, PostgreSQL                           | workflow durable de suppression de compte        |
| Connexion, compte et transactions bancaires    | Détection d’abonnements et calcul d’économies   | Tink, PostgreSQL                               | révocation bancaire ou suppression du compte     |
| Consentements versionnés                       | Preuve des choix et connexions                  | PostgreSQL                                     | révocation ou politique de conservation validée  |
| Abonnements et recommandations                 | Tableau de bord et conseils                     | PostgreSQL                                     | recalcul ou suppression du compte                |
| Événements de recommandation/affiliation       | Mesure et attribution                           | PostgreSQL                                     | suppression du compte et rétention à définir     |
| Statut Premium                                 | Accès aux fonctions achetées                    | RevenueCat, PostgreSQL                         | selon obligations comptables et compte store     |
| Jeton de notification                          | Livraison des notifications                     | Expo/FCM, PostgreSQL                           | logout, jeton invalide ou suppression du compte  |
| Documents, texte OCR et informations extraites | Classement, recherche et rappels administratifs | PostgreSQL, traitement local Tesseract/Poppler | suppression du document ou suppression du compte |
| Échéances, notes et préférences de rappel        | Calendrier et notifications choisies            | PostgreSQL, Expo/FCM pour le push               | suppression de l’échéance ou suppression du compte |
| Membres du foyer, invitations, budgets, logements, véhicules et contrats | Organisation partagée du foyer | PostgreSQL ; code d’invitation stocké uniquement sous forme d’empreinte | suppression de l’élément, retrait du membre ou suppression du compte propriétaire |
| Audits et identifiants de corrélation          | Sécurité et diagnostic                          | PostgreSQL, journaux hébergeur                 | purge actuelle après deux ans ; durée à valider  |

Il reste à renseigner : identité et contact du responsable de traitement, DPO, bases légales, durées exactes, pays de traitement, mécanismes de transfert, liste contractuelle des sous-traitants, destinataires, exercice des droits et décision d’AIPD.
