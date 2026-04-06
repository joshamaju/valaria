# Valaria

Valaria is a monorepo for browser UI primitives and custom elements.

## Workspace

- Package manager: `pnpm@10.14.0`
- Language: TypeScript
- Release flow: Changesets
- Workspaces:
  - `packages/*`
  - `playground/*`

## Packages

### `packages/core`

Published as `valaria`.

Contains the core UI toolbelt package and its tests.

### `packages/components`

Published as `@valaria/components`.

Contains higher-level components, including the `VirtualFocus` exports.

### `packages/virtual-scroll`

Published as `@valaria/virtual-scroll`.

Contains the `<virtual-scroll>` custom element, browser examples, and tests.

Package-level documentation lives in [packages/virtual-scroll/README.md](/packages/virtual-scroll/README.md).

## Playgrounds

The `playground/` directory contains local apps and framework integrations used to exercise the packages during development, including:

## Getting Started

Install dependencies:

```sh
pnpm install
```

Build the workspace from the repo root:

```sh
pnpm run build
```

Run all workspace tests:

```sh
pnpm test
```

Run commands for a specific package:

```sh
pnpm --filter @valaria/virtual-scroll test
pnpm --filter valaria build
pnpm --filter @valaria/components dev
```

## Common Scripts

From the monorepo root:

- `pnpm run build` - build the root TypeScript project
- `pnpm test` - run tests recursively across workspaces
- `pnpm changeset` - create a release changeset
- `pnpm version` - apply version updates from changesets
- `pnpm release` - publish release artifacts

Most packages also expose local scripts such as `build`, `dev`, `test`, and `docs`.

## Development Notes

- Prefer running package-specific commands with `pnpm --filter <package> <script>`.
- `packages/virtual-scroll` includes runnable examples in `examples/`.
- `packages/core` includes generated docs in `docs/`.
- Some browser-oriented tests use Playwright as part of package test scripts.

## Repository Layout

```text
.
├── packages/
│   ├── components/
│   ├── core/
│   └── virtual-scroll/
├── playground/
├── .changeset/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.build.json
```
