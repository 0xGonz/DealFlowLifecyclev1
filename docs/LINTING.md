# Code Quality and Formatting

This project uses ESLint and Prettier to maintain code quality and consistent formatting.

## Setup

The necessary dependencies and configuration files have been added to the project:

- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `scripts/lint.sh` - Script to check for linting issues
- `scripts/lint-fix.sh` - Script to automatically fix linting issues where possible

## Usage

### Check for Issues

To check for code quality and formatting issues:

```bash
./scripts/lint.sh
```

This will run both ESLint and Prettier in check mode, reporting any issues found.

### Fix Issues

To automatically fix code quality and formatting issues where possible:

```bash
./scripts/lint-fix.sh
```

This will run both ESLint and Prettier in fix mode, automatically correcting issues where possible.

## VS Code Integration

For VS Code users, we recommend installing the following extensions:

- ESLint (dbaeumer.vscode-eslint)
- Prettier - Code formatter (esbenp.prettier-vscode)

Configure VS Code to format on save by adding the following to your settings.json:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Rules

Our ESLint configuration enforces:

- Best practices from ESLint recommended rules
- TypeScript-specific rules from @typescript-eslint
- React-specific rules from eslint-plugin-react
- React Hooks rules from eslint-plugin-react-hooks 
- Prettier formatting rules

Some key rules include:

- No unused variables (with exceptions for variables starting with _)
- Enforcing React hooks rules
- Warning on any type usage
- Disabling React-in-JSX-scope requirement for newer React versions