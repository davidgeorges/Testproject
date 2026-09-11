# Recette mobile et état de diffusion

**Date :** 11 septembre 2026  
**Périmètre :** authentification, banque, builds mobiles, Premium, partenaires et identité produit.

## État vérifié

| Lot | Preuve | État |
| --- | --- | --- |
| Google Web | OAuth Google puis création de session Firebase et ouverture du dashboard | validé |
| Google Expo Go | proxy Expo `@azetoxvii/subscription-project`, flux `id_token`, choix de compte forcé | configuré ; validation tactile iOS requise |
| Google Android signé | client OAuth Android lié à `com.davidgeorges.subscriptionapp` et au SHA-1 du keystore EAS | configuré |
| API de production | `/health/live` et `/health/ready` répondent `200` | validé |
| Tink serveur | chiffrement, état OAuth, callback natif, pagination, jobs, webhook et reconnexion | 11 tests banque/Tink réussis |
| Tink appareil | retour `subscriptionapp://banking/callback` | configuration prête ; validation tactile Android/iOS requise |
| Bundles | exports Expo Web, Android et iOS SDK 57 | validés |
| APK partageable | profil EAS `preview`, distribution interne, API Render et Firebase réels | build EAS lancé |
| RevenueCat | entitlement `premium`, offering `default`, uniquement les produits Test Store `monthly` et `yearly` | validé et nettoyé |
| Stores réels | produits App Store Connect et Play Console | comptes développeur et produits stores requis |
| Partenaires | Free, Sosh et B&You documentés comme candidats inactifs et non partenaires | publication bloquée jusqu’aux accords commerciaux |
| Identité | nom visible **Clarysio**, icône et splash dédiés ; identifiants techniques historiques conservés pour Firebase/Tink/EAS | recherche d’antériorité juridique requise avant publication |

## Matrice de recette sur appareils réels

Exécuter chaque ligne sur un iPhone et un Android physiques avec la même version distribuée. Conserver le modèle, la version du système, l’heure et une capture du résultat.

1. Installer l’APK Android ou le build iOS, puis ouvrir l’application sur réseau mobile.
2. Se connecter avec Google, se déconnecter, puis choisir un autre compte Google.
3. Refuser l’autorisation Google et vérifier le retour contrôlé à la connexion.
4. Connecter Demo Bank avec Tink, attendre la fin du job et ouvrir les résultats.
5. Fermer puis relancer l’application : la connexion et les résultats doivent rester présents.
6. Ajouter une deuxième banque, synchroniser les deux et vérifier que les comptes sont séparés.
7. Révoquer une banque puis confirmer qu’elle n’est plus utilisée et que l’autre reste active.
8. Forcer une reconnexion Tink et vérifier que les anciennes transactions ne sont pas dupliquées.
9. Autoriser les notifications, déclencher un rappel, puis se déconnecter et vérifier la désinscription du jeton.
10. Acheter et restaurer `monthly` puis `yearly` uniquement dans un sandbox store. Vérifier renouvellement, annulation, remboursement et expiration dans RevenueCat.

## Commandes reproductibles

```powershell
npm ci
npm run typecheck
npm run format:check
npx expo-doctor@latest
npx expo export --platform web
npx expo export --platform android
npx expo export --platform ios
dotnet test SubscriptionApp.sln -c Release --no-restore
```

Pour un lien Expo Go accessible hors du Wi-Fi local :

```powershell
npm run start:tunnel --workspace apps/mobile
```

Pour générer une APK partageable sans passer par Google Play :

```powershell
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

## Conditions avant publication publique

- créer les comptes développeur Apple et Google et leurs abonnements sandbox ;
- charger dans EAS une clé de compte de service FCM V1 dédiée avant la recette des notifications Android ;
- injecter les clés SDK publiques RevenueCat propres à chaque store dans les profils correspondants ;
- valider les achats et notifications sur appareils réels ;
- signer les accords d’affiliation avant d’activer une offre ou un domaine partenaire ;
- arrêter le nom après recherche INPI/EUIPO, puis changer ensemble le nom visible, le slug Expo, le schéma de deep link, le bundle iOS, le package Android, les clients OAuth, Tink, l’icône et le splash ;
- fournir l’identité juridique et faire valider les textes légaux avant publication.
