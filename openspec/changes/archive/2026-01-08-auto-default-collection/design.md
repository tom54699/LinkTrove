# Design: Auto-create Default Collection

## Technical Overview
This change modifies the `createOrganization` function in the IndexedDB storage layer to atomically create both an Organization and a default Collection in a single transaction.

## Current Behavior
```typescript
// src/background/idb/storage.ts:650-657
createOrganization: async (name: string, color?: string) => {
  const existing = (await getAll('organizations' as any).catch(() => [])) as any[];
  const order = existing.length ? Math.max(...existing.map((o: any) => o.order ?? 0)) + 1 : 0;
  const org = { id: 'o_' + Math.random().toString(36).slice(2, 9), name: (name || 'Org').trim() || 'Org', color, order } as any;
  await tx('organizations' as any, 'readwrite', async (t) => {
    t.objectStore('organizations' as any).put(org);
  });
  return org as any;
}
```

**Issues:**
1. Only creates Organization, no default Collection
2. User must manually create Collection before adding bookmarks
3. Inconsistent with migration behavior (which creates default Collections)

## Proposed Implementation

### Solution 1: Atomic Transaction (Recommended)

```typescript
createOrganization: async (
  name: string,
  color?: string,
  options?: { createDefaultCollection?: boolean }
) => {
  const { createDefaultCollection = true } = options || {};

  // Calculate order for Organization
  const existing = (await getAll('organizations' as any).catch(() => [])) as any[];
  const order = existing.length ? Math.max(...existing.map((o: any) => o.order ?? 0)) + 1 : 0;

  // Generate IDs
  const orgId = 'o_' + Math.random().toString(36).slice(2, 9);
  const catId = 'c_' + Math.random().toString(36).slice(2, 9);

  // Create Organization object
  const org = {
    id: orgId,
    name: (name || 'Org').trim() || 'Org',
    color,
    order
  };

  // Create default Collection object
  const defaultCategory = createDefaultCollection ? {
    id: catId,
    name: 'General',
    color: color || '#64748b',
    order: 0,
    organizationId: orgId
  } : null;

  // Atomic transaction: write both or rollback
  await tx(['organizations' as any, 'categories'], 'readwrite', async (t) => {
    const orgStore = t.objectStore('organizations' as any);
    const catStore = t.objectStore('categories');

    // Write Organization
    orgStore.put(org);

    // Write default Collection if enabled
    if (defaultCategory) {
      catStore.put(defaultCategory);
    }
  });

  return {
    organization: org,
    defaultCollection: defaultCategory
  };
}
```

**Advantages:**
- ✅ Atomic: Both operations succeed or both fail
- ✅ Consistent: Transaction ensures data integrity
- ✅ Flexible: Can disable for import scenarios
- ✅ Backward compatible: Returns Organization object (can extract from result)

**Trade-offs:**
- Return type changes from `Organization` to `{ organization, defaultCollection }`
- Callers may need updates (but backward compatible if they only use `result.organization`)

---

### Solution 2: Sequential Creation (Alternative)

```typescript
createOrganization: async (name: string, color?: string, createDefaultCollection = true) => {
  // Create Organization
  const org = await originalCreateOrganization(name, color);

  // Create default Collection
  if (createDefaultCollection) {
    await addCategory('General', color || '#64748b', org.id);
  }

  return org;
}
```

**Advantages:**
- ✅ Simpler code
- ✅ Reuses existing `addCategory` function

**Trade-offs:**
- ❌ Not atomic: Organization might exist without Collection if second operation fails
- ❌ Requires two separate transactions
- ❌ Inconsistent state possible

---

## Decision: Use Solution 1 (Atomic Transaction)

**Rationale:**
1. **Data Integrity**: Atomic transactions prevent inconsistent state
2. **Performance**: Single transaction is faster than two sequential transactions
3. **Consistency**: Aligns with existing migration patterns (see `migrateOrganizationsOnce`)

## Implementation Details

### Transaction Scope
Use multi-store transaction to write to both `organizations` and `categories` stores:

