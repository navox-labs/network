import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/license/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/license/validate", () => {
  it("returns valid for correct key format", async () => {
    const res = await POST(makeRequest({ key: "NAVOX-AB12-CD34-EF56" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.status).toBe("active");
  });

  it("accepts lowercase key (normalizes to uppercase)", async () => {
    const res = await POST(makeRequest({ key: "navox-ab12-cd34-ef56" }));
    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  it("returns invalid for wrong format", async () => {
    const res = await POST(makeRequest({ key: "INVALID-KEY" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.status).toBe("expired");
  });

  it("returns 400 for missing key", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it("returns 400 for non-string key", async () => {
    const res = await POST(makeRequest({ key: 12345 }));
    expect(res.status).toBe(400);
  });

  it("returns invalid for empty string key", async () => {
    const res = await POST(makeRequest({ key: "" }));
    expect(res.status).toBe(400);
  });

  it("returns invalid for key with special characters", async () => {
    const res = await POST(makeRequest({ key: "NAVOX-AB!@-CD34-EF56" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it("returns invalid for key with too few segments", async () => {
    const res = await POST(makeRequest({ key: "NAVOX-AB12-CD34" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it("returns invalid for key with wrong prefix", async () => {
    const res = await POST(makeRequest({ key: "ACME-AB12-CD34-EF56" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it("handles malformed JSON gracefully", async () => {
    const req = new NextRequest("http://localhost:3000/api/license/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
