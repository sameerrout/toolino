import { describe, it, expect, beforeEach } from 'vitest';
import { readDb, writeDb, clearDb } from '@/lib/db';

describe('Client-Side Contact Messages Suite', () => {
  beforeEach(() => {
    clearDb();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('records contact message directly to local database messages array', () => {
    writeDb((draft) => {
      draft.messages.unshift({
        id: 'msg_1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Great privacy-first tool!',
        createdAt: new Date().toISOString(),
      });
    });

    const db = readDb();
    expect(db.messages.length).toBe(1);
    expect(db.messages[0].name).toBe('Jane Doe');
    expect(db.messages[0].email).toBe('jane@example.com');
  });

  it('deletes message from database when requested', () => {
    writeDb((draft) => {
      draft.messages.push(
        { id: 'msg_a', name: 'A', email: 'a@a.com', message: 'Hello', createdAt: new Date().toISOString() },
        { id: 'msg_b', name: 'B', email: 'b@b.com', message: 'World', createdAt: new Date().toISOString() }
      );
    });

    expect(readDb().messages.length).toBe(2);

    writeDb((draft) => {
      draft.messages = draft.messages.filter((m) => m.id !== 'msg_a');
    });

    const updated = readDb();
    expect(updated.messages.length).toBe(1);
    expect(updated.messages[0].id).toBe('msg_b');
  });
});
