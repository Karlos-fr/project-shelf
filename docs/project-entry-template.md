# ProjectShelf — Modèle d’entrée éditoriale

Ce fichier fournit **un exemple**, pas un second schéma. Les noms et contraintes de référence sont ceux de `src/domain/schema.ts` et du guide `docs/content-authoring.md`.

L’exemple volontairement synthétique ci-dessous représente un **dépôt privé dont la fiche publique est indexable**. Son `repositoryUrl` est présent dans la source pour montrer que la projection publique doit l’omettre.

<!-- PROJECT_SHELF_EXAMPLE_BEGIN -->
```json
{
  "categories": [
    {
      "id": "experiments",
      "label": {
        "en": "Experiments",
        "fr": "Expérimentations"
      }
    }
  ],
  "projects": [
    {
      "id": "example-private-project",
      "name": "Example Private Project",
      "categories": ["experiments"],
      "createdAt": "2026-08-20",
      "updatedAt": "2026-09-05",
      "status": "active",
      "repositoryVisibility": "private",
      "repositoryUrl": "https://github.com/example/private-project",
      "hidden": false,
      "featured": true,
      "featuredOrder": 1,
      "stack": ["TypeScript", "Astro"],
      "preview": {
        "poster": "/media/example/poster.webp",
        "video": "/media/example/demo.mp4",
        "focus": { "x": 50, "y": 50 }
      },
      "media": [
        {
          "type": "video",
          "src": "/media/example/demo.mp4",
          "poster": "/media/example/video-poster.webp",
          "thumbnail": "/media/example/video-thumb.webp",
          "title": {
            "en": "Project demonstration",
            "fr": "Démonstration du projet"
          },
          "description": {
            "en": "Synthetic video used by the documentation example.",
            "fr": "Vidéo synthétique utilisée par l’exemple documentaire."
          },
          "captions": [
            {
              "src": "/media/example/en.vtt",
              "language": "en",
              "label": {
                "en": "English captions",
                "fr": "Sous-titres anglais"
              }
            }
          ],
          "durationSeconds": 7,
          "uploadDate": "2026-09-05"
        },
        {
          "type": "image",
          "src": "/media/example/screenshot-1.webp",
          "alt": {
            "en": "Synthetic ProjectShelf example screen",
            "fr": "Écran synthétique d’exemple ProjectShelf"
          }
        }
      ],
      "links": [
        {
          "type": "documentation",
          "url": "https://example.test/docs"
        }
      ],
      "content": {
        "en": {
          "tagline": "A synthetic private-source project",
          "description": "Documentation fixture demonstrating an indexable public page backed by a private repository.",
          "features": ["Bilingual public presentation"],
          "limitations": ["The repository itself remains private"],
          "seo": {
            "description": "Synthetic ProjectShelf documentation example."
          }
        },
        "fr": {
          "tagline": "Un projet synthétique à source privée",
          "description": "Fixture documentaire montrant une fiche publique indexable adossée à un dépôt privé.",
          "features": ["Présentation publique bilingue"],
          "limitations": ["Le dépôt lui-même reste privé"],
          "seo": {
            "description": "Exemple documentaire synthétique de ProjectShelf."
          }
        }
      },
      "pageUpdatedAt": {
        "en": "2026-09-05",
        "fr": "2026-09-05"
      },
      "application": {
        "category": "DeveloperApplication",
        "operatingSystems": ["Web"]
      },
      "indexable": true
    }
  ]
}
```
<!-- PROJECT_SHELF_EXAMPLE_END -->

## Utilisation avec un LLM

Donner au LLM les sources autorisées et lui demander de proposer **uniquement** les champs qu’elles justifient. La réponse doit ensuite être comparée au guide, relue humainement et transposée dans `src/data/projects.ts`.

Ne jamais demander au LLM de « compléter ce qui manque » en inventant une date, une démo, une capture, une performance ou une fonctionnalité.
