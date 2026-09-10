# Catalogue d'offres vérifiées

**Date de vérification :** 10 septembre 2026

Ces fiches reproduisent des offres publiques vérifiées sur les sites des opérateurs. Elles sont enregistrées avec `Active = false` et `IsPartner = false`. Elles ne seront donc ni recommandées aux utilisateurs ni présentées comme des partenariats avant une nouvelle vérification, la signature d'un accord commercial et la validation de l'équivalence de l'offre avec le besoin de l'utilisateur.

| Fournisseur | Offre | Tarif public observé | Domaine source | État dans l'application |
| --- | --- | ---: | --- | --- |
| Free Mobile | Forfait 2 € : 2 h, 50 Mo, SMS/MMS illimités | 2 €/mois, carte SIM/eSIM 10 € | `mobile.free.fr` | candidate inactive, non partenaire |
| Sosh | Forfait 100 Go : 100 Go France, 40 Go Europe/DOM | 13,99 €/mois, SIM 10 € | `shop.sosh.fr` | candidate inactive, non partenaire |
| B&You | Forfait 100 Go 5G : 100 Go France, 35 Go Europe/DOM | 13,99 €/mois, SIM et activation observées à 1 € chacune | `bouyguestelecom.fr` | candidate inactive, non partenaire |

## Sources officielles

- Free Mobile : [page de l'offre](https://mobile.free.fr/fiche-forfait-2-euros) et [brochure tarifaire, version du 31 mars 2026](https://mobile.free.fr/docs/bt/tarifs.pdf).
- Sosh : [page du forfait 100 Go](https://shop.sosh.fr/mobile/forfait-100go).
- Bouygues Telecom : [forfaits B&You sans engagement](https://www.bouyguestelecom.fr/forfaits-mobiles/sans-engagement). Les conditions exactes du 100 Go doivent être revérifiées avant activation.

## Domaines admissibles après accord

Les domaines techniques candidats sont :

- `mobile.free.fr`
- `shop.sosh.fr`
- `bouyguestelecom.fr`

Ils ne doivent être ajoutés à `Offers__AllowedDomains` sur Render qu'après la signature d'un accord autorisant l'affichage ou le suivi commercial des offres. Une autorisation de domaine est un contrôle de sécurité des URL ; elle ne constitue pas une preuve de partenariat.

## Conditions d'activation

Avant de passer une fiche à `Active = true` ou `IsPartner = true`, il faut consigner :

1. le contrat ou programme d'affiliation et sa date d'effet ;
2. l'URL de destination et les paramètres de suivi autorisés ;
3. le tarif, les frais, la durée de validité et les conditions d'éligibilité ;
4. les règles d'usage de la marque et le texte de transparence commerciale ;
5. un responsable et une date de prochaine revue ;
6. les critères d'équivalence utilisés par le moteur de recommandation.
