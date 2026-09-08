#!/usr/bin/env bash
# PostToolUse: formatea con Prettier y arregla con ESLint el fichero recien escrito.
# Silencioso por diseno: nunca bloquea el turno ni devuelve errores al modelo.
set -u

file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

# Solo ficheros dentro de este proyecto (ignora scratchpad, /tmp, planes, ~/.claude...)
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$root"/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  */node_modules/*|*/.next/*) exit 0 ;;
esac

cd "$root" || exit 0

# --ignore-unknown: los tipos que Prettier no conoce se saltan sin error.
./node_modules/.bin/prettier --write --ignore-unknown "$file" >/dev/null 2>&1

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    ./node_modules/.bin/eslint --fix "$file" >/dev/null 2>&1
    ;;
esac

exit 0
