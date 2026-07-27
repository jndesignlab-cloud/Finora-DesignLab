# Finora Security Notes

## Current security model

Finora Supabase Edition v2.0.2 uses:

- Supabase Postgres backend
- Password hashing with Postgres `pgcrypto`
- Recovery-code hashing
- Hashed session tokens
- Session expiration
- Logout session revocation
- Failed-login lockout after repeated attempts
- Audit logs
- RLS enabled on tables
- Revoked direct table grants from public client roles
- RPC-only data access from the frontend

## Do not expose

Never place these in frontend files:

- Supabase service role key
- Personal passwords
- Private recovery codes after you change them
- Database passwords

## First-run actions

After first login:

1. Change the password.
2. Change the recovery code.
3. Enable 2FA on the Supabase account.
4. Limit access to the Supabase dashboard.
5. Keep JSON backups in a secure folder.

## Personal-use limitation

This version is intended for personal or in-house use. For a public product, migrate to:

- Supabase Auth or a dedicated backend auth service
- User-specific normalized tables
- Row Level Security policies based on authenticated user IDs
- Rate limiting
- Monitoring and alerting
- Formal privacy/legal review
