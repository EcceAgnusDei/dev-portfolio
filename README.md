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
    api/ping/route.ts    # exemple API + Zod
  features/demos/        # demos.ts
  features/pixel-ai/     # démo Pixel AI
  components/ui/         # shadcn
```

## Ajouter une démo

1. Entrée dans `src/features/demos/demos.ts`
2. Composant client dans `src/features/<nom-demo>/`
3. Enregistrement dans `src/app/demos/[slug]/page.tsx` (`DEMO_VIEWS`)
4. Route `src/app/api/...` si la clé SDK doit rester côté serveur

## Scripts

| Commande      | Description        |
|---------------|--------------------|
| `pnpm dev`    | Serveur de dev     |
| `pnpm build`  | Build production   |
| `pnpm start`  | Serveur production |
| `pnpm lint`   | ESLint             |
