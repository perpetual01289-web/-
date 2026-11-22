# Security Specification — Fleet Maintenance Management System

## 1. Data Invariants
1. **Tenant / Owner Isolation & Admin Access**: Every `Vehicle`, `VehicleMedia`, and `MaintenanceForm` belongs to an `ownerId` matching `request.auth.uid` (unless operated by the verified company admin `perpetual01289@gmail.com`).
2. **Referential Integrity**: A `MaintenanceForm` or `VehicleMedia` record cannot be created without an existing parent `Vehicle` document whose owner matches the caller (or admin).
3. **Immutable Identity & Timestamps**: `id`, `ownerId`, `vehicleId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` are strictly validated against `request.time`.
4. **Archived Form Locking**: Once a `MaintenanceForm` transitions to `formStatus == 'مكتمل'`, standard users cannot mutate it; only a verified admin can unlock or amend it.
5. **Strict Volumetric & Schema Bounds**: Every string field enforces exact `size()` bounds, `items` array is capped at `<= 150` items, and shadow/ghost fields are rejected via `keys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Create a `Vehicle` with `request.auth == null`.
2. **Unverified Email Spoof**: Create a `Vehicle` with `email == 'perpetual01289@gmail.com'` and `email_verified == false`.
3. **Owner Spoofing**: Create a `Vehicle` with `ownerId: 'victim_uid'` when signed in as `'attacker_uid'`.
4. **Self-Assigned Admin Role**: Create a `UserProfile` with `role: 'admin'` for a non-admin email.
5. **Role Escalation Update**: Update own `UserProfile` attempting to change `role` from `'supervisor'` to `'admin'`.
6. **Shadow Ghost Field**: Create or update a `Vehicle` injecting an undeclared field `isVerified: true`.
7. **1MB ID Poisoning**: Create a `Vehicle` with document ID length > 128 or invalid characters (`../../etc`).
8. **Orphaned Maintenance Form**: Create a `MaintenanceForm` referencing a non-existent `vehicleId`.
9. **Cross-Tenant List Scraping**: List `maintenanceForms` without `ownerId == request.auth.uid` filter as a non-admin.
10. **Client Timestamp Forgery**: Create a `Vehicle` passing a backdated string/timestamp instead of `request.time`.
11. **Mutating Completed Maintenance Archive**: Non-admin attempting to edit `items` on a `MaintenanceForm` where `formStatus == 'مكتمل'`.
12. **Unbounded Array / Payload Exhaustion**: Update `MaintenanceForm` with `items.size() > 150` or `notes.size() > 8000`.
