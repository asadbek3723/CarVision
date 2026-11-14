/** Why a customer did not like a render (stored in `generations.feedback_reason`). */
export const FEEDBACK_REASONS = ['wrong_part', 'wrong_color', 'other_car', 'wrong_angle', 'not_realistic', 'other'] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
