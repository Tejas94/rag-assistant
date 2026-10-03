# Security

## Authentication

The dashboard supports passwords with mandatory two-factor authentication (TOTP or hardware keys). Single sign-on via SAML or OIDC is available on the Enterprise plan only.

## API keys

API keys are scoped to a single project and can be read-only or read-write. Keys expire after 90 days by default; you can set a shorter expiry but not a longer one. Rotate a key with `nw keys rotate <key-id>`, which keeps the old key valid for 24 hours.

## Encryption

All data is encrypted at rest with AES-256 and in transit with TLS 1.3. Enterprise customers can bring their own encryption keys (BYOK) through an external KMS.

## Compliance

Northwind Cloud is ISO 27001 certified and completes a SOC 2 Type II audit every year. Reports are available to Team and Enterprise customers under NDA.
