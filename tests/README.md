# Tests d'intégration API

Ces tests envoient de vraies requêtes HTTP aux routes API (`/api/...`) d'un
serveur en cours d'exécution — pas de mocks, pas de base de données de test
séparée. Ils utilisent le même Supabase que le développement.

## Lancer les tests

1. Démarre le serveur dev dans un terminal : `npm run dev`
2. Dans un autre terminal : `npm test`

Chaque test qui crée des données (email de vérification, commande, tentative
de connexion) nettoie ce qu'il a créé après coup (`afterAll`).

## Ajouter un test

Un fichier par zone de l'API (`products.test.ts`, `auth.test.ts`, etc.).
Utilise les helpers de `helpers.ts` (`apiGet`, `apiPost`, `adminClient`,
`testEmail`) plutôt que d'appeler `fetch` directement, pour rester cohérent.
