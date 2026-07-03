# Security Policy

## Sensitive data

Do not commit or share:

- Yunxiao personal access tokens
- Organization, user, project, repository, pipeline, or work item IDs from real environments
- Real DevOps resource URLs
- `.env` files, debug logs, request headers, or API responses that include private metadata

Use environment variables for credentials and resource identifiers. Keep real values in local, ignored files.

## Reporting

If you find a vulnerability or accidental secret exposure, open a private security advisory or contact the repository owner directly. Do not disclose active credentials or private resource identifiers in public issues.

## Debug logs

Debug output redacts token-like fields, but logs can still include resource metadata. Review logs before sharing them.
