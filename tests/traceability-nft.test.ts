import { describe, it, expect, beforeEach } from "vitest";

interface AuditEntry {
  timestamp: number;
  actor: string;
  action: string;
  details: string;
}

interface MockContract {
  admin: string;
  verifier: string;
  paused: boolean;
  tokenCounter: bigint;
  tokenOwners: Map<bigint, string>;
  tokenMetadata: Map<bigint, string>;
  tokenAuditLogs: Map<bigint, AuditEntry[]>;
  metadataFrozen: Map<bigint, boolean>;
  MAX_AUDIT_ENTRIES_PER_TOKEN: number;

  isAdmin(caller: string): boolean;
  isVerifier(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  transferAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setVerifier(caller: string, newVerifier: string): { value: boolean } | { error: number };
  mint(caller: string, recipient: string, initialMetadata: string): { value: bigint } | { error: number };
  transfer(caller: string, tokenId: bigint, recipient: string): { value: boolean } | { error: number };
  updateMetadata(caller: string, tokenId: bigint, newMetadata: string): { value: boolean } | { error: number };
  freezeMetadata(caller: string, tokenId: bigint): { value: boolean } | { error: number };
  burn(caller: string, tokenId: bigint): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  verifier: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  tokenCounter: 0n,
  tokenOwners: new Map<bigint, string>(),
  tokenMetadata: new Map<bigint, string>(),
  tokenAuditLogs: new Map<bigint, AuditEntry[]>(),
  metadataFrozen: new Map<bigint, boolean>(),
  MAX_AUDIT_ENTRIES_PER_TOKEN: 50,

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  isVerifier(caller: string) {
    return caller === this.verifier;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  transferAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 104 };
    this.admin = newAdmin;
    return { value: true };
  },

  setVerifier(caller: string, newVerifier: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newVerifier === "SP000000000000000000002Q6VF78") return { error: 104 };
    this.verifier = newVerifier;
    return { value: true };
  },

  mint(caller: string, recipient: string, initialMetadata: string) {
    if (!this.isAdmin(caller) && !this.isVerifier(caller)) return { error: 100 };
    if (this.paused) return { error: 103 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 104 };
    if (initialMetadata.length === 0) return { error: 106 };
    const newTokenId = this.tokenCounter + 1n;
    this.tokenOwners.set(newTokenId, recipient);
    this.tokenMetadata.set(newTokenId, initialMetadata);
    this.metadataFrozen.set(newTokenId, false);
    const auditLog = this.tokenAuditLogs.get(newTokenId) || [];
    auditLog.push({ timestamp: 100, actor: caller, action: "mint", details: initialMetadata });
    this.tokenAuditLogs.set(newTokenId, auditLog);
    this.tokenCounter = newTokenId;
    return { value: newTokenId };
  },

  transfer(caller: string, tokenId: bigint, recipient: string) {
    if (this.paused) return { error: 103 };
    if (!this.tokenOwners.has(tokenId)) return { error: 102 };
    if (this.tokenOwners.get(tokenId) !== caller) return { error: 101 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 104 };
    this.tokenOwners.set(tokenId, recipient);
    const auditLog = this.tokenAuditLogs.get(tokenId) || [];
    auditLog.push({ timestamp: 100, actor: caller, action: "transfer", details: `from: ${caller} to: ${recipient}` });
    if (auditLog.length > this.MAX_AUDIT_ENTRIES_PER_TOKEN) return { error: 107 };
    this.tokenAuditLogs.set(tokenId, auditLog);
    return { value: true };
  },

  updateMetadata(caller: string, tokenId: bigint, newMetadata: string) {
    if (!this.isVerifier(caller)) return { error: 108 };
    if (this.paused) return { error: 103 };
    if (!this.tokenOwners.has(tokenId)) return { error: 102 };
    if (this.metadataFrozen.get(tokenId) === true) return { error: 105 };
    if (newMetadata.length === 0) return { error: 106 };
    const oldMetadata = this.tokenMetadata.get(tokenId)!;
    this.tokenMetadata.set(tokenId, newMetadata);
    const auditLog = this.tokenAuditLogs.get(tokenId) || [];
    auditLog.push({ timestamp: 100, actor: caller, action: "metadata-update", details: `old: ${oldMetadata} new: ${newMetadata}` });
    if (auditLog.length > this.MAX_AUDIT_ENTRIES_PER_TOKEN) return { error: 107 };
    this.tokenAuditLogs.set(tokenId, auditLog);
    return { value: true };
  },

  freezeMetadata(caller: string, tokenId: bigint) {
    if (this.paused) return { error: 103 };
    if (!this.tokenOwners.has(tokenId)) return { error: 102 };
    const owner = this.tokenOwners.get(tokenId);
    if (owner !== caller && !this.isVerifier(caller)) return { error: 100 };
    if (this.metadataFrozen.get(tokenId) === true) return { error: 105 };
    this.metadataFrozen.set(tokenId, true);
    const auditLog = this.tokenAuditLogs.get(tokenId) || [];
    auditLog.push({ timestamp: 100, actor: caller, action: "freeze-metadata", details: "Metadata frozen permanently" });
    if (auditLog.length > this.MAX_AUDIT_ENTRIES_PER_TOKEN) return { error: 107 };
    this.tokenAuditLogs.set(tokenId, auditLog);
    return { value: true };
  },

  burn(caller: string, tokenId: bigint) {
    if (this.paused) return { error: 103 };
    if (!this.tokenOwners.has(tokenId)) return { error: 102 };
    if (this.tokenOwners.get(tokenId) !== caller) return { error: 101 };
    this.tokenOwners.delete(tokenId);
    this.tokenMetadata.delete(tokenId);
    this.tokenAuditLogs.delete(tokenId);
    this.metadataFrozen.delete(tokenId);
    // Note: Audit entry for burn is added before deletion, but in mock, we simulate
    return { value: true };
  },
};

