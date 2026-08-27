#!/usr/bin/env bash
set -euo pipefail

repo_url="https://github.com/LewisZhouCC/aliyun-devops-skill.git"
skill_name="aliyun-devops"
codex_home="${CODEX_HOME:-$HOME/.codex}"
claude_home="${CLAUDE_HOME:-$HOME/.claude}"
install_target="both"
write_zshrc=0
zshrc_file="${ZDOTDIR:-$HOME}/.zshrc"

usage() {
  cat <<'USAGE'
Usage: scripts/install.sh [--target codex|claude|both] [--zshrc]

Installs the Aliyun DevOps skill to one or both personal skill directories:
  Codex:       ${CODEX_HOME:-$HOME/.codex}/skills/aliyun-devops
  Claude Code: ${CLAUDE_HOME:-$HOME/.claude}/skills/aliyun-devops

Options:
  --target   Install target. Defaults to both.
  --zshrc   Add or update a managed environment variable block in ~/.zshrc.
  -h, --help
            Show this help.

Before using --zshrc, export the token in the current shell when available:
  export YUNXIAO_ACCESS_TOKEN="<token>"

Unset values are written as empty strings, not placeholders.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      install_target="${2:-}"
      if [[ "$install_target" != "codex" && "$install_target" != "claude" && "$install_target" != "both" ]]; then
        echo "--target must be one of: codex, claude, both" >&2
        exit 1
      fi
      shift 2
      ;;
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

install_one() {
  local root="$1"
  local label="$2"
  local target_dir="$root/skills/$skill_name"

  mkdir -p "$root/skills"

  if [[ -d "$target_dir/.git" ]]; then
    git -C "$target_dir" pull --ff-only
  else
    rm -rf "$target_dir"
    git clone "$repo_url" "$target_dir"
  fi

  npm --prefix "$target_dir/scripts/yunxiao-cli" install
  echo "Installed $skill_name for $label to $target_dir"
}

if [[ "$install_target" == "codex" || "$install_target" == "both" ]]; then
  install_one "$codex_home" "Codex"
fi

if [[ "$install_target" == "claude" || "$install_target" == "both" ]]; then
  install_one "$claude_home" "Claude Code"
fi

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
$end_marker
EOF

  mv "$tmp_file" "$zshrc_file"
  echo "Updated $zshrc_file"
fi

echo "Restart Codex/Claude Code or start a new shell session before using the skill."
echo "Codex trigger: \$aliyun-devops"
echo "Claude Code trigger: /aliyun-devops"
