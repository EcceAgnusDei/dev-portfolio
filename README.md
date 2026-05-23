# dev-portfolio

Portfolio personnel : page d’accueil listant les mini-projets, pages `/demos/[slug]` pour chaque démo SDK, routes API avec validation Zod.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [Tailwind CSS](https://tailwindcss.com) 4
- [shadcn/ui](https://ui.shadcn.com) (style base-nova)
- [Zod](https://zod.dev)

## Démarrage

```bash
pnpm install
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

```
src/
  app/
    page.tsx             # accueil
    demos/[slug]/        # page par démo
    api/demos/pixel-ai/grid-command/route.ts  # Gemini + rate limit IP
  features/demos/        # demos.ts
  features/pixel-ai/     # démo Pixel AI
  components/ui/         # shadcn
```

## Ajouter une démo

1. Entrée dans `src/features/demos/demos.ts`
2. Composant client dans `src/features/<nom-demo>/`
3. Enregistrement dans `src/app/demos/[slug]/page.tsx` (`DEMO_VIEWS`)
4. Route `src/app/api/...` si la clé SDK doit rester côté serveur

## Pixel AI

- Variable `GEMINI_API_KEY` (identique à ludusVitaeNext)
- `POST /api/demos/pixel-ai/grid-command` — corps `{ prompt, gridSize, pixels }` ; réponse `{ pixels }` (le client ajuste la taille de la grille)
- Rate limit par IP : 30 requêtes / heure par défaut (`PIXEL_AI_RATE_LIMIT_MAX`, `PIXEL_AI_RATE_LIMIT_WINDOW_MS`)
- Prompt max. 2 000 caractères

## Scripts

| Commande      | Description        |
|---------------|--------------------|
| `pnpm dev`    | Serveur de dev     |
| `pnpm build`  | Build production   |
| `pnpm start`  | Serveur production |
| `pnpm lint`   | ESLint             |
