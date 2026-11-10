/** Topics a help-centre request can be filed under (shared by the page and the API). */
export const SUPPORT_TOPICS = ['order', 'payment', 'render', 'account', 'seller', 'bug', 'other'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
