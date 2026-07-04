# Contributing

## Getting started

```bash
git clone https://github.com/<you>/grid-systems-overlay
cd grid-systems-overlay
npm install
npm run build
```

Load `dist/` as an unpacked extension in `chrome://extensions`.

## Commit format

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Commit messages are enforced by commitlint on every commit.

| Prefix | Effect on version |
|--------|-------------------|
| `fix:` | patch (1.0.**x**) |
| `feat:` | minor (1.**x**.0) |
| `feat!:` or `BREAKING CHANGE:` | major (**x**.0.0) |

Examples:

```
feat: add keyboard shortcut to toggle focus mode
fix: restore nav items when extension is disabled
chore: update dependencies
```

## Development workflow

```bash
npm run test:watch   # run tests on every file change
npm run build        # type-check + bundle → dist/
npm run lint         # ESLint
```

## Pull requests

- Open PRs against `main`.
- GitHub Actions runs lint, tests, and build on every PR.
- A passing CI run and one approval are required before merging.
- `main` is the release branch — every merge triggers semantic-release.

## Release process

Releases are fully automated via [semantic-release](https://semantic-release.gitbook.io/).
Do **not** manually edit `package.json` version or create tags.
When your PR merges into `main`, semantic-release will:

1. Compute the next version from commit messages
2. Build and package the extension zip
3. Create a GitHub release with generated notes and `grid-systems-overlay.zip` attached
4. Commit the updated `CHANGELOG.md` and `package.json` back to `main`

Download the zip from the GitHub release and load it manually in `chrome://extensions`.
