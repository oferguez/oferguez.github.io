# Branching Guidelines

To keep the published site stable, new features and large refactors are implemented on dedicated branches. Once the work is
reviewed it can be merged into the main publishing branch.

## Current Feature Work

- **feature/shared-word-matcher** – Contains the shared matcher utilities, English/Hebrew refactor, and related helper modules.
  This is the branch you can check out to review the matcher rewrite described in the latest pull request.

## Checking Out a Feature Branch

```bash
git fetch
git checkout feature/shared-word-matcher
```

If you already have the repository cloned, the commands above will move your local working copy to the requested feature
branch. Run `npm install` followed by `npm run build` to verify the project still compiles on that branch.
