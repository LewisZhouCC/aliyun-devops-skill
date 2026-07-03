# Aliyun DevOps Skill

Codex skill for operating Alibaba Cloud Yunxiao DevOps resources through a bundled CLI.

## Setup

Install from GitHub:

```bash
git clone https://github.com/cocovs/aliyun-devops-skill.git
cd aliyun-devops-skill
scripts/install.sh
```

To also write the required environment variables to `~/.zshrc`:

```bash
export YUNXIAO_ACCESS_TOKEN="<token>"
scripts/install.sh --zshrc
source ~/.zshrc
```

The installer writes a managed block between:

```text
# >>> aliyun-devops-skill
# <<< aliyun-devops-skill
```

Optional environment variables:

```bash
export YUNXIAO_API_BASE_URL="https://openapi-rdc.aliyuncs.com"
export YUNXIAO_REGION_DEFAULT_ORG_ID="default"
export YUNXIAO_DEBUG=0
```

## Security

- Do not commit `.env` files, tokens, organization IDs, user IDs, project IDs, repository IDs, pipeline IDs, or real resource URLs.
- Pass credentials through environment variables or request headers.
- Do not pass tokens through URL query strings because URLs are commonly logged by proxies and servers.
- Debug output redacts token-like fields, but debug logs can still expose resource metadata. Review logs before sharing.

## Usage

See [SKILL.md](SKILL.md) for agent instructions and CLI examples.

Trigger the skill with `$aliyun-devops`.