describe("SeaChainTrace Traceability NFT Contract", () => {
  let admin: string;
  let user1: string;
  let user2: string;
  let verifier: string;

  beforeEach(() => {
    admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    verifier = admin; // Initially same
    user1 = "ST2CY5V39NHDP5P0RZTY4KS3VW6C39AGDMRMGAZP0";
    user2 = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    mockContract.admin = admin;
    mockContract.verifier = verifier;
    mockContract.paused = false;
    mockContract.tokenCounter = 0n;
    mockContract.tokenOwners = new Map();
    mockContract.tokenMetadata = new Map();
    mockContract.tokenAuditLogs = new Map();
    mockContract.metadataFrozen = new Map();
  });

  it("should allow admin to mint NFT", () => {
    const metadata = '{"origin": "Ocean", "catchDate": "2023-01-01"}';
    const result = mockContract.mint(admin, user1, metadata);
    expect(result).toEqual({ value: 1n });
    expect(mockContract.tokenOwners.get(1n)).toBe(user1);
    expect(mockContract.tokenMetadata.get(1n)).toBe(metadata);
    expect(mockContract.tokenAuditLogs.get(1n)![0].action).toBe("mint");
  });

  it("should prevent non-authorized from minting", () => {
    const result = mockContract.mint(user1, user2, "test");
    expect(result).toEqual({ error: 100 });
  });

  it("should transfer NFT from owner", () => {
    mockContract.mint(admin, user1, "test");
    const result = mockContract.transfer(user1, 1n, user2);
    expect(result).toEqual({ value: true });
    expect(mockContract.tokenOwners.get(1n)).toBe(user2);
    expect(mockContract.tokenAuditLogs.get(1n)!.length).toBe(2);
    expect(mockContract.tokenAuditLogs.get(1n)![1].action).toBe("transfer");
  });

  it("should prevent transfer from non-owner", () => {
    mockContract.mint(admin, user1, "test");
    const result = mockContract.transfer(user2, 1n, user1);
    expect(result).toEqual({ error: 101 });
  });

  it("should allow verifier to update metadata", () => {
    mockContract.mint(admin, user1, "old");
    const result = mockContract.updateMetadata(verifier, 1n, "new");
    expect(result).toEqual({ value: true });
    expect(mockContract.tokenMetadata.get(1n)).toBe("new");
    expect(mockContract.tokenAuditLogs.get(1n)![1].action).toBe("metadata-update");
  });

  it("should prevent update if frozen", () => {
    mockContract.mint(admin, user1, "test");
    mockContract.freezeMetadata(user1, 1n);
    const result = mockContract.updateMetadata(verifier, 1n, "new");
    expect(result).toEqual({ error: 105 });
  });

  it("should allow owner to freeze metadata", () => {
    mockContract.mint(admin, user1, "test");
    const result = mockContract.freezeMetadata(user1, 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.metadataFrozen.get(1n)).toBe(true);
    expect(mockContract.tokenAuditLogs.get(1n)![1].action).toBe("freeze-metadata");
  });

  it("should allow owner to burn NFT", () => {
    mockContract.mint(admin, user1, "test");
    const result = mockContract.burn(user1, 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.tokenOwners.has(1n)).toBe(false);
  });

  it("should prevent burn from non-owner", () => {
    mockContract.mint(admin, user1, "test");
    const result = mockContract.burn(user2, 1n);
    expect(result).toEqual({ error: 101 });
  });

  it("should not allow actions when paused", () => {
    mockContract.mint(admin, user1, "test");
    mockContract.setPaused(admin, true);
    const transferResult = mockContract.transfer(user1, 1n, user2);
    expect(transferResult).toEqual({ error: 103 });
    const updateResult = mockContract.updateMetadata(verifier, 1n, "new");
    expect(updateResult).toEqual({ error: 103 });
  });

  it("should enforce audit log limit", () => {
    mockContract.mint(admin, user1, "test");
    for (let i = 0; i < 50; i++) {
      mockContract.updateMetadata(verifier, 1n, `update${i}`);
    }
    const overflowResult = mockContract.updateMetadata(verifier, 1n, "overflow");
    expect(overflowResult).toEqual({ error: 107 });
  });
});