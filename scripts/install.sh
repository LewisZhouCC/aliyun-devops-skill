#!/usr/bin/env bash
set -euo pipefail

repo_url="https://github.com/cocovs/aliyun-devops-skill.git"
skill_name="aliyun-devops"
codex_home="${CODEX_HOME:-$HOME/.codex}"
target_dir="$codex_home/skills/$skill_name"
write_zshrc=0
zshrc_file="${ZDOTDIR:-$HOME}/.zshrc"

usage() {
  cat <<'USAGE'
Usage: scripts/install.sh [--zshrc]

Installs the Aliyun DevOps skill to:
  ${CODEX_HOME:-$HOME/.codex}/skills/aliyun-devops

Options:
  --zshrc   Add or update a managed environment variable block in ~/.zshrc.
  -h, --help
            Show this help.

Before using --zshrc, export real local values in the current shell when available:
  export YUNXIAO_ACCESS_TOKEN="<token>"
  export YUNXIAO_ORGANIZATION_ID="<organization-id>"

Unset values are written as empty strings, not placeholders.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --zshrc)
      write_zshrc=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

mkdir -p "$codex_home/skills"

if [[ -d "$target_dir/.git" ]]; then
  git -C "$target_dir" pull --ff-only
else
  rm -rf "$target_dir"
  git clone "$repo_url" "$target_dir"
fi

npm --prefix "$target_dir/scripts/yunxiao-cli" install

if [[ "$write_zshrc" -eq 1 ]]; then
  start_marker="# >>> aliyun-devops-skill"
  end_marker="# <<< aliyun-devops-skill"
  tmp_file="$(mktemp)"

  touch "$zshrc_file"
  awk -v start="$start_marker" -v end="$end_marker" '
    $0 == start { skip = 1; next }
    $0 == end { skip = 0; next }
    skip != 1 { print }
  ' "$zshrc_file" > "$tmp_file"

  cat >> "$tmp_file" <<EOF
$start_marker
export YUNXIAO_ACCESS_TOKEN="${YUNXIAO_ACCESS_TOKEN:-}"
export YUNXIAO_API_BASE_URL="${YUNXIAO_API_BASE_URL:-https://openapi-rdc.aliyuncs.com}"
export YUNXIAO_REGION_DEFAULT_ORG_ID="${YUNXIAO_REGION_DEFAULT_ORG_ID:-default}"
export YUNXIAO_DEBUG="${YUNXIAO_DEBUG:-0}"

# Optional resource identifiers. Empty values mean they are not configured.
export YUNXIAO_ORGANIZATION_ID="${YUNXIAO_ORGANIZATION_ID:-}"
export YUNXIAO_PROJECT_ID="${YUNXIAO_PROJECT_ID:-}"
export YUNXIAO_SPACE_ID="${YUNXIAO_SPACE_ID:-}"
export YUNXIAO_REPOSITORY_ID="${YUNXIAO_REPOSITORY_ID:-}"
export YUNXIAO_PIPELINE_ID="${YUNXIAO_PIPELINE_ID:-}"
export YUNXIAO_ASSIGNEE_ID="${YUNXIAO_ASSIGNEE_ID:-}"
$end_marker
EOF

  mv "$tmp_file" "$zshrc_file"
  echo "Updated $zshrc_file"
fi

echo "Installed $skill_name to $target_dir"
echo "Restart Codex or start a new shell session before using \$aliyun-devops."