```typescript
await tx(['organizations' as any, 'categories'], 'readwrite', async (t) => {
  // ...
});
```

### Default Collection Name
- **English**: "General" (simple, universally understood)
- **Alternative**: "My Collection" (more personal)
- **Future Enhancement**: Allow user to configure default name in settings

**Decision**: Use "General" for consistency with migration behavior.

### Handling Import Operations

When importing data, we don't want auto-creation:

```typescript
// In importData function
if (!orgs.length) {
  // Ensure default organization exists
  await tx('organizations' as any, 'readwrite', async (t) => {
    const s = t.objectStore('organizations' as any);
    const def = { id: 'o_default', name: 'Personal', color: '#64748b', order: 0 };
    s.put(def);
  });
}
```

**Update**: Pass `createDefaultCollection: false` if we refactor this to use `createOrganization`:

```typescript
if (!orgs.length) {
  await createOrganization('Personal', '#64748b', { createDefaultCollection: false });
  // Import logic will create Collections from imported data
}
```

### Return Type Consideration

**Option A**: Keep backward compatible
```typescript
// Return organization directly, but also create collection
return org as any;
```

**Option B**: Return both (more explicit)
```typescript
return {
  organization: org,
  defaultCollection: defaultCategory
} as any;
```

**Decision**: Use Option B - more explicit and allows callers to access both objects if needed. Existing code can be updated to use `result.organization` or destructure `{ organization }`.

## Testing Strategy

### Unit Tests
```typescript
describe('createOrganization with default Collection', () => {
  it('should auto-create default Collection by default', async () => {
    const result = await storage.createOrganization('Test Org', '#ff0000');

    expect(result.organization.name).toBe('Test Org');
    expect(result.defaultCollection).toBeDefined();
    expect(result.defaultCollection.name).toBe('General');
    expect(result.defaultCollection.organizationId).toBe(result.organization.id);
    expect(result.defaultCollection.order).toBe(0);
  });

  it('should skip default Collection when flag is false', async () => {
    const result = await storage.createOrganization('Test Org', '#ff0000', {
      createDefaultCollection: false
    });

    expect(result.organization.name).toBe('Test Org');
    expect(result.defaultCollection).toBeNull();
  });
});
```

### Integration Tests
- Create Organization via UI and verify sidebar shows "General" Collection
- Import Toby JSON and verify no duplicate "General" Collections
- Delete Organization and verify default Collection is also cleaned up

## Backward Compatibility

### Existing Callers
Current code that calls `createOrganization` expects an `Organization` object:

```typescript
const org = await storage.createOrganization('My Org');
// org is an Organization
```

After change:
```typescript
const result = await storage.createOrganization('My Org');
// result.organization is the Organization
// result.defaultCollection is the default Collection (or null)
```

**Migration Path:**
1. Update all callers to use `result.organization` instead of `result`
2. Or keep backward compatibility by returning just `org` and ignoring `defaultCollection`

**Recommendation**: Update callers for clarity, but maintain backward compatibility in return type.

## Performance Impact

**Benchmark Estimates:**
- Additional IndexedDB write: ~5-10ms
- Single transaction vs. two sequential: Saves ~10-15ms
- **Net impact**: Negligible (<10ms overhead per Organization creation)

Organization creation is a rare operation (typically <10 times per user session), so performance impact is minimal.

## Error Handling

```typescript
try {
  await tx(['organizations' as any, 'categories'], 'readwrite', async (t) => {
    // ...
  });
} catch (error) {
  console.error('Failed to create organization with default collection:', error);
  throw error; // Propagate to caller
}
```

**Rollback**: IndexedDB automatically rolls back the transaction if any operation fails, ensuring no partial writes.

## Future Enhancements

1. **Configurable Default Name**: Allow users to set default Collection name in settings
2. **Multiple Defaults**: Create multiple default Collections (e.g., "Work", "Personal")
3. **Default Subcategory**: Also create a default Subcategory (requires careful design)

These are out of scope for this change but can be considered in future iterations.
