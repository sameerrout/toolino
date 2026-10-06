import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  createContactMessage,
  getContactMessages,
  getContactMessageById,
  updateContactMessageStatus,
  deleteContactMessage,
  getDb,
  saveDb,
} from '@/lib/db';
import { POST as contactPostHandler } from '@/app/api/contact/route';
import { GET as managerGetHandler, PATCH as managerPatchHandler, DELETE as managerDeleteHandler } from '@/app/api/manager/messages/route';
import { NextRequest } from 'next/server';

describe('Contact Us & Manager Message Workflow', () => {
  beforeEach(() => {
    // Clear test messages
    const db = getDb();
    db.contactMessages = (db.contactMessages || []).filter(
      (m) => !m.email.endsWith('@test-contact.com')
    );
    saveDb(db);
  });

  afterAll(() => {
    const db = getDb();
    db.contactMessages = (db.contactMessages || []).filter(
      (m) => !m.email.endsWith('@test-contact.com')
    );
    saveDb(db);
  });

  it('creates contact message with default status=unread and valid timestamps', () => {
    const newMsg = createContactMessage({
      name: 'Alice Tester',
      email: 'alice@test-contact.com',
      category: 'Question about a tool',
      message: 'I have a question about merging PDF files client-side.',
    });

    expect(newMsg.id).toBeDefined();
    expect(newMsg.id.startsWith('msg_')).toBe(true);
    expect(newMsg.name).toBe('Alice Tester');
    expect(newMsg.email).toBe('alice@test-contact.com');
    expect(newMsg.category).toBe('Question about a tool');
    expect(newMsg.message).toBe('I have a question about merging PDF files client-side.');
    expect(newMsg.status).toBe('unread');
    expect(newMsg.createdAt).toBeDefined();
    expect(newMsg.updatedAt).toBeDefined();

    // Verify retrieval by ID
    const retrieved = getContactMessageById(newMsg.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(newMsg.id);
  });

  it('sorts messages newest first', async () => {
    const msg1 = createContactMessage({
      name: 'First Sender',
      email: 'first@test-contact.com',
      category: 'Bug report',
      message: 'First test message here.',
    });

    // Slight delay to ensure distinct timestamp
    await new Promise((r) => setTimeout(r, 15));

    const msg2 = createContactMessage({
      name: 'Second Sender',
      email: 'second@test-contact.com',
      category: 'Feedback',
      message: 'Second test message here.',
    });

    const messages = getContactMessages();
    const testMessages = messages.filter((m) => m.email.endsWith('@test-contact.com'));

    expect(testMessages.length).toBeGreaterThanOrEqual(2);
    expect(testMessages[0].id).toBe(msg2.id);
    expect(testMessages[1].id).toBe(msg1.id);
  });

  it('updates contact message status through all valid states', () => {
    const msg = createContactMessage({
      name: 'Status Tester',
      email: 'status@test-contact.com',
      category: 'General',
      message: 'Checking status state machine transitions.',
    });

    expect(msg.status).toBe('unread');

    // unread -> read
    const readRes = updateContactMessageStatus(msg.id, 'read');
    expect(readRes.success).toBe(true);
    expect(readRes.message?.status).toBe('read');

    // read -> replied
    const repliedRes = updateContactMessageStatus(msg.id, 'replied');
    expect(repliedRes.success).toBe(true);
    expect(repliedRes.message?.status).toBe('replied');

    // replied -> resolved
    const resolvedRes = updateContactMessageStatus(msg.id, 'resolved');
    expect(resolvedRes.success).toBe(true);
    expect(resolvedRes.message?.status).toBe('resolved');

    // Invalid status rejected
    // @ts-expect-error test runtime validation of invalid string
    const invalidRes = updateContactMessageStatus(msg.id, 'invalid-status');
    expect(invalidRes.success).toBe(false);
  });

  it('permanently deletes contact message from storage', () => {
    const msg = createContactMessage({
      name: 'To Delete',
      email: 'delete@test-contact.com',
      category: 'Other',
      message: 'This message will be deleted permanently.',
    });

    expect(getContactMessageById(msg.id)).toBeDefined();

    const delRes = deleteContactMessage(msg.id);
    expect(delRes.success).toBe(true);

    expect(getContactMessageById(msg.id)).toBeUndefined();
  });

  it('POST /api/contact validates payload and saves valid message', async () => {
    // Valid submission
    const req = new NextRequest('http://localhost:3000/api/contact/', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Public User',
        email: 'public@test-contact.com',
        category: 'Question about a tool',
        message: 'This is a valid public test message with plenty of detail.',
      }),
    });

    const res = await contactPostHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain('Message sent successfully');
    expect(json.id).toBeDefined();

    // Verify stored in DB
    const saved = getContactMessageById(json.id);
    expect(saved).toBeDefined();
    expect(saved?.email).toBe('public@test-contact.com');
    expect(saved?.status).toBe('unread');
  });

  it('POST /api/contact rejects invalid inputs with 400', async () => {
    // Missing email
    const req1 = new NextRequest('http://localhost:3000/api/contact/', {
      method: 'POST',
      body: JSON.stringify({
        name: 'User',
        email: 'not-an-email',
        message: 'Valid message body here.',
      }),
    });
    const res1 = await contactPostHandler(req1);
    expect(res1.status).toBe(400);

    // Message too short
    const req2 = new NextRequest('http://localhost:3000/api/contact/', {
      method: 'POST',
      body: JSON.stringify({
        name: 'User',
        email: 'user@test-contact.com',
        message: 'Short',
      }),
    });
    const res2 = await contactPostHandler(req2);
    expect(res2.status).toBe(400);
  });

  it('enforces security: manager endpoints reject unauthenticated requests with 403', async () => {
    // GET /api/manager/messages/ without session
    const getRes = await managerGetHandler();
    expect(getRes.status).toBe(403);

    // PATCH /api/manager/messages/ without session
    const patchReq = new NextRequest('http://localhost:3000/api/manager/messages/', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'msg_fake_123', status: 'read' }),
    });
    const patchRes = await managerPatchHandler(patchReq);
    expect(patchRes.status).toBe(403);

    // DELETE /api/manager/messages/ without session
    const deleteReq = new NextRequest('http://localhost:3000/api/manager/messages/?id=msg_fake_123', {
      method: 'DELETE',
    });
    const deleteRes = await managerDeleteHandler(deleteReq);
    expect(deleteRes.status).toBe(403);
  });
});
