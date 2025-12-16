# Development Login Guide

## Quick Login for Different Roles

When running in **mock mode** (`NEXT_PUBLIC_BACKEND_MODE=mock`), you can log in with any password, but the **email determines your role**:

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Client** | `client@test.com` (or any email) | `any` |
| **Expert** | `expert@test.com` | `any` |
| **Admin** | `admin@test.com` | `any` |

### How It Works

The mock backend detects the role from the email address:
- Emails containing `expert@` or starting with `expert` → **Expert** role
- Emails containing `admin@` or starting with `admin` → **Admin** role
- All other emails → **Client** role (default)

### Examples

```
Email: expert@test.com     → Logs in as Expert
Email: admin@local.dev     → Logs in as Admin
Email: user@example.com    → Logs in as Client
Email: test@test.com       → Logs in as Client
```

### Sign Up for Different Roles

Alternatively, you can use the signup page (`/signup`) to create accounts with specific roles:
- `/signup/client` - Sign up as Client
- `/signup/expert` - Sign up as Expert

The signup form allows you to choose the role directly.

---

## Switching Between Roles

1. **Log out** from the current account
2. **Log in** with a different email (see table above)
3. You'll be redirected to the appropriate dashboard

---

## Testing Different Features

### As Client:
- Browse experts at `/app/experten`
- Book appointments at `/app/buchen/[expertId]`
- View appointments at `/app/termine`
- View dashboard at `/app`

### As Expert:
- View dashboard at `/app`
- Manage calendar at `/app/kalender`
- Manage offers at `/app/angebote`
- View finances at `/app/finanzen`

### As Admin:
- Verify experts at `/admin/experts`
- Manage rooms at `/admin/rooms`
- View admin dashboard at `/admin`

---

## Notes

- **Password doesn't matter** in mock mode - use any password
- **Data doesn't persist** - refreshing will log you out
- **Mock data** is pre-filled for testing
- For **real authentication**, switch to Supabase mode in `.env.local`



