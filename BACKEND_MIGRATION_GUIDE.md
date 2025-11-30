# Backend Migration Guide

## ⚠️ Current Status: PARTIALLY OPTIMIZED

### What's Good ✅
The original architecture was well-designed with a proper abstraction layer:
- `lib/backend/client.ts` - Backend switcher
- `lib/backend/types.ts` - Interfaces
- `lib/backend/supabase/` - Supabase implementation
- `lib/backend/mock/` - Mock implementation
- `lib/api.ts` - Frontend API layer

### What Needs Fixing ⚠️
The **new services** we added bypass the abstraction layer:

**Services with Direct Supabase Calls:**
1. ✅ `lib/services/chat.ts` - Direct Supabase (needs abstraction)
2. ✅ `lib/services/verification.ts` - Direct Supabase (needs abstraction)
3. ✅ `lib/services/review.ts` - Direct Supabase (needs abstraction)
4. ✅ `lib/services/cancellation.ts` - Direct Supabase (needs abstraction)
5. ✅ `lib/services/booking.ts` - **NEW** Direct Supabase (has integration notes)

**Why This Matters:**
- These services directly import and use `supabase` client
- Replacing backend would require modifying each service file
- Defeats the purpose of the abstraction layer

---

## 🎯 How to Make It Fully Backend-Agnostic

### Option 1: Quick Fix (Service Pattern)
Keep services as-is but make them accept a backend client:

```typescript
// lib/services/verification.ts
import type { IBackendClient } from '@/lib/backend/types';

export class VerificationService {
  constructor(private backend: IBackendClient) {}

  async verifyExpert(expertId: string, adminId: string) {
    // Use this.backend instead of direct supabase
    return this.backend.verifyExpert(expertId, adminId);
  }
}

// Usage
import { backend } from '@/lib/backend/client';
export const verificationService = new VerificationService(backend);
```

### Option 2: Proper Architecture (Recommended)
Move service logic into backend implementations:

```
lib/backend/
  ├── types.ts                    # Interfaces
  ├── client.ts                   # Switcher
  ├── supabase/
  │   ├── client.ts
  │   ├── verification.ts         # ← Move verification logic here
  │   ├── chat.ts                 # ← Move chat logic here
  │   ├── review.ts               # ← Move review logic here
  │   └── cancellation.ts         # ← Move cancellation logic here
  └── custom/
      ├── verification.ts         # Your implementation
      ├── chat.ts                 # Your implementation
      └── ...
```

---

## 🔧 Step-by-Step Migration

### Step 1: Extend Backend Interface

Add new methods to `lib/backend/types.ts`:

```typescript
export interface IBackendClient {
  // Existing methods...
  experts: IExpertRepository;
  appointments: IAppointmentRepository;

  // NEW: Add service methods
  verification: IVerificationService;
  chat: IChatService;
  reviews: IReviewService;
  cancellations: ICancellationService;
}

export interface IVerificationService {
  getPendingExperts(): Promise<ExpertProfile[]>;
  verifyExpert(expertId: string, adminId: string, notes?: string): Promise<void>;
  rejectExpert(expertId: string, adminId: string, notes: string): Promise<void>;
  uploadDocument(expertId: string, file: File, type: string): Promise<Document>;
  getExpertDocuments(expertId: string): Promise<Document[]>;
}

export interface IChatService {
  getOrCreateThread(appointmentId: string, clientId: string, expertId: string): Promise<ChatThread>;
  getThreadsByUser(userId: string, isExpert: boolean): Promise<ChatThread[]>;
  sendMessage(threadId: string, senderId: string, message: string): Promise<ChatMessage>;
  getThreadMessages(threadId: string): Promise<ChatMessage[]>;
  markMessagesAsRead(threadId: string, userId: string): Promise<void>;
  getUnreadCount(userId: string, isExpert: boolean): Promise<number>;
}

// ... similar for reviews and cancellations
```

### Step 2: Implement in Supabase Backend

Create `lib/backend/supabase/verification.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import type { IVerificationService } from '../types';

export class SupabaseVerificationService implements IVerificationService {
  async getPendingExperts() {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(/* ... */)
      .eq('verification_status', 'pending');

    if (error) throw error;
    return data;
  }

  // ... implement all other methods
}
```

