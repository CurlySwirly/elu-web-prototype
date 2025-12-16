# Development Setup Guide

Welcome to the Wellness Platform! This guide will help you set up your local development environment.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Git**
- **Supabase Account** (for database) - https://supabase.com

---

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd wellness-platform

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
```

### 3. Configure Backend Mode

You have **3 options** for backend during development:

#### Option A: Use Supabase (Recommended)

```env
NEXT_PUBLIC_BACKEND_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Setup Supabase:**
1. Create account at https://app.supabase.com
2. Create new project
3. Go to Settings → API
4. Copy URL and anon key to `.env`
5. Run migrations (see Database Setup below)

#### Option B: Use Mock Backend (UI Development)

```env
NEXT_PUBLIC_BACKEND_MODE=mock
```

- No database needed
- Great for UI/UX development
- Pre-filled mock data
- No authentication required

#### Option C: Use Custom Backend

```env
NEXT_PUBLIC_BACKEND_MODE=custom
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

- Requires your own backend implementation
- See `BACKEND_MIGRATION_GUIDE.md` for details

### 4. Database Setup (Supabase only)

Our migrations are already applied to the Supabase instance. If you need to set up a fresh database:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Or manually in Supabase Dashboard:**
1. Go to SQL Editor
2. Run each migration file from `supabase/migrations/` in order

### 5. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Development Modes

### Frontend-Only Development (Mock Mode)

Perfect for working on UI without backend:

```env
NEXT_PUBLIC_BACKEND_MODE=mock
```

```bash
npm run dev
```

**Features:**
- ✅ All UI components work
- ✅ Mock data for users, experts, rooms
- ✅ Simulated booking flows
- ✅ No database required
- ❌ Data doesn't persist
- ❌ No real authentication

### Full-Stack Development (Supabase Mode)

Complete development with real database:

```env
NEXT_PUBLIC_BACKEND_MODE=supabase
```

```bash
npm run dev
```

**Features:**
- ✅ Real database persistence
- ✅ Real authentication
- ✅ Full booking system
- ✅ Notifications
- ✅ File uploads (Supabase Storage)
- ⚠️ Requires Supabase account

### Custom Backend Development

Use your own backend:

```env
NEXT_PUBLIC_BACKEND_MODE=custom
```

1. Implement backend client in `lib/backend/custom/client.ts`
2. Follow interface in `lib/backend/types.ts`
3. See `BACKEND_MIGRATION_GUIDE.md`

---

## Project Structure

```
wellness-platform/
├── app/                      # Next.js App Router pages
│   ├── app/                  # Authenticated app pages
│   │   ├── termine/          # Appointments (Client & Expert)
│   │   ├── raeume-finden/    # Room search (Expert)
│   │   ├── raeume/           # Room management (Provider)
│   │   └── ...
│   ├── admin/                # Admin pages
│   ├── login/                # Authentication pages
│   └── signup/
├── components/               # Reusable React components
│   ├── ui/                   # shadcn/ui components
│   ├── AppointmentDetailModal.tsx
│   └── ...
├── lib/                      # Core libraries
│   ├── backend/              # Backend abstraction layer
│   │   ├── client.ts         # Backend client factory
│   │   ├── types.ts          # Backend interfaces
│   │   ├── supabase/         # Supabase implementation
│   │   ├── mock/             # Mock implementation
│   │   └── custom/           # Custom backend (implement here)
│   ├── services/             # Business logic services
│   │   ├── booking.ts        # Booking & cancellation logic
│   │   ├── verification.ts   # Expert verification
│   │   └── ...
│   └── utils/                # Utility functions
├── supabase/
│   └── migrations/           # Database migrations
├── .env                      # Environment variables (gitignored)
├── .env.example              # Environment template
└── package.json
```

---

## Common Development Tasks

### Adding a New Page

```bash
# Create page in app router
mkdir -p app/app/my-page
touch app/app/my-page/page.tsx
```

```tsx
'use client';

export default function MyPage() {
  return <div>My Page</div>;
}
```

### Creating a Database Migration

```bash
# Using Supabase CLI
supabase migration new my_migration_name
```

Edit the created file in `supabase/migrations/`, then:

```bash
supabase db push
```

**Or manually:**
1. Create file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Add SQL with detailed comment header (see existing migrations)
3. Run in Supabase Dashboard SQL Editor

### Adding a New Service

```typescript
// lib/services/my-service.ts
import { supabase } from '@/lib/supabase';

