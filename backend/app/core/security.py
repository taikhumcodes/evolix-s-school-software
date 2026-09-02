"""
Security Utilities Stub

This file is intentionally kept minimal.
Core authentication (JWT generation/validation) and RBAC logic is located
within `app.api.deps` and `app.core.auth` to ensure dependency cycles are avoided.
Reusable cryptographic helpers (e.g., specific hashing algorithms not covered by passlib directly)
can be added here in the future if they do not destabilize the verified auth behavior.
"""
