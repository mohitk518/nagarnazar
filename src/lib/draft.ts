/**
 * Complaint draft stored on the device in IndexedDB (text, category, location, ward and the photo
 * as a Blob — no size-squeezing into localStorage). Falls back to localStorage (text only) when
 * IndexedDB is unavailable. A draft can be "queued": the citizen pressed Submit while offline,
 * and the app asks "Send draft?" once the network is back.
 */
const LEGACY_KEY = "ct_complaint_draft";
const DB_NAME = "nagarnazar";
const STORE = "drafts";
const DRAFT_ID = "current";
export const DRAFT_EVENT = "nn-draft-changed";

export interface ComplaintDraft {
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
  manualLat: string;
  manualLng: string;
  anonymous: boolean;
  ward?: string;
  city?: string;
  photo?: Blob | null;
  photoName?: string;
  photoType?: string;
  /** Submit was pressed while offline; ask to send when back online. */
  queued?: boolean;
  savedAt?: number;
}

/** Legacy shape (photo as a data URL in localStorage). */
interface LegacyDraft extends Partial<ComplaintDraft> {
  photoDataUrl?: string;
}

function hasIdb(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function notify() {
  try {
    window.dispatchEvent(new Event(DRAFT_EVENT));
  } catch {
    /* not in a browser */
  }
}

export function hasContent(d: Partial<ComplaintDraft> | null | undefined): boolean {
  return Boolean(d && (d.title || d.description || d.location || d.category || d.photo));
}

export function dataUrlToFile(dataUrl: string, name: string, type: string): File | null {
  try {
    const [header, b64] = dataUrl.split(",");
    if (!b64) return null;
    const mime = type || (header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg");
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name || `photo-${Date.now()}.jpg`, { type: mime });
  } catch {
    return null;
  }
}

function readLegacy(): Partial<ComplaintDraft> | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as LegacyDraft;
    const { photoDataUrl, ...rest } = legacy;
    const photo =
      photoDataUrl && legacy.photoName
        ? dataUrlToFile(photoDataUrl, legacy.photoName, legacy.photoType ?? "")
        : null;
    return { ...rest, photo };
  } catch {
    return null;
  }
}

/** Loads the saved draft (migrating an old localStorage draft into IndexedDB once). */
export async function loadDraft(): Promise<Partial<ComplaintDraft> | null> {
  if (!hasIdb()) return readLegacy();
  try {
    const stored = await idb<Partial<ComplaintDraft> | undefined>("readonly", (s) =>
      s.get(DRAFT_ID),
    );
    if (stored) return stored;
    const legacy = readLegacy();
    if (legacy && hasContent(legacy)) {
      await idb("readwrite", (s) => s.put({ ...legacy, savedAt: Date.now() }, DRAFT_ID));
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
      return legacy;
    }
    return null;
  } catch {
    return readLegacy();
  }
}

/** Saves (or clears, when empty) the draft. Never throws. */
export async function saveDraft(d: Partial<ComplaintDraft>): Promise<void> {
  if (!hasContent(d)) {
    await clearDraft();
    return;
  }
  const record = { ...d, savedAt: Date.now() };
  try {
    if (hasIdb()) {
      await idb("readwrite", (s) => s.put(record, DRAFT_ID));
    } else {
      // Text-only fallback
      const { photo: _photo, ...text } = record;
      void _photo;
      localStorage.setItem(LEGACY_KEY, JSON.stringify(text));
    }
  } catch {
    /* storage full or blocked: the form still works */
  }
  notify();
}

/** Marks the stored draft as waiting to be sent (or not). */
export async function setDraftQueued(queued: boolean): Promise<void> {
  const current = await loadDraft();
  if (!current || !hasContent(current)) return;
  await saveDraft({ ...current, queued });
}

export async function clearDraft(): Promise<void> {
  try {
    if (hasIdb()) await idb("readwrite", (s) => s.delete(DRAFT_ID));
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Turns a stored Blob back into a File for upload. */
export function blobToFile(blob: Blob, name?: string, type?: string): File {
  if (blob instanceof File) return blob;
  return new File([blob], name || `photo-${Date.now()}.jpg`, {
    type: type || blob.type || "image/jpeg",
  });
}