export async function myFunction() {
  const { data, error } = await supabase
    .from('my_table')
    .select('*');

  if (error) throw error;
  return data;
}
```

**Backend Integration Note:**
Add comment at top of file:
```typescript
/**
 * BACKEND INTEGRATION NOTE:
 * Replace supabase with backend client when migrating.
 * See BACKEND_MIGRATION_GUIDE.md
 */
```

### Using UI Components

We use **shadcn/ui** components:

```bash
# Add a new component
npx shadcn-ui@latest add button
```

Components are in `components/ui/`

---

## Environment Variables Reference

### Required (Supabase Mode)

```env
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anonymous key
NEXT_PUBLIC_BACKEND_MODE=       # Backend mode: supabase|mock|custom
```

### Optional

```env
# Custom Backend
NEXT_PUBLIC_API_BASE_URL=       # Your API base URL
NEXT_PUBLIC_API_KEY=            # API authentication key

# Payments (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

---

## Testing

### Type Checking

```bash
npm run typecheck
```

### Build Test

```bash
npm run build
```

### Linting

```bash
npm run lint
```

---

## User Roles & Access

### Client
- Browse experts
- Book sessions
- View appointments
- Cancel bookings (24h rule)

### Expert
- Must be **verified** first
- Confirm/reject bookings
- Manage availability
- View earnings

### Admin
- Verify experts
- View all data
- Manage users

---

## Database Schema Overview

### Core Tables

**users & profiles**
- Authentication and basic info

**expert_profiles**
- Expert-specific data
- Verification status
- Qualifications

**provider_profiles**
- Provider-specific data
- Business information
- Onboarding checklist

**appointments**
- Session bookings (Client ↔ Expert)
- Payment tracking
- Status: requested → confirmed → completed

**room_bookings**
- Room rentals (Expert ↔ Provider)
- Linked to appointments (optional)
- 24-hour cancellation policy

**rooms**
- Room listings
- Amenities
- Hourly rates

**expert_offers**
- Services offered by experts
- Pricing
- Format (online/in-person)

---

## Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules .next
npm install
```

### Supabase connection fails

1. Check `.env` values
2. Verify Supabase project is active
3. Check anon key hasn't expired
4. Ensure RLS policies allow access

### Mock mode not working

```bash
# Ensure backend mode is set
echo "NEXT_PUBLIC_BACKEND_MODE=mock" >> .env
rm -rf .next
npm run dev
```

### Type errors after changes

```bash
npm run typecheck
# Fix reported errors
npm run build
```

### Database migrations out of sync

```bash
# Reset local Supabase (DESTRUCTIVE!)
supabase db reset

# Or manually run missing migrations in dashboard
```

---

## Hot Reload & Dev Tools

### Next.js Fast Refresh

- Auto-reloads on file changes
- Preserves component state
- Works with both pages and components

### React Developer Tools

Install browser extension:
- Chrome: React Developer Tools
- Firefox: React DevTools

### Supabase Dashboard

Access at: `https://app.supabase.com`

Useful sections:
- **Table Editor**: Browse/edit data
- **SQL Editor**: Run queries
- **Database**: View schema
- **Auth**: Manage users
- **Storage**: File uploads

---

## Production Build

### Local Production Build

```bash
npm run build
npm start
```

### Environment for Production

```env
NODE_ENV=production
NEXT_PUBLIC_BACKEND_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

---

## Getting Help

### Documentation

- **Booking System**: `BOOKING_FLOW_SYSTEM.md`
- **Expert Verification**: `EXPERT_VERIFICATION_SYSTEM.md`
- **Provider Onboarding**: `PROVIDER_ONBOARDING_COMPLETE.md`
- **Backend Migration**: `BACKEND_MIGRATION_GUIDE.md`

### Common Issues

1. **Can't log in**: Check backend mode, ensure user exists
2. **Data not persisting**: Using mock mode? Switch to supabase
3. **Expert can't book rooms**: Check verification_status = 'verified'
4. **RLS errors**: Check Supabase policies in dashboard

### Code Examples

Check existing components for patterns:
- **Forms**: `app/onboarding/expert/page.tsx`
- **Lists**: `app/app/termine/page.tsx`
- **Modals**: `components/AppointmentDetailModal.tsx`
- **Services**: `lib/services/booking.ts`

---

## Next Steps

1. ✅ Setup environment
2. ✅ Choose backend mode
3. ✅ Start dev server
4. 📖 Read feature documentation
5. 🎨 Start coding!

**Happy coding! 🚀**
