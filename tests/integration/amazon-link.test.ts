import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { linkOrCreateAmazonCustomer } from "@/lib/auth/amazonLink";
import { resetDb } from "./helpers";

describe("linkOrCreateAmazonCustomer", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates a new customer when neither email nor amazonUserId matches", async () => {
    const result = await linkOrCreateAmazonCustomer({
      amazonUserId: "amzn1.account.NEW",
      email: "newbie@example.com",
      name: "Newbie",
    });
    expect(result.email).toBe("newbie@example.com");
    expect(result.name).toBe("Newbie");

    const persisted = await prisma.customer.findUnique({ where: { id: result.id } });
    expect(persisted?.amazonUserId).toBe("amzn1.account.NEW");
    expect(persisted?.passwordHash.length).toBeGreaterThan(40); // valid bcrypt placeholder
  });

  it("auto-links to an existing email/password customer with null amazonUserId", async () => {
    const existing = await prisma.customer.create({
      data: {
        email: "alice@example.com",
        name: "Alice",
        passwordHash: "$2a$12$abcdefghijklmnopqrstuv.notarealhashbutlongenough.x",
      },
    });

    const linked = await linkOrCreateAmazonCustomer({
      amazonUserId: "amzn1.account.ALICE",
      email: "alice@example.com",
      name: "Different Display Name",
    });

    expect(linked.id).toBe(existing.id);

    const after = await prisma.customer.findUnique({ where: { id: existing.id } });
    expect(after?.amazonUserId).toBe("amzn1.account.ALICE");
    // Name and passwordHash on the existing record are not overwritten.
    expect(after?.name).toBe("Alice");
    expect(after?.passwordHash).toBe(existing.passwordHash);
  });

  it("returns the existing customer when amazonUserId already matches (no writes)", async () => {
    const created = await linkOrCreateAmazonCustomer({
      amazonUserId: "amzn1.account.BOB",
      email: "bob@example.com",
      name: "Bob",
    });

    // Snapshot then call again with the same user_id but a different display
    // name — should be a no-op write-wise.
    const second = await linkOrCreateAmazonCustomer({
      amazonUserId: "amzn1.account.BOB",
      email: "bob+changed@example.com",
      name: "Bobby",
    });
    expect(second.id).toBe(created.id);

    const after = await prisma.customer.findUnique({ where: { id: created.id } });
    expect(after?.email).toBe("bob@example.com");
    expect(after?.name).toBe("Bob");
  });

  it("normalizes the email (trim + lowercase)", async () => {
    const result = await linkOrCreateAmazonCustomer({
      amazonUserId: "amzn1.account.CAROL",
      email: "  CAROL@Example.COM  ",
      name: "Carol",
    });
    expect(result.email).toBe("carol@example.com");
  });

  it("rejects when the email belongs to a different customer already linked to another Amazon account", async () => {
    // Customer 1 already linked to Amazon DAVE.
    await linkOrCreateAmazonCustomer({
      amazonUserId: "amzn1.account.DAVE",
      email: "dave@example.com",
      name: "Dave",
    });

    // A second Amazon login arrives whose email is dave@example.com but whose
    // user_id is DAVE2 — must NOT auto-link to the existing record.
    await expect(
      linkOrCreateAmazonCustomer({
        amazonUserId: "amzn1.account.DAVE2",
        email: "dave@example.com",
        name: "Dave Two",
      }),
    ).rejects.toMatchObject({ code: "AMAZON_ACCOUNT_ALREADY_LINKED" });
  });
});
