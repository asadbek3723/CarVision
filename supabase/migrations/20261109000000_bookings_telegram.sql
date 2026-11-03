-- Telegram review of booking deposits: remember which chat message carries the approve/reject
-- buttons so a decision made on the website can update that message (and vice versa).
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
    ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;
