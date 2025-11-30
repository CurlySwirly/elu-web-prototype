# Backend Architecture

This project is designed with a **backend-agnostic architecture**, allowing you to easily swap between different backend implementations without changing your frontend code.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Layer                      │
│  (Components, Pages, Contexts)                      │
└────────────────┬────────────────────────────────────┘
                 │
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────┐
│              API Layer (lib/api.ts)                  │
│  Simple function calls: fetchExperts(), etc.        │
└────────────────┬────────────────────────────────────┘
                 │
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────┐
│         Backend Client (lib/backend/client.ts)      │
│  Single entry point - switches implementation       │
└────────────────┬────────────────────────────────────┘
                 │
                 │ implements IBackendClient
                 ▼
┌─────────────────────────────────────────────────────┐
│              Backend Implementations                 │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Supabase   │  │     Mock     │  │  Custom  │ │
│  │   (Default)  │  │ (Dev/Design) │  │  (Yours) │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
```

## Current Implementations

### 1. Supabase Backend (Default)
- Full production implementation
- Uses Supabase Auth + Database
- Located in: `lib/backend/supabase/`

### 2. Mock Backend (Development)
- Uses placeholder data for frontend development
- No database required
- Perfect for design work and frontend development
- Located in: `lib/backend/mock/`
- Data defined in: `lib/backend/mock/data.ts`

### 3. Custom Backend (Your Implementation)
- Placeholder for your own REST/GraphQL API
- You implement the interfaces in: `lib/backend/custom/`

## Switching Backends

### Option 1: Environment Variable (Recommended)

Add to your `.env.local`:

```bash
# Use Supabase (default)
NEXT_PUBLIC_BACKEND_MODE=supabase

# Use Mock data for frontend development
NEXT_PUBLIC_BACKEND_MODE=mock

# Use your custom backend
NEXT_PUBLIC_BACKEND_MODE=custom
```

### Option 2: Direct Code Change

Edit `lib/backend/client.ts`:

```typescript
// Change the default value
const BACKEND_MODE = 'mock'; // or 'supabase' or 'custom'
```

## Using Mock Data for Frontend Development

The mock backend comes with realistic placeholder data including:
- 8 sample experts with profiles
- Sample appointments
- Sample rooms and bookings
- All with realistic German names and content

**To use mock data:**

1. Set environment variable:
```bash
NEXT_PUBLIC_BACKEND_MODE=mock
```

2. Restart your dev server:
```bash
npm run dev
```

3. All data will now come from `lib/backend/mock/data.ts`
4. Edit that file to customize the sample data for your designs

**Benefits:**
- No database setup required
- Instant data without queries
- Perfect for frontend/design work
- Consistent data for screenshots
- Fast iteration

## Implementing Your Own Backend

To integrate your own REST API or GraphQL backend:

### Step 1: Define Your Backend Client

Create `lib/backend/custom/client.ts`:

```typescript
import type { IBackendClient } from '../types';

export class CustomBackendClient implements IBackendClient {
  public auth = new CustomAuthService();
  public experts = new CustomExpertRepository();
  public appointments = new CustomAppointmentRepository();
  public rooms = new CustomRoomRepository();
  public bookings = new CustomBookingRepository();
  public profiles = new CustomProfileRepository();
}
```

### Step 2: Implement Each Service

Create implementations for each service that match the interfaces:

```typescript
// Example: lib/backend/custom/auth.ts
import type { IAuthService } from '../types';

export class CustomAuthService implements IAuthService {
  async signIn(data: SignInData): Promise<AuthUser> {
    const response = await fetch('https://your-api.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const user = await response.json();
    return user;
  }

  // ... implement other methods
}
```

### Step 3: Update Backend Client

Edit `lib/backend/client.ts`:

```typescript
import { CustomBackendClient } from './custom/client';

function createBackendClient(): IBackendClient {
  switch (BACKEND_MODE) {
    case 'custom':
      return new CustomBackendClient(); // Now implemented!
    // ...
  }
}
```

### Step 4: Switch to Your Backend

```bash
NEXT_PUBLIC_BACKEND_MODE=custom
```

## Backend Interfaces

All backend implementations must satisfy these interfaces:

### IAuthService
- `signIn(data)` - Sign in user
- `signUp(data)` - Register new user
- `signOut()` - Sign out user
- `getCurrentUser()` - Get current session
- `onAuthStateChange(callback)` - Listen to auth changes

### IExpertRepository
- `findAll()` - Get all experts
- `findFeatured(limit)` - Get featured experts
- `findById(id)` - Get expert by ID
- `findOffers(expertId)` - Get expert's offers

### IAppointmentRepository
- `findByClientId(userId)` - Get client appointments
- `findByExpertId(expertId)` - Get expert appointments

### IRoomRepository
- `findAll()` - Get all available rooms
- `findByProviderId(providerId)` - Get provider's rooms

### IBookingRepository
- `findByProviderId(providerId)` - Get provider's bookings

### IProfileRepository
- `findById(userId)` - Get user profile

## Data Types

All types are defined in `lib/types/index.ts`:
- `Expert` - Expert profile with ratings, specializations
- `ExpertOffer` - Services offered by experts
- `Appointment` - Booked appointments
- `Room` - Wellness/training spaces
- `RoomBooking` - Room bookings
- `UserProfile` - User profile data
- `AuthUser` - Authenticated user data

## Example: API Layer Usage

The frontend code doesn't change regardless of backend:

```typescript
// In any component
import { fetchFeaturedExperts } from '@/lib/api';

export default async function HomePage() {
  // Works with Supabase, Mock, or Custom backend
  const experts = await fetchFeaturedExperts(8);

  return <ExpertShowcase experts={experts} />;
}
```

## Migration Path

To gradually migrate from Supabase to your own backend:

1. **Start with Mock**: Use mock data to finish frontend
2. **Implement Custom**: Build your custom backend implementation
3. **Test Side-by-Side**: Switch between implementations for testing
4. **Deploy Custom**: Switch env variable in production
5. **Remove Supabase**: Delete Supabase dependencies when ready

## Customizing Mock Data

Edit `lib/backend/mock/data.ts` to customize the sample data:

```typescript
export const mockExperts: Expert[] = [
  {
    id: '1',
    full_name: 'Your Expert Name',
    specializations: ['Your', 'Specializations'],
    hourly_rate: 85.00,
    rating: 4.8,
    // ... customize all fields
  },
  // Add more experts as needed
];
```

This data will appear immediately in your application when using mock mode.

## Benefits of This Architecture

1. **Flexibility**: Switch backends without code changes
2. **Development Speed**: Use mock data for fast iteration
3. **Testing**: Easy to test with different data sources
4. **Migration**: Gradual migration from one backend to another
5. **Team Collaboration**: Designers can work with mock data while backend is being built
6. **Vendor Independence**: Not locked into any specific backend provider
