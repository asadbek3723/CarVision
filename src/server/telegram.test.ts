import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { parseCallbackData, isAllowedAdminChat, telegramConfigured, sendReceiptForReview } from './telegram';
import { POST } from '@/app/api/v1/webhooks/telegram/route';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }));

const ID = '11111111-2222-4333-8444-555555555555';

describe('parseCallbackData', () => {
  it('parses every action', () => {
    expect(parseCallbackData(`a:${ID}`)).toEqual({ kind: 'approve', bookingId: ID });
    expect(parseCallbackData(`r:${ID}`)).toEqual({ kind: 'askReject', bookingId: ID });
    expect(parseCallbackData(`c:${ID}`)).toEqual({ kind: 'back', bookingId: ID });
    expect(parseCallbackData(`x:${ID}:b`)).toEqual({ kind: 'reject', bookingId: ID, code: 'b' });
  });
  it('rejects malformed data', () => {
    expect(parseCallbackData(undefined)).toBeNull();
    expect(parseCallbackData('a:not-a-uuid')).toBeNull();
    expect(parseCallbackData(`x:${ID}`)).toBeNull();
    expect(parseCallbackData(`a:${ID}:b`)).toBeNull();
    expect(parseCallbackData(`x:${ID}:z`)).toBeNull();
  });
});

describe('config', () => {
  afterEach(() => {
    delete process.env.TELEGRAM_ADMIN_CHAT_IDS;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it('only allows configured chat ids', () => {
    process.env.TELEGRAM_ADMIN_CHAT_IDS = '111, 222';
    expect(isAllowedAdminChat(111)).toBe(true);
    expect(isAllowedAdminChat(333)).toBe(false);
    expect(isAllowedAdminChat(undefined)).toBe(false);
  });

  it('is a silent no-op without a token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(telegramConfigured()).toBe(false);
    await sendReceiptForReview(ID);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  const hook = (headers: Record<string, string>, body: unknown) =>
    new NextRequest('http://x.test/api/v1/webhooks/telegram', { method: 'POST', headers, body: JSON.stringify(body) });

  it('fails closed (503) without a webhook secret', async () => {
    expect((await POST(hook({}, {}))).status).toBe(503);
  });

  it('rejects a wrong secret header (401)', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    expect((await POST(hook({ 'x-telegram-bot-api-secret-token': 'wrong' }, {}))).status).toBe(401);
  });

  it('ignores callbacks from non-admin users without touching the DB', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    process.env.TELEGRAM_ADMIN_CHAT_IDS = '111';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await POST(
      hook({ 'x-telegram-bot-api-secret-token': 'right-secret' }, { callback_query: { id: 'c1', from: { id: 999 }, data: `a:${ID}`, message: { message_id: 1, chat: { id: 999 } } } })
    );
    expect(res.status).toBe(200);
    // no bot token configured, so no Telegram call and (mocked) createAdminClient never used
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
