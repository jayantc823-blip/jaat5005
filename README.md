# Next.js Starter Template

A clean, minimal Next.js 16 starter template designed for AI-assisted development. Built with TypeScript, Tailwind CSS 4, and ESLint — ready to be extended into any web application.

## Features

- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Tailwind CSS 4** for rapid UI development
- **ESLint** for code quality
- **Bun** as package manager
- Minimal, clean starting structure
- AI-assisted development ready

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed

### Installation

1. Install dependencies:

```bash
bun install
```

2. Run the development server:

```bash
bun run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | Run TypeScript type checking |

## Development

### Linting and Type Checking

Before committing, ensure your code passes lint and type checks:

```bash
bun run lint && bun run typecheck
```

### Project Structure

```
src/
  app/
    layout.tsx      # Root layout
    page.tsx        # Home page
.next/              # Next.js build output
.kilocode/          # AI assistant configuration and recipes
```

## Extending the Template

This template includes a recipe system for adding common features:

- **Database**: Add database persistence (see `.kilocode/recipes/add-database.md`)
- **Authentication**: Add user auth
- **API Routes**: Add backend endpoints
- **Components**: Add React components as needed

## Tech Stack

- **Framework**: Next.js 16.1.3
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.1.17
- **Linting**: ESLint 9.39.1
- **Package Manager**: Bun

## License

MIT
