# Aliyun DevOps Skill

Codex skill for operating Alibaba Cloud Yunxiao DevOps resources through a bundled CLI.

## Setup

Install this folder as a Codex skill by placing it under your skills directory, for example:

```bash
mkdir -p ~/.codex/skills
cp -R aliyun-devops-skill ~/.codex/skills/aliyun-devops
```

Install CLI dependencies:

```bash
cd scripts/yunxiao-cli
npm install
cd ../..

export YUNXIAO_ACCESS_TOKEN="<token>"
node scripts/yunxiao-cli/index.mjs --help
```

Optional environment variables:

```bash
export YUNXIAO_API_BASE_URL="https://openapi-rdc.aliyuncs.com"
export YUNXIAO_REGION_DEFAULT_ORG_ID="default"
export YUNXIAO_DEBUG=0

# Store real resource identifiers locally instead of hard-coding them in docs or scripts.
export YUNXIAO_ORGANIZATION_ID="<organization-id>"
export YUNXIAO_PROJECT_ID="<project-id>"
export YUNXIAO_SPACE_ID="<space-id>"
export YUNXIAO_REPOSITORY_ID="<repository-id>"
export YUNXIAO_PIPELINE_ID="<pipeline-id>"
export YUNXIAO_ASSIGNEE_ID="<user-id>"
```

## Security

- Do not commit `.env` files, tokens, organization IDs, user IDs, project IDs, repository IDs, pipeline IDs, or real resource URLs.
- Pass credentials through environment variables or request headers.
- Do not pass tokens through URL query strings because URLs are commonly logged by proxies and servers.
- Debug output redacts token-like fields, but debug logs can still expose resource metadata. Review logs before sharing.

## Usage

See [SKILL.md](SKILL.md) for agent instructions and CLI examples.

Trigger the skill with `$aliyun-devops`.