### Step 3: Update Supabase Client

```typescript
// lib/backend/supabase/client.ts
import { SupabaseVerificationService } from './verification';
import { SupabaseChatService } from './chat';

export class SupabaseBackendClient implements IBackendClient {
  verification: IVerificationService;
  chat: IChatService;

  constructor() {
    this.verification = new SupabaseVerificationService();
    this.chat = new SupabaseChatService();
    // ...
  }
}
```

### Step 4: Update Service Exports

```typescript
// lib/services/verification.ts
import { backend } from '@/lib/backend/client';

// Just re-export from backend
export const verificationService = backend.verification;

// Or if you want to keep the service pattern:
export const verificationService = {
  async verifyExpert(expertId: string, adminId: string, notes?: string) {
    return backend.verification.verifyExpert(expertId, adminId, notes);
  },
  // ... other methods
};
```

### Step 5: Implement Custom Backend

When you're ready for your own backend:

```typescript
// lib/backend/custom/verification.ts
import type { IVerificationService } from '../types';

export class CustomVerificationService implements IVerificationService {
  private apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async getPendingExperts() {
    const response = await fetch(`${this.apiUrl}/admin/experts/pending`);
    return response.json();
  }

  async verifyExpert(expertId: string, adminId: string, notes?: string) {
    await fetch(`${this.apiUrl}/admin/experts/${expertId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, notes }),
    });
  }

  // ... implement all other methods
}
```

---

## 🚀 Quick Migration Script

Here's what needs to happen:

1. **Define interfaces** in `lib/backend/types.ts`
2. **Move current service code** to `lib/backend/supabase/`
3. **Update SupabaseBackendClient** to include new services
4. **Update service exports** to use backend client
5. **Create stub implementations** in `lib/backend/custom/`

---

## 📊 Current Direct Supabase Usage

### Files That Import Supabase Directly:
```
lib/services/verification.ts   ← NEEDS ABSTRACTION
lib/services/chat.ts           ← NEEDS ABSTRACTION
lib/services/review.ts         ← NEEDS ABSTRACTION
lib/services/cancellation.ts   ← NEEDS ABSTRACTION
lib/services/booking.ts        ← NEEDS ABSTRACTION (includes detailed integration notes)
```

**Note on booking.ts**: This service includes detailed comments on where to integrate custom backend. It uses PostgreSQL functions (supabase.rpc()) for complex operations like cancellations with 24-hour refund logic.

### Files That Use Abstraction Correctly:
```
lib/api.ts                     ✅ Uses backend client
lib/backend/client.ts          ✅ Switcher
lib/backend/supabase/client.ts ✅ Implementation
All page components            ✅ Use lib/api.ts
```

---

## 💡 Recommendation

**For Now (Quick Win):**
The services work fine with Supabase. They're modular and well-organized. When you need to replace Supabase:

1. Copy service logic to `lib/backend/custom/verification.ts` etc.
2. Replace Supabase calls with your API calls
3. Update imports in components

**For Production (Best Practice):**
Follow the full migration above to maintain architectural consistency.

---

## 🎯 Benefits After Full Migration

1. **Single Configuration Point**: Change backend in one place
2. **Type Safety**: TypeScript ensures all implementations match
3. **Easy Testing**: Swap to mock backend instantly
4. **Future-Proof**: Add GraphQL, REST, or any backend easily
5. **Consistent Patterns**: All data access follows same pattern

---

## ⏱️ Estimated Migration Time

- **Service Interface Definition**: 1 hour
- **Move Supabase Implementation**: 2-3 hours
- **Update Client & Exports**: 1 hour
- **Testing**: 2 hours
- **Total**: ~1 day of work

---

## 📝 Current Workaround

Until migration is complete, replacing Supabase requires:

1. Edit each service file (`verification.ts`, `chat.ts`, etc.)
2. Replace `supabase` import with your API client
3. Replace Supabase queries with your API calls
4. Keep the same function signatures

This is manageable since services are already isolated and have clear APIs.
