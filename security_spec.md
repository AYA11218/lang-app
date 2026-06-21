# Firestore Security Specifications & Threat Vector Analysis

This document describes the Zero-Trust posture of our serverless Firebase engine, outlining constraints, data invariants, and the "Dirty Dozen" payloads designed to compromise integrity, bypass relational controls, or pollute user state.

## 1. Data Invariants
1. **User Ownership Boundaries**: No user (UID) can read, update, list, delete, or create records belonging to another user. Everything is nested under path `/users/{userId}` where `{userId}` is strictly checked against `request.auth.uid`.
2. **Type and Size Safeguards**: No metadata string should exceed strict byte sizes. IDs must match standard ID formats `^[a-zA-Z0-9_\-]+$`.
3. **Pillars of Integrity**: Timestamps like `createdAt` and `updatedAt` are binded strictly to `request.time` server clocks.
4. **No Self-Assigned Roles**: No user can elevate authorization. Access to subcollections (`cards`, `chats`) instantly terminates if membership is revoked or unauthorized.

---

## 2. The "Dirty Dozen" Payloads (Aura Attack Deck)

### Threat Vector A: Identity Theft & Forgery
#### Payload 1: Out-of-bounds cross-write on user stats
A malicious client with user login `UserA` attempts to completely rewrite the user statistics of victim `UserB`.
```json
{
  "path": "/users/victim_uid_abc",
  "data": {
    "xp": 999999,
    "streak": 500
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - The `{userId}` path parameter MUST match `request.auth.uid`.

#### Payload 2: Hostile ownership takeover for card creation
Attacker Authenticated `UserA` attempts to inject a vocab flashcard into victim `UserB`'s deck.
```json
{
  "path": "/users/victim_uid_abc/cards/hackycard_123",
  "data": {
    "id": "hackycard_123",
    "front": "Hacked",
    "back": "Pirated",
    "languageCode": "es",
    "interval": 1,
    "repetitions": 1,
    "easeFactor": 2.5,
    "nextDueDate": "2026-06-21T18:22:15.000Z",
    "createdAt": "2026-06-21T18:22:15.000Z"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Subcollections are guarded by parent namespace owner locks.

#### Payload 3: Unauthenticated write
An unauthenticated or anonymous guest tries to write user progress details.
```json
{
  "path": "/users/guest_user",
  "data": {
    "xp": 100,
    "streak": 2
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Requires `request.auth != null`.

---

### Threat Vector B: Schema and Type Poisoning (Resource Abuse)
#### Payload 4: Overinflated XP update
Attacker attempts to set an impossibly large XP count or non-integer type to crash stats metrics.
```json
{
  "path": "/users/attacker_uid",
  "data": {
    "xp": "nine-million-points-please"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - XP must be an integer and conform to typed schema rules.

#### Payload 5: ID Poisoning Attack
The client attempts to create a card with an malicious string containing shell variables or oversized length as a document ID.
```json
{
  "path": "/users/attacker_uid/cards/../../../etc/passwd_leak_very_long_junk_string_over_256_chars",
  "data": { ... }
}
```
*Expected Result:* `PERMISSION_DENIED` - Path parameter validation `isValidId()` rejects malformed or oversized IDs.

#### Payload 6: Garbage elements injection
Attacker executes write on `/users/{uid}/cards/{cardId}` missing critical parameters (e.g., empty translation or no front word).
```json
{
  "path": "/users/attacker_uid/cards/card_123",
  "data": {
    "id": "card_123",
    "languageCode": "es",
    "front": "Hola"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Missing `back` or standard attributes. Exact schema key set checks enforce complete parameter lists.

---

### Threat Vector C: State & Field Corruption
#### Payload 7: Client-spoofed Temporal Stamps
Client sends custom `createdAt` value backdated into 1999 to corrupt statistics.
```json
{
  "path": "/users/attacker_uid/cards/card_123",
  "data": {
    "id": "card_123",
    "front": "Bonjour",
    "back": "Hello",
    "languageCode": "fr",
    "interval": 0,
    "repetitions": 0,
    "easeFactor": 2.5,
    "nextDueDate": "2026-06-21T18:22:15.000Z",
    "createdAt": "1999-01-01T00:00:00.000Z"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - `incoming().createdAt == request.time` verifies server clock binding.

#### Payload 8: Alteration of Immortal Parameters
Client attempts to update a flashcard state and changes the immutable `createdAt` stamp.
```json
{
  "action": "edit",
  "path": "/users/attacker_uid/cards/card_123",
  "data": {
    "createdAt": "2027-01-01T00:00:00.000Z"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Modifying immutable fields fails structural gates on updates.

#### Payload 9: Shadow Field Injection
User tries to inject unauthorized fields (e.g., `"hackedBy": "MaliciousAgent"`) into their profile stats.
```json
{
  "path": "/users/attacker_uid",
  "data": {
    "targetLanguageCode": "es",
    "level": "beginner",
    "xp": 50,
    "streak": 1,
    "hackedBy": "MaliciousAgent"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Exact key limits block un-whitelisted properties.

---

### Threat Vector D: Relational & Query Violations
#### Payload 10: Unauthorized Global Query scraping
User attempts to scrape the entire database of all users list to harvest emails or private learner data.
```json
{
  "query": "select * from /users"
}
```
*Expected Result:* `PERMISSION_DENIED` - Queries must explicitly check `resource.data` to prevent wildcard leakage.

#### Payload 11: Invalid Target Language Code
User sets a level outside of the authorized enum criteria.
```json
{
  "path": "/users/attacker_uid",
  "data": {
    "targetLanguageCode": "es",
    "level": "ultimate-grandmaster-level-hacked",
    "xp": 100,
    "streak": 5
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Value is checked against the level enum values `['beginner', 'intermediate', 'advanced']`.

#### Payload 12: Timestamp Update Spoofing
User updates a item but sets `updatedAt` to some custom future time instead of `request.time`.
```json
{
  "path": "/users/attacker_uid/cards/card_123",
  "data": {
    "front": "Bonjour",
    "back": "Hello",
    "languageCode": "fr",
    "interval": 1,
    "repetitions": 1,
    "easeFactor": 2.5,
    "nextDueDate": "2026-06-21T18:22:15.000Z",
    "createdAt": "2026-06-21T11:21:26.000Z",
    "updatedAt": "2100-01-01T00:00:00.000Z"
  }
}
```
*Expected Result:* `PERMISSION_DENIED` - Temporal timestamp check constraints.

---

## 3. The Test Spec Runner (`firestore.rules.test.ts`)
The tests confirm that all malicious scenarios are explicitly locked down by our security policy rules.
