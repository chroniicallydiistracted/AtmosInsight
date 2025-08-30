#!/usr/bin/env bash
set -euo pipefail

# Install a list of VS Code extensions using the `code` CLI.
# Run this from your machine where the `code` command is available (VS Code installs it via
# "Shell Command: Install 'code' command in PATH" on macOS or the command palette on Linux/Windows).

EXTENSIONS=(
  "Mikael.Angular-BeastCode"
  "johnpapa.Angular2"
  "NetanelBasal.angular-spectator-snippets"
  "abelfubu.angular-refactorizer"
  "vismalietuva.vscode-angular-support"
  "tomwhite007.rename-angular-component"
  "saoudrizwan.claude-dev"
  "miguelsolorio.fluent-icons"
  "JannisX11.batch-rename-extension"
  "vunguyentuan.vscode-css-variables"
  "liamhammett.inline-parameters"
  "Cardinal90.multi-cursor-case-preserve"
  "kshetline.ligatures-limited"
  "YoavBls.pretty-ts-errors"
  "stringham.move-ts"
  "miclo.sort-typescript-imports"
  # already in workspace recommendations but harmless to re-run
  "Angular.ng-template"
  "steoates.autoimport"
  "formulahendry.auto-rename-tag"
  "aaron-bond.better-comments"
  "naumovs.color-highlight"
  "pranaygp.vscode-css-peek"
  "EditorConfig.EditorConfig"
  "usernamehw.errorlens"
  "dbaeumer.vscode-eslint"
  "pkief.material-icon-theme"
  "esbenp.prettier-vscode"
  "christian-kohler.path-intellisense"
  "bradlc.vscode-tailwindcss"
  "christian-kohler.npm-intellisense"
  "Gruntfuggly.todo-tree"
  "yzhang.markdown-all-in-one"
  "eamodio.gitlens"
  "oderwat.indent-rainbow"
)

if ! command -v code >/dev/null 2>&1; then
  echo "ERROR: 'code' command not found in PATH."
  echo "Please install VS Code and enable the 'code' CLI (see VS Code command palette: 'Shell Command: Install 'code' command in PATH')."
  exit 2
fi

echo "Installing ${#EXTENSIONS[@]} extensions..."
for ext in "${EXTENSIONS[@]}"; do
  echo "-> Installing: $ext"
  # use --force to reinstall if already present
  code --install-extension "$ext" --force || {
    echo "Failed to install $ext, continuing..."
  }
done

echo "Done. Some extensions may require a VS Code restart to activate." 
