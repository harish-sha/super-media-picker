# Security policy

## Supported versions

During the public beta, security fixes are applied to the latest published
`0.1.0-beta.x` version only. Consumers should update to the newest beta before
reporting an issue.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's
[private vulnerability reporting](https://github.com/harish-sha/super-media-picker/security/advisories/new)
form and include:

- affected version and export;
- reproduction steps or a minimal repository;
- expected impact;
- any known mitigations.

Please avoid accessing data that is not yours, disrupting services, or publicly
disclosing the issue before a fix is available. Maintainers will acknowledge a
complete report as soon as practical and coordinate status and disclosure
through the private advisory.

## Integration responsibilities

The SDK does not accept or store vendor secrets. Production media requests
should go through the host application's authenticated backend, and media URLs
should be constrained with `mediaSecurity.allowedOrigins` and an appropriate
Content Security Policy. See `docs/security.md` for the full integration model.
