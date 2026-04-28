/**
 * prisma/seed.ts
 *
 * Seeds the database with representative test data for local development.
 *
 * Run:  pnpm prisma db seed
 *
 * Accounts created:
 * ┌─────────────────────────┬──────────────┬────────────┬──────────────────────────────────────┐
 * │ Email                   │ Status       │ Tier       │ Notes                                │
 * ├─────────────────────────┼──────────────┼────────────┼──────────────────────────────────────┤
 * │ alice@eclat.test        │ VERIFIED     │ SELECT     │ Has 2 queue entries today            │
 * │ bob@eclat.test          │ VERIFIED     │ RESERVE    │ Matched with Alice                   │
 * │ carol@eclat.test        │ VERIFIED     │ NOIR       │ In Alice's queue (unseen)            │
 * │ pending@eclat.test      │ PENDING      │ —          │ Redirected to /dashboard?verification│
 * │ inreview@eclat.test     │ IN_REVIEW    │ —          │ In review banner                     │
 * │ rejected@eclat.test     │ REJECTED     │ —          │ Rejected banner                      │
 * └─────────────────────────┴──────────────┴────────────┴──────────────────────────────────────┘
 *
 * All accounts use password: Test1234!
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

const PASSWORD     = "Test1234!"
const HASH_ROUNDS  = 12

// ── helpers ───────────────────────────────────────────────────────────────────

async function hash(pw: string) {
  return bcrypt.hash(pw, HASH_ROUNDS)
}

function dob(year: number) {
  return new Date(`${year}-06-15T00:00:00.000Z`)
}

function today() {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding eclat test database…\n")

  const pw = await hash(PASSWORD)

  // ── 1. Users ──────────────────────────────────────────────────────────────

  const alice = await db.user.upsert({
    where:  { email: "alice@eclat.test" },
    update: {},
    create: {
      email:              "alice@eclat.test",
      name:               "Alice Sharma",
      dateOfBirth:        dob(1993),
      passwordHash:       pw,
      role:               "MEMBER",
      verificationStatus: "VERIFIED",
      membershipTier:     "SELECT",
    },
  })

  const bob = await db.user.upsert({
    where:  { email: "bob@eclat.test" },
    update: {},
    create: {
      email:              "bob@eclat.test",
      name:               "Bob Mehta",
      dateOfBirth:        dob(1990),
      passwordHash:       pw,
      role:               "MEMBER",
      verificationStatus: "VERIFIED",
      membershipTier:     "RESERVE",
    },
  })

  const carol = await db.user.upsert({
    where:  { email: "carol@eclat.test" },
    update: {},
    create: {
      email:              "carol@eclat.test",
      name:               "Carol Nair",
      dateOfBirth:        dob(1995),
      passwordHash:       pw,
      role:               "MEMBER",
      verificationStatus: "VERIFIED",
      membershipTier:     "NOIR",
    },
  })

  await db.user.upsert({
    where:  { email: "pending@eclat.test" },
    update: {},
    create: {
      email:              "pending@eclat.test",
      name:               "Priya Pending",
      dateOfBirth:        dob(1997),
      passwordHash:       pw,
      role:               "MEMBER",
      verificationStatus: "PENDING",
    },
  })

  await db.user.upsert({
    where:  { email: "inreview@eclat.test" },
    update: {},
    create: {
      email:              "inreview@eclat.test",
      name:               "Ravi Review",
      dateOfBirth:        dob(1991),
      passwordHash:       pw,
      role:               "MEMBER",
      verificationStatus: "IN_REVIEW",
    },
  })

  await db.user.upsert({
    where:  { email: "rejected@eclat.test" },
    update: {},
    create: {
      email:              "rejected@eclat.test",
      name:               "Rahul Rejected",
      dateOfBirth:        dob(1988),
      passwordHash:       pw,
      role:               "MEMBER",
      verificationStatus: "REJECTED",
    },
  })

  console.log("✓  Users created")

  // ── 2. Profiles ───────────────────────────────────────────────────────────

  await db.profile.upsert({
    where:  { userId: alice.id },
    update: {},
    create: {
      userId:     alice.id,
      bio:        "Product manager at a Series B startup. Obsessed with good coffee, terrible puns, and early morning runs along Marine Drive.",
      profession: "Product Manager",
      employer:   "Fintech Startup",
      location:   "Mumbai",
      gender:     "FEMALE",
      interests:  ["coffee", "running", "product strategy", "travel", "jazz"],
      isVisible:  true,
    },
  })

  await db.profile.upsert({
    where:  { userId: bob.id },
    update: {},
    create: {
      userId:     bob.id,
      bio:        "Software engineer with 8 years in distributed systems. I read too many books and cook passable Italian food.",
      profession: "Software Engineer",
      employer:   "Google",
      location:   "Bengaluru",
      gender:     "MALE",
      interests:  ["distributed systems", "cooking", "books", "cycling", "photography"],
      isVisible:  true,
    },
  })

  await db.profile.upsert({
    where:  { userId: carol.id },
    update: {},
    create: {
      userId:     carol.id,
      bio:        "Investment banker turned angel investor. I care deeply about climate tech and the Oxford comma.",
      profession: "Angel Investor",
      employer:   "Independent",
      location:   "Delhi",
      gender:     "FEMALE",
      interests:  ["climate tech", "investing", "writing", "hiking", "wine"],
      isVisible:  true,
    },
  })

  console.log("✓  Profiles created")

  // ── 3. Subscriptions ──────────────────────────────────────────────────────

  const periodStart = new Date()
  const periodEnd   = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  await db.subscription.upsert({
    where:  { userId: alice.id },
    update: {},
    create: {
      userId:            alice.id,
      tier:              "SELECT",
      status:            "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd:   periodEnd,
    },
  })

  await db.subscription.upsert({
    where:  { userId: bob.id },
    update: {},
    create: {
      userId:            bob.id,
      tier:              "RESERVE",
      status:            "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd:   periodEnd,
    },
  })

  await db.subscription.upsert({
    where:  { userId: carol.id },
    update: {},
    create: {
      userId:            carol.id,
      tier:              "NOIR",
      status:            "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd:   periodEnd,
    },
  })

  console.log("✓  Subscriptions created")

  // ── 4. Alice ↔ Bob: mutual match + conversation ───────────────────────────
  //
  // Bob was in Alice's queue yesterday; both expressed INTERESTED → matched.
  // The match and conversation already exist; test /matches and /messages.

  const yesterday = new Date(today())
  yesterday.setDate(yesterday.getDate() - 1)

  // Deterministic ordering for the unique constraint
  const [u1Id, u2Id] = alice.id < bob.id
    ? [alice.id, bob.id]
    : [bob.id, alice.id]

  // Queue entries (yesterday, both INTERESTED)
  await db.dailyQueue.upsert({
    where:  { userId_candidateId_date: { userId: alice.id, candidateId: bob.id, date: yesterday } },
    update: {},
    create: { userId: alice.id, candidateId: bob.id, date: yesterday, action: "INTERESTED", actedAt: yesterday },
  })
  await db.dailyQueue.upsert({
    where:  { userId_candidateId_date: { userId: bob.id, candidateId: alice.id, date: yesterday } },
    update: {},
    create: { userId: bob.id, candidateId: alice.id, date: yesterday, action: "INTERESTED", actedAt: yesterday },
  })

  // Match + conversation
  const existingMatch = await db.match.findUnique({
    where: { user1Id_user2Id: { user1Id: u1Id, user2Id: u2Id } },
  })

  if (!existingMatch) {
    await db.match.create({
      data: {
        user1Id:   u1Id,
        user2Id:   u2Id,
        status:    "ACTIVE",
        matchedAt: yesterday,
        conversation: { create: {} },
      },
    })
    console.log("✓  Alice ↔ Bob match created")
  } else {
    console.log("✓  Alice ↔ Bob match already exists")
  }

  // ── 5. Today's queue for Alice ────────────────────────────────────────────
  //
  // Carol is in Alice's queue today as UNSEEN — tests /browse with a card.

  await db.dailyQueue.upsert({
    where:  { userId_candidateId_date: { userId: alice.id, candidateId: carol.id, date: today() } },
    update: {},
    create: { userId: alice.id, candidateId: carol.id, date: today(), action: "UNSEEN" },
  })

  console.log("✓  Today's queue entry (Alice → Carol) created")

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`
✅  Seed complete. All accounts use password: ${PASSWORD}

  alice@eclat.test     → VERIFIED / SELECT  — has queue (Carol) + match (Bob)
  bob@eclat.test       → VERIFIED / RESERVE — matched with Alice
  carol@eclat.test     → VERIFIED / NOIR    — in Alice's queue today
  pending@eclat.test   → PENDING            — sees verification banner
  inreview@eclat.test  → IN_REVIEW          — sees "being reviewed" banner
  rejected@eclat.test  → REJECTED           — sees rejection banner
`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
