#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

node scripts/yunxiao-cli/index.mjs --help >/dev/null
node scripts/yunxiao-cli/index.mjs list --category=project >/dev/null
(cd scripts/yunxiao-cli && npm test)

if rg -n --glob '!**/node_modules/**' --glob '!scripts/check.sh' \
  '/Users/zhouyang|sidekick|69a7ade13edfe86b36c375f0|registry\.npmmirror|shengsuan|胜算|internal\.shengsuanyun|58\.38|aliyuncsslb|nlb-|your-personal-access-token|\b[0-9a-f]{24}\b|\b[0-9a-f]{32}\b|AKIA[0-9A-Z]{16}|LTAI[0-9A-Za-z]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{20,}' \
  .; then
  echo "Potential sensitive content found." >&2
  exit 1
fi

git add -n . >/tmp/aliyun-devops-skill-git-add-preview.txt
if rg -n 'node_modules|\.env($|[^.]|\.local|\.production|\.development)' /tmp/aliyun-devops-skill-git-add-preview.txt; then
  echo "Ignored local files would be added." >&2
  exit 1
fi

echo "OK"
