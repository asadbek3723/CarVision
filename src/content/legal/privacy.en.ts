import type { LegalContext } from './context';
import type { LegalDoc } from './types';

export function privacyEn(c: LegalContext): LegalDoc {
  const contact = c.email
    ? `email **${c.email}** or the “Support” section of the Platform`
    : 'the “Profile → Support” section of the Platform';
  return {
    eyebrow: 'LEGAL DOCUMENT · PERSONAL DATA',
    title: 'Privacy Policy',
    lead: `This Policy explains in detail what personal data the ${c.brand} platform (${c.site}) collects, for what purpose and on what legal basis, where and for how long it is kept, who it is shared with and how it is protected, as well as the rights you have over your data.`,
    sections: [
      {
        id: 'general',
        title: 'General provisions',
        blocks: [
          'This Privacy Policy (the **Policy**) has been prepared in accordance with the Law of the Republic of Uzbekistan “On Personal Data” and other legislation.',
          `The **operator and owner** of the personal data is **${c.operator}** (the **Operator**), the owner of the ${c.brand} platform.`,
          'The Policy applies to all Users of the Platform: website visitors, Customers, Workshops and their staff.',
          'By registering, entering data, uploading photos or placing an order, you give **informed, specific and freely given consent** to the processing of your personal data as described in this Policy.',
          'The Policy forms an integral part of the Terms of Use. Terms not defined here have the meaning given in the Terms of Use.',
          { note: '**Core principle:** we collect only the data needed to provide the service, we **do not sell** it, we do not share it with third parties for advertising, and we do not use your photos to train artificial intelligence models.' },
        ],
      },
      {
        id: 'definitions',
        title: 'Key concepts',
        blocks: [
          {
            list: [
              '**Personal data** — any information relating to an identified or identifiable natural person.',
              '**Data subject** — the natural person whose personal data is processed (you).',
              '**Processing** — collecting, organising, storing, altering, supplementing, using, disclosing, distributing, transferring, anonymising and destroying data.',
              '**Third party (processor)** — a technical partner processing data on behalf of or on the instructions of the Operator (for example, hosting or an SMS service).',
              '**Cross-border transfer** — transfer of data outside the territory of the Republic of Uzbekistan.',
              '**Anonymisation** — making data impossible to attribute to a particular person.',
            ],
          },
        ],
      },
      {
        id: 'data',
        title: 'Data we collect',
        blocks: [
          'We collect the following categories of data. Most of it you provide yourself; some is generated automatically when you use the Platform.',
          {
            table: {
              head: ['Category', 'Data', 'Source'],
              rows: [
                ['Account data', 'Phone number, name, password (stored only as a cryptographic hash), role (customer, workshop), language and currency settings, sign-up date', 'You'],
                ['Profile', 'Profile photo (avatar), additional contact details (for example email or Telegram) if you provide them', 'You'],
                ['Verification', 'SMS code (hash only), time sent and number of attempts', 'Automatic'],
                ['Workshop data', 'Name, city, district, exact address, phone, payout details, plan, credit balance, approval status', 'Workshop'],
                ['Car and photos', 'Car photos you upload, automatically detected make and model, selected products, visualisations and videos created', 'You / Automatic'],
                ['Orders', 'Order number, products, amount, exchange rate, name, phone, note, receipt image and its hash, bank transaction reference, status, pickup code, cancellation and refund details', 'You / Automatic'],
                ['Requests', 'Messages and attachments sent via Support, reports about visualisations', 'You'],
                ['Technical data', 'IP address, browser and device type (User-Agent), sign-in time, active sessions, sign-in attempts, error logs', 'Automatic'],
                ['Notifications', 'Push subscription endpoint and keys (only with your permission)', 'Browser'],
                ['Camera session', 'Identifier of a capture session on another device via QR code and the photos uploaded in it', 'Automatic'],
              ],
            },
          },
          'We **do not ask for or collect passport data, full bank card numbers, CVV codes, biometric data** or special categories of data (health, religion, political views, etc.). Before uploading a receipt you may hide extra information (such as your balance) as long as the amount, date and recipient remain visible.',
          'Car photos may show a licence plate or other people. We do not deliberately analyse them; where possible, take photos without other people in the frame.',
        ],
      },
      {
        id: 'purposes',
        title: 'Purposes and legal bases',
        blocks: [
          'We process data only for specific, predefined and lawful purposes:',
          {
            table: {
              head: ['Purpose', 'Data', 'Legal basis'],
              rows: [
                ['Registration, sign-in and account protection', 'Account, verification, technical', 'Performance of contract; consent'],
                ['Creating AI visualisations', 'Photos, car, selected products', 'Performance of contract; consent'],
                ['Placing orders, checking payment, passing orders to the Workshop, refunds', 'Orders, account', 'Performance of contract'],
                ['Paying Workshops', 'Workshop payout details', 'Performance of contract'],
                ['Preventing fraud (fake receipts, multiple accounts, bots) and abuse', 'Technical, orders, receipt hash', 'Operator’s legitimate interest; legal obligation'],
                ['Order status and security notifications', 'Phone, push subscription', 'Performance of contract; consent'],
                ['Answering requests', 'Requests, account', 'Performance of contract'],
                ['Accounting, tax records and requests from authorities', 'Orders, payments', 'Legal obligation'],
                ['Improving the Platform and fixing errors', 'Technical (aggregated where possible)', 'Operator’s legitimate interest'],
              ],
            },
          },
          'We **do not use your data for marketing SMS or emails** without your separate consent. Messages about orders, security and the service are not marketing.',
          'If a purpose changes, we will ask for your consent again unless the law allows otherwise.',
        ],
      },
      {
        id: 'ai-processing',
        title: 'Processing with artificial intelligence',
        blocks: [
          'To create visualisations, detect the car’s make and model, check photos (that a car is present and all angles show the same car), and improve and translate product texts, photos and texts are sent to artificial intelligence services.',
          'One or more of the following providers may currently be used (the system chooses automatically by availability and quality): **Google (Gemini)**, **OpenRouter** (and models through it), **Fal.ai**, **Cloudflare Workers AI**, **OpenAI**.',
          'Providers receive only what the task needs: the car photo and the product photo or description. Your name, phone number and other identifying data are **not sent**.',
          'We do not use your photos to train our own models, and we aim to use providers’ APIs in modes where, under their terms, training on customer data is disabled. Providers may keep data briefly under their own policies (for example, for abuse monitoring).',
          'Decisions made by artificial intelligence (for example, “no car found in the photo”) have no legal effect on you: they only safeguard quality before a credit is charged. If you disagree with a result, you can ask for human review through Support.',
        ],
      },
      {
        id: 'sharing',
        title: 'Who we share data with',
        blocks: [
          'We **do not sell or rent** your personal data. Data is shared only in the following cases and only to the extent necessary:',
          {
            list: [
              '**With the Workshop** — after your payment is approved, to fulfil the order: your name, phone number, note and order contents. Until payment is approved the Workshop cannot see your contact details.',
              '**With the Customer** — the Workshop’s name, address and phone once payment for the order is approved.',
              '**With technical partners** (processors acting on the Operator’s instructions) — to provide the service, as shown in the table below.',
              '**With public authorities** — only on the grounds and in the manner provided by law (requests from courts, law enforcement and tax authorities).',
              '**With a successor** — if the Operator is reorganised or the Platform passes to another person, subject to this Policy and with notice to you.',
            ],
          },
          {
            table: {
              head: ['Partner', 'Purpose', 'Data'],
              rows: [
                ['Supabase', 'Database, authentication, file storage', 'All Platform data'],
                ['Vercel', 'Website hosting and server functions', 'Technical data, requests'],
                ['Google, OpenRouter, Fal.ai, Cloudflare, OpenAI', 'Artificial intelligence services', 'Photos and product texts (without identifying data)'],
                ['Cloudflare Turnstile', 'Bot protection', 'Technical data (IP, browser)'],
                ['Eskiz.uz', 'Sending SMS', 'Phone number and SMS text'],
                ['Telegram', 'Message to the Operator’s administrators to check a payment', 'Order number, amount, customer name and phone, receipt image'],
                ['Browser push services (Google, Apple, Mozilla)', 'Delivering push notifications', 'Push endpoint, notification text'],
              ],
            },
          },
          'Each partner must process data only within the Operator’s instructions, for the purposes in this Policy, and keep it confidential.',
        ],
      },
      {
        id: 'storage',
        title: 'Where data is stored and cross-border transfers',
        blocks: [
          'Servers of the Platform’s technical partners (hosting, database, artificial intelligence providers) may be located outside the Republic of Uzbekistan, including in the European Union and the United States.',
          'By accepting this Policy you **consent to the cross-border transfer** of your personal data for the purposes described. Transfers are limited to what is necessary to provide the service and use encrypted channels.',
          'The Operator takes steps to comply with legal requirements on storing and processing personal data of citizens of the Republic of Uzbekistan, including data localisation requirements.',
        ],
      },
      {
        id: 'retention',
        title: 'Retention periods',
        blocks: [
          'Data is kept until the purpose of processing is achieved, but not less than any period required by law:',
          {
            table: {
              head: ['Data', 'Period'],
              rows: [
                ['Account and profile', 'For as long as the account exists; deleted within 30 days of a deletion request'],
                ['SMS verification codes', `Valid for ${c.otpMinutes} minutes, then invalid and periodically deleted`],
                ['Car photos and visualisations', 'Until you delete them or the account is deleted'],
                ['Orders, payments, receipts', 'The period required by accounting and tax law (as a rule, at least 5 years); anonymised when the account is deleted'],
                ['Security logs (sign-in attempts, administrator actions)', 'Up to 12 months; during an investigation or dispute, until it is closed'],
                ['Support requests', 'Up to 3 years after the request is closed'],
                ['Push subscription', 'Until you turn notifications off or the subscription becomes invalid'],
              ],
            },
          },
          'When the period ends, data is deleted or anonymised. Data in backups is deleted when the backup rotation cycle ends (usually up to 30 days).',
        ],
      },
      {
        id: 'security',
        title: 'How we protect data',
        blocks: [
          'The Operator applies legal, organisational and technical measures to protect data from unauthorised access, alteration, disclosure or destruction, including:',
          {
            list: [
              'all connections are encrypted with **HTTPS (TLS)** and an HSTS policy is applied;',
              'passwords and SMS codes are never stored in plain text — only as one-way cryptographic **hashes**;',
              'row level security rules in the database: each user can see only their own data;',
              'payment receipts are stored in a **private file store** and shown to an administrator only through a short-lived signed link;',
              'commission and payout calculations run only on the server and are never sent to the browser;',
              'the admin panel is protected by two factors (account + dedicated PIN), can be restricted to allowed IP addresses, and every action is written to an audit log;',
              'sign-in attempts, SMS sending and other requests are rate limited; bot protection is used;',
              'staff and partners access data only to the extent needed for their tasks.',
            ],
          },
          'No method of transmission over the internet or electronic storage is 100% secure. We work to protect data but cannot guarantee absolute security. Your account’s security also depends on keeping your password secret.',
        ],
      },
      {
        id: 'breach',
        title: 'If a data breach occurs',
        blocks: [
          'If a personal data security breach is detected, the Operator immediately takes steps to stop it and limit its consequences.',
          'If the breach poses a serious risk to your rights and interests, the Operator will notify you and, where the law requires, the competent public authority within the statutory time limits, explaining what happened and what you can do to protect yourself.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies and browser storage',
        blocks: [
          'The Platform uses cookies and browser storage that are necessary for it to work. We **do not use advertising cookies or third-party advertising trackers**.',
          {
            table: {
              head: ['Name / type', 'Purpose', 'Duration'],
              rows: [
                ['sb-…-auth-token (cookie)', 'Keeping you signed in (session)', 'Refreshed during the session; removed on sign-out'],
                ['NEXT_LOCALE (cookie)', 'Remembering your language', 'Up to 1 year'],
                ['cv_admin_session (cookie)', 'Administrators only: admin panel session', 'Short-lived'],
                ['carvision_preferred_currency (local storage)', 'Selected currency', 'Until you clear it'],
                ['veloce_cart, veloce_cart_unselected (local storage)', 'Cart contents', 'Until you clear it'],
                ['carvision_saved_build (local storage)', 'Saved selection in the visualiser', 'Until you clear it'],
                ['IndexedDB, Service Worker cache', 'Queueing photos while offline, fast app start (PWA)', 'Until you clear it'],
              ],
            },
          },
          'You can delete or block cookies and site data in your browser settings. Sign-in, the cart and other features may then stop working.',
          'When bot protection (Cloudflare Turnstile) runs, Cloudflare may set its own technical cookies.',
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        blocks: [
          'As a data subject you have the right:',
          {
            list: [
              '**to information** — to know what data the Operator processes about you, why and on what basis, who it is shared with and how long it is kept;',
              '**of access** — to receive a copy of your data;',
              '**to rectification** — to correct inaccurate or outdated data (most of it you can change yourself in profile settings);',
              '**to erasure** — to request deletion of your data and account (except data the law requires us to keep, which is anonymised);',
              '**to withdraw consent** — at any time; this does not affect the lawfulness of processing before withdrawal, but some Platform features may stop working;',
              '**to restrict and object** — to the use of your data for particular purposes;',
              '**to complain** — to the competent public authority for personal data or to a court if you believe your rights have been violated.',
            ],
          },
          `To make a request: ${contact}. For security we will ask you to confirm that the request comes from the account holder (for example, with an SMS code to the linked number).`,
          'We reply within the time required by law and no later than **30 calendar days**. Requests are free of charge; manifestly unfounded or excessively repetitive requests may be refused.',
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications and messages',
        blocks: [
          'Push notifications are sent only after you explicitly allow them in your browser or on your device. You can turn them off at any time in profile or browser settings.',
          'SMS is sent only for verification codes and important service messages.',
          'Marketing messages are sent only with your separate consent, and each one includes a way to unsubscribe.',
        ],
      },
      {
        id: 'children',
        title: 'Children’s data',
        blocks: [
          'The Platform is not intended for people under 16. We do not knowingly collect data from children under 16.',
          'If you are a parent or legal guardian and know that your child has given us data, contact us and we will delete it.',
        ],
      },
      {
        id: 'sellers-data',
        title: 'Additional rules for Workshops',
        blocks: [
          'A Workshop is an **independent controller** of the Customer data (name, phone, note) it receives through an order and is responsible for it under the laws of the Republic of Uzbekistan.',
          'A Workshop may use Customer data only to fulfil that order (contact, handover, warranty service). Adding it to marketing lists, selling it or sharing it with third parties is prohibited.',
          'Workshop staff should sign in with separate accounts or approved devices and must not share the password openly among staff.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this Policy',
        blocks: [
          'The Operator may update this Policy. The current version number and its effective date are shown at the top of this page.',
          'If the purposes of processing or the range of third parties change materially, we will notify you in advance on the Platform or through another available channel and, where the law requires, ask for consent again.',
          'The Policy is published in Uzbek, Russian and English. In case of discrepancy, **the Uzbek text prevails**.',
        ],
      },
      {
        id: 'contact',
        title: 'Operator and contacts',
        blocks: [
          {
            table: {
              head: ['Item', 'Details'],
              rows: [
                ['Personal data operator', c.operator],
                ['Platform', `${c.brand} — ${c.site}`],
                ...(c.tin ? [['TIN', c.tin]] : []),
                ['Address', c.legalAddress ?? 'Tashkent, Republic of Uzbekistan'],
                ['Data requests', c.email ?? 'the “Profile → Support” section of the Platform'],
                ['Response time', 'Up to 30 calendar days'],
              ],
            },
          },
        ],
      },
    ],
  };
}
