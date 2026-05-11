'use client';

const SESSION_KEY = 'dtv_session_id';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  // sessionStorage is scoped per tab — new tab = new UUID automatically
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function hasSeenDocument(documentId: string): boolean {
  if (typeof window === 'undefined') return false;
  const seen = sessionStorage.getItem(`dtv_seen_${documentId}`);
  return seen !== null;
}

export function markDocumentSeen(documentId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`dtv_seen_${documentId}`, '1');
}

const ADMIN_KEY = 'dtv_admin_key';

export function getAdminKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_KEY);
}

export function setAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY, key);
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY);
}
