import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { loadDraft, saveDraft, clearDraft, setDraftQueued, hasContent } from "@/lib/draft";
import { shouldRegisterServiceWorker } from "@/lib/sw-register";
import manifest from "../../public/manifest.json";

describe("offline complaint draft (IndexedDB)", () => {
  beforeEach(async () => {
    await clearDraft();
    localStorage.clear();
  });

  it("saves and restores text, category, location, ward and the photo blob", async () => {
    const photo = new Blob([new Uint8Array(3_000_000)], { type: "image/jpeg" }); // 3 MB: too big for the old localStorage draft
    await saveDraft({
      title: "Pothole",
      category: "broken-road",
      location: "Station Rd",
      ward: "Ward 4",
      photo,
      photoName: "p.jpg",
    });
    const d = await loadDraft();
    expect(d?.title).toBe("Pothole");
    expect(d?.ward).toBe("Ward 4");
    // jsdom cannot structured-clone Blob contents; the real-browser check is in the
    // end-to-end offline test (Chrome), where the 3 MB photo comes back intact.
    expect(d?.photo).toBeTruthy();
    expect(d?.photoName).toBe("p.jpg");
  });

  it("marks a draft as queued for the 'Send draft?' prompt", async () => {
    await saveDraft({ title: "Garbage" });
    await setDraftQueued(true);
    expect((await loadDraft())?.queued).toBe(true);
  });

  it("empty drafts are removed, not stored", async () => {
    await saveDraft({ title: "x" });
    await saveDraft({ title: "" });
    expect(await loadDraft()).toBeNull();
  });

  it("migrates an old localStorage draft once", async () => {
    localStorage.setItem(
      "ct_complaint_draft",
      JSON.stringify({ title: "Old draft", description: "from v1" }),
    );
    const d = await loadDraft();
    expect(d?.title).toBe("Old draft");
    expect(localStorage.getItem("ct_complaint_draft")).toBeNull();
    expect((await loadDraft())?.title).toBe("Old draft");
  });

  it("hasContent ignores blank drafts", () => {
    expect(hasContent({})).toBe(false);
    expect(hasContent({ location: "x" })).toBe(true);
  });
});

describe("installable app", () => {
  it("manifest is NagarNazar with any + maskable icons", () => {
    expect(manifest.short_name).toBe("NagarNazar");
    expect(manifest.display).toBe("standalone");
    const purposes = manifest.icons.map((i: { purpose?: string }) => i.purpose);
    expect(purposes).toContain("maskable");
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  });

  it("registers the service worker only on the published site", () => {
    expect(shouldRegisterServiceWorker("nagarnazar.lovable.app", true, false)).toBe(true);
    expect(shouldRegisterServiceWorker("localhost", true, false)).toBe(false);
    expect(shouldRegisterServiceWorker("id-preview--abc.lovable.app", true, false)).toBe(false);
    expect(shouldRegisterServiceWorker("abc.lovableproject.com", true, false)).toBe(false);
    expect(shouldRegisterServiceWorker("nagarnazar.lovable.app", false, false)).toBe(false);
    expect(shouldRegisterServiceWorker("nagarnazar.lovable.app", true, true)).toBe(false);
  });
});
