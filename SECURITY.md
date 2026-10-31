# Security

This server binds only to 127.0.0.1. It is a personal local development tool, not a hardened public multi-tenant service. Optional CAT_OFFICE_TOKEN authentication protects status GET and POST. Keep it in environment variables, never browser config or source control. Public app assets remain readable. Credentials entered in the UI stay in page memory.

The server caps request sizes and records, validates batches before mutation, rejects foreign Origin writes, and serves only app/. Status is in memory. No remote code execution, command submission or approval endpoint exists. Do not put confidential task content into a display intended for screen sharing.

Uploaded photos are processed locally for colors and are not sent to the server. Browser appearance records are local and origin-scoped. Cross-origin pull credentials are not forwarded by the UI.

If publishing this repository later, configure a private vulnerability reporting channel first. Until then, report issues directly to the project owner privately; never include live credentials or exploit details in a public issue.
