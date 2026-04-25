# Git Repo Setup

How to add this project to a git repository.

## Clone the existing repo

```bash
git clone https://github.com/Maestro513/quotes.iny.git
cd quotes.iny
npm install
cp .env.example .env.local   # fill in secrets
npm run dev
```

## Initialize a fresh repo from a local copy

If you have the source without git history and want to push it to a new
GitHub repository:

```bash
# 1. create the repo on GitHub first (empty, no README/.gitignore)

# 2. initialize locally
cd quotes.iny
git init -b main
git add .
git commit -m "Initial commit"

# 3. wire up the remote and push
git remote add origin git@github.com:<your-user>/<your-repo>.git
git push -u origin main
```

## Add a new remote to an existing clone

```bash
git remote add upstream git@github.com:Maestro513/quotes.iny.git
git remote -v          # verify
git fetch upstream
```

## Working on a feature branch

```bash
git checkout -b feature/<short-description>
# ...edit files...
npm run lint           # required before commit (see CLAUDE.md)
git add <files>
git commit -m "Describe the change"
git push -u origin feature/<short-description>
```

## Notes

- `.gitignore` already excludes `node_modules/`, `.next/`, and `.env*` files.
- Do **not** commit `.env.local` or any file containing `MARKETPLACE_API_KEY`,
  `CONCIERGE_EMAIL`, or `CONCIERGE_PASSWORD`.
- Large precomputed data (`data/zip_backend_plans.json.gz`, the 5,488 files
  under `data/extracted_cms/`) is checked in intentionally — keep it.
