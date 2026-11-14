import type { LegalContext } from './context';
import type { LegalDoc } from './types';

export function termsEn(c: LegalContext): LegalDoc {
  const contact = c.email
    ? `email **${c.email}** or the “Support” section of the Platform`
    : 'the “Profile → Support” section of the Platform';
  return {
    eyebrow: 'LEGAL DOCUMENT · PUBLIC OFFER',
    title: 'Terms of Use',
    lead: `These Terms govern the use of the ${c.brand} platform (the ${c.site} website, all of its language versions, its installable app version and related services) and set out the rights and obligations of the Operator, customers and workshops. By starting to use the Platform you accept these Terms in full and without reservation.`,
    sections: [
      {
        id: 'general',
        title: 'General provisions',
        blocks: [
          `These Terms of Use (the **Terms**) constitute a **public offer** under the Civil Code of the Republic of Uzbekistan made to any person by **${c.operator}**, the owner and operator of the ${c.brand} platform (the **Operator**).`,
          'Any of the following actions constitutes full and unconditional **acceptance** of the offer: registering on the Platform; signing in; placing an order; uploading a payment receipt; listing products as a workshop; purchasing a plan or credits; using any feature of the Platform.',
          'From the moment of acceptance, a contract on these Terms is concluded between the User and the Operator. The contract is deemed concluded in writing and does not require a paper signature.',
          'Use of the Platform is also governed by the **Privacy Policy**, which forms an integral part of these Terms.',
          'If you do not agree with any provision of these Terms, you must stop using the Platform immediately.',
          { note: '**Important:** the Platform is an online visualisation service and an intermediary marketplace for workshop products. The seller of a product, the provider of installation services and the party responsible for their quality is the **workshop** that listed the product. The Operator organises the collection, verification and transfer of payment to the workshop.' },
        ],
      },
      {
        id: 'definitions',
        title: 'Definitions',
        blocks: [
          'The following terms are used in these Terms:',
          {
            list: [
              `**Platform** — the ${c.site} website, all of its pages and language versions, its progressive web app (PWA) version, application programming interfaces (API) and the services provided through them.`,
              `**Operator** — ${c.operator}, the owner of the Platform and the party that runs it.`,
              '**User** — any natural or legal person who visits, registers on or uses any feature of the Platform.',
              '**Customer** — a User who browses, visualises and orders car tuning products and services.',
              '**Workshop (Seller)** — a sole trader or legal entity in car tuning, detailing or spare parts, approved by the Operator, that lists its products and services on the Platform.',
              '**Account** — the User’s personal area, accessed with a phone number and password.',
              '**Product (Part)** — goods or a service listed by a Workshop: wheels, bumpers, body kits, spoilers, headlights, wraps, paint, window tint, ceramic coating, polishing and more.',
              '**Visualisation (Render)** — an image or video produced with artificial intelligence by placing selected products on a photo of a car uploaded by the User.',
              '**Credit** — an internal unit of account; one successful visualisation uses one credit (or the amount stated in the plan). A credit is not money and cannot be exchanged for cash.',
              '**Plan** — a package for Workshops (number of credits, devices and other features) granted for 30 days.',
              '**Order** — a Customer’s request to buy one or more Products from one Workshop.',
              '**Receipt** — a screenshot of a banking app or an image of a slip confirming payment.',
              '**Pickup code** — a secret code given to the Customer once payment is confirmed and used to collect the Product at the Workshop.',
              '**Content** — any text, images, video, logos, design, software code and other material on the Platform.',
            ],
          },
        ],
      },
      {
        id: 'acceptance',
        title: 'Entry into force and changes',
        blocks: [
          'These Terms take effect when published on the Platform and remain in force until withdrawn by the Operator.',
          'The Operator may amend these Terms unilaterally. A new version takes effect on the date of publication unless it states otherwise.',
          'The Operator gives at least **7 (seven) calendar days’** notice, on the Platform, by push notification or through another available channel, of changes that materially restrict the rights of Customers or Workshops.',
          'Continued use of the Platform after changes take effect means acceptance of the new version. A User who does not agree may stop using the Platform and request deletion of the Account.',
          'Changes do not apply to Orders placed and paid before they take effect, unless the law provides otherwise.',
          'The current version number and its effective date are shown at the top of this page.',
        ],
      },
      {
        id: 'eligibility',
        title: 'Who may use the Platform',
        blocks: [
          'The Platform may be used by natural persons with full legal capacity who are at least **18 (eighteen) years old**, and by duly registered sole traders and legal entities.',
          'Persons aged 16 to 18 may use the Platform only with the consent of a parent or other legal guardian and only to browse and visualise; they may not place Orders.',
          'A person acting on behalf of a legal entity or sole trader warrants that they are duly authorised. Liability for unauthorised acts rests with that person.',
          'Users must not use the Platform where this is prohibited by the laws of the Republic of Uzbekistan or of the country where they are located.',
        ],
      },
      {
        id: 'account',
        title: 'Registration and account security',
        blocks: [
          'To register, the User provides a valid mobile phone number, a name and a password. The Operator may send a confirmation code by SMS.',
          `An SMS code is valid for **${c.otpMinutes} minutes**; no more than **${c.otpAttempts} wrong attempts** are allowed per code, and a new code may be requested no sooner than 60 seconds later. These limits protect the Account from unauthorised access.`,
          'To prevent automated (fake) sign-ups the Operator may use Cloudflare Turnstile or a similar check.',
          'The User undertakes to:',
          {
            list: [
              'provide only their own, accurate and complete information and keep it up to date;',
              'keep the password secret, not share it, and use a strong password not used for other services;',
              'change the password immediately and inform the Operator if unauthorised access is suspected;',
              'not open several Accounts for one person (in particular to obtain free credits repeatedly).',
            ],
          },
          'All actions taken through an Account are deemed to be taken by its holder unless the holder notified the Operator of unauthorised access beforehand.',
          'The number of devices that may be active at the same time is limited by the Workshop’s plan. When the limit is exceeded, the oldest session may be ended.',
        ],
      },
      {
        id: 'services',
        title: 'Platform services',
        blocks: [
          'The Platform provides the following main services:',
          {
            list: [
              '**AI visualiser** — placing wheels, body parts, spoilers, headlights, colour, wraps, window tint and other changes on a photo of a car using artificial intelligence;',
              '**Catalog and shop** — products of approved Workshops with price, photos, description and fitment, and the “My car” filter;',
              '**Ordering and payment** — buying a Product, transferring payment to the Operator’s card, uploading the receipt and receiving the Pickup code;',
              '**Workshop dashboard** — inventory, AI photo and text enhancement, automatic translation, orders, code check, statistics;',
              '**Smart camera** — photographing the car from several angles on a phone (including via a QR code on another device);',
              '**Notifications** — push notifications about order status and other important events (only with the User’s permission).',
            ],
          },
          'The Operator may change, update, suspend or discontinue services without prior notice; the User’s rights to services already paid for but not yet provided are preserved.',
          'The Platform is provided “as is” and “as available”. The Operator takes reasonable steps to keep it running without interruption, but downtime may occur because of maintenance, failures of third-party services and force majeure.',
        ],
      },
      {
        id: 'ai',
        title: 'AI visualisation',
        blocks: [
          '**Visualisations are illustrative.** They give an approximate idea of how a Product looks on a car but do not guarantee an exact match with the real colour, size, proportions, lighting, material texture or installation result.',
          'A visualisation does not confirm technical fitment (wheel size, bolt pattern, offset, mounting method and so on). Fitment must be confirmed with the Workshop before ordering.',
          'Photos uploaded by the User are sent to artificial intelligence services that are the Operator’s technical partners (for example Google Gemini, OpenRouter, Fal.ai, Cloudflare Workers AI, OpenAI) solely to create the image. See the Privacy Policy for details.',
          'A credit is charged only for a **successful** visualisation. If a visualisation fails because of an error, a timeout or a provider refusal, the credit is refunded automatically. A cached result for an identical request may not use a credit.',
          'A User unhappy with a result may use “Report a problem”; the Operator will review the report and may refund the credit at its discretion.',
          'Visualisations created on the free plan carry a “Tuned by CarVision” watermark. Removing, cropping or hiding the watermark is prohibited.',
          'The User must not upload: photos showing identifiable faces of other people (without their consent); photos of another person’s car without the owner’s consent; images protected by third-party copyright; unlawful, obscene or harmful images.',
          'To prevent abuse the Operator may check uploaded photos automatically (for example, that a car is present and that all angles show the same car). A photo that fails the check may be rejected; no credit is charged.',
        ],
      },
      {
        id: 'plans',
        title: 'Plans, credits and payment (Workshops)',
        blocks: [
          'Workshop plans, their prices, credits, devices and other features are published on the “Plans” page, which forms an integral part of these Terms.',
          'Each plan runs for **30 (thirty) calendar days**. There is no automatic renewal or automatic card charge: a plan is activated each time after the Workshop pays and the Operator confirms the payment.',
          'Plan credits expire at the end of the plan period and do not roll over. Bonus credits (trial, referral, Operator gifts) are valid for 12 months from the date granted unless stated otherwise.',
          'Prices may be shown in US dollars; payment is made in Uzbek soum at the rate shown on the Platform on the day of payment.',
          'When a plan ends, the Workshop Account becomes “expired”: products, order history and other data are kept, but new visualisations are paused.',
          'A plan fee is not refundable once the plan is activated, except where the law requires otherwise. If a plan was activated in error or not activated at all, the fee is refunded in full or the plan is activated correctly at the Workshop’s request.',
          'Credits cannot be transferred to another Account, sold or exchanged for money.',
        ],
      },
      {
        id: 'catalog',
        title: 'Catalog, product information and prices',
        blocks: [
          'A Product’s name, description, photos, price, availability, fitment and other characteristics are entered by the **Workshop**, which is responsible for their accuracy and completeness.',
          'Product names and descriptions may be translated automatically into the Platform’s other languages using artificial intelligence. In case of discrepancy, the Workshop’s original text prevails.',
          'Prices may be shown in the User’s chosen currency for reference. The exact amount payable is set in soum at the rate at the time the Order is placed and appears in the payment instructions.',
          'A Product marked “Universal” fits most cars, but size, bolt pattern and other parameters are matched to your car by the Workshop when ordering, which may affect the price.',
          'The Operator may review product information and hide or remove Products that breach these Terms without notice, but does not undertake to review all Products in advance.',
          'An obvious technical error in price or description (for example, an extra or missing digit) does not oblige anyone to fulfil an Order at the wrong price; such an Order is cancelled and the amount paid is refunded in full.',
        ],
      },
      {
        id: 'orders',
        title: 'Ordering and payment',
        blocks: [
          'An Order is placed as follows:',
          {
            ordered: true,
            list: [
              'The Customer adds Products to the cart and places the Order; a separate Order is created for each Workshop.',
              'The Platform shows the exact amount payable (in soum), the recipient card details and the payment deadline. The amount is calculated on the server from database prices; any amount sent by the browser is ignored.',
              'The Customer transfers the full amount to the card shown and uploads the payment receipt to the Platform.',
              'The Operator checks the receipt. Once approved, the Product is taken out of stock, the Customer receives a **Pickup code** and the Workshop receives the Customer’s name, phone number and note.',
              'The Customer visits the Workshop and gives the Pickup code; the Workshop verifies it on the Platform and hands over the Product (or performs the installation).',
            ],
          },
          `The Operator acts as an **intermediary** collecting payment on behalf of and on the instructions of the Workshop. The Operator’s fee (commission) of **${c.commissionPct}%** of the Order amount is deducted from the amount transferred to the Workshop; the Customer pays no additional commission.`,
          'Payment must be made only to the details shown on the Platform. The Operator is not responsible for payments made outside the Platform — directly to the Workshop or to third parties — and such payments are not protected by the Platform.',
          'A receipt may be rejected if: the amount is incomplete; payment was made to a different card; the receipt is unreadable, edited, reused or fake; the funds did not reach the Operator’s account. A rejected Order is cancelled. If money was in fact transferred, the Customer contacts Support, and once the payment is confirmed the funds are returned or the Order is restored.',
          '**Uploading a fake or edited receipt is fraud.** The Account is then blocked without notice, the device may be restricted and the relevant information may be passed to law enforcement.',
          'Do not share your Pickup code. Collection of a Product with the code is deemed collection by the Customer.',
          'For every payment the order number, amount, exchange rate and status are kept in the Account; the Customer can download an electronic receipt (the receipt page) for the Order.',
        ],
      },
      {
        id: 'cancellation',
        title: 'Cancellation and refunds',
        blocks: [
          `**Cancellation by the Customer.** The Customer may cancel an Order on the Platform within **${c.cancelHours} hours** of payment approval, provided the Product has not been handed over and the Workshop has not been paid. In that case **${c.refundPct}%** of the amount paid is refunded; the remaining **${c.retainedPct}%** is retained to cover reserving the Product, processing the payment and the Workshop’s costs.`,
          `After ${c.cancelHours} hours or once the Product has been handed over, the Order cannot be cancelled through the Platform. Returns or exchanges are then settled with the Workshop under consumer protection law.`,
          'A **full (100%) refund** is made where:',
          {
            list: [
              'the Workshop refuses to fulfil the Order or the Product becomes unavailable;',
              'the Workshop fails to contact the Customer within a reasonable time about a confirmed Order or does not hand over the Product;',
              'an obvious technical error in price or product information is found (section 9);',
              'the Operator cancels the Order on its own initiative (except where the Customer is in breach);',
              'a payment error or double payment is identified (for the overpaid part).',
            ],
          },
          'Refunds are made by the Operator by bank transfer to the card used for payment (or another card in the Customer’s name). As a rule, refunds are made within **10 (ten) banking days** of the cancellation being confirmed; when the money arrives depends on the bank.',
          'The refund is calculated from the soum amount recorded at payment; exchange-rate movements do not affect it.',
          'Claims about quality, defects, warranty and installation are made to the Workshop under the Law of the Republic of Uzbekistan “On Consumer Rights Protection”. The Operator connects the Customer and the Workshop and helps settle the dispute.',
          { note: 'Nothing in this section limits consumer rights granted by law that cannot be limited by contract.' },
        ],
      },
      {
        id: 'sellers',
        title: 'Workshop rights and obligations',
        blocks: [
          'To sell on the Platform, a Workshop must be approved (verified) by the Operator, which may request registration documents, address, phone and payout details. Products of an unapproved Workshop are not shown in the public catalog.',
          'The Workshop undertakes to:',
          {
            list: [
              'list only lawful Products that it owns or has the right to sell;',
              'show real photos, the exact price, availability, specifications and fitment, and update them immediately when they change;',
              'fulfil confirmed Orders, receive the Customer on time and hand over Products only against the correct Pickup code;',
              'provide the statutory warranty for Products and services and handle consumer claims for defective Products;',
              'pay its own taxes and other mandatory charges and issue a fiscal receipt or invoice where the law requires;',
              'use the Customer’s personal data only to fulfil the Order, not share it with third parties and not use it for marketing;',
              'not encourage the Customer to pay outside the Platform.',
            ],
          },
          `**Workshop payouts.** The Order amount less the Operator’s ${c.commissionPct}% commission is transferred to the Workshop’s payout details on the Platform after the cancellation window (${c.cancelHours} hours) has passed and the Product has been handed over. The Workshop is responsible for delays or misdirected transfers caused by wrong details.`,
          'The Workshop grants the Operator a free, non-exclusive, worldwide licence to use the photos and texts it lists on the Platform, in the catalog, for search engines, in advertising and on social media to promote the Platform.',
          'The Workshop must review AI-enhanced photos and texts before publishing; they must not misrepresent the Product.',
          'In case of serious or repeated breaches, many justified complaints or fraud, the Operator may hide the Workshop from the catalog, suspend its Account or revoke its approval. Amounts due may be withheld until the dispute is resolved.',
        ],
      },
      {
        id: 'legality',
        title: 'Legality of vehicle modifications',
        blocks: [
          'Modifying a vehicle’s construction, appearance and equipment (including window tint, headlights and lighting, exhaust, suspension, wheel and tyre size, body colour) is governed by the road safety laws of the Republic of Uzbekistan and in some cases requires a permit or registration with the competent authorities.',
          'Being visualised or sold on the Platform does not mean that a Product is lawful to install and use on a particular vehicle. Checking legality, obtaining permits and registering changes is the responsibility of the **vehicle owner**.',
          'The Operator is not liable for fines, refused registration, refused insurance claims or other consequences of installing or using a Product.',
        ],
      },
      {
        id: 'content',
        title: 'User content',
        blocks: [
          'Rights in photos, texts, reviews and other material uploaded by the User (user content) remain with the User.',
          'By uploading content, the User grants the Operator a free, non-exclusive licence to store, process (including sending it to artificial intelligence services), reproduce and display it to the User. The licence lasts until the content or Account is deleted (except data the law requires to be kept).',
          'The Operator does not publish a User’s visualisations for advertising without the User’s separate written consent.',
          'The User warrants that uploaded content does not infringe third-party rights (copyright, privacy, image rights) and is solely liable for any such claims.',
        ],
      },
      {
        id: 'ip',
        title: 'Intellectual property',
        blocks: [
          `The Platform’s software, design, interface, the ${c.brand} name and logo, texts, database structure and other elements belong to the Operator or are used by it lawfully and are protected by the intellectual property laws of the Republic of Uzbekistan.`,
          'The User receives a limited, non-exclusive, non-transferable right of personal use of the Platform solely for the purposes set out in these Terms.',
          'Copying, modifying, distributing, selling, renting, decompiling or creating derivative works from Platform elements without the Operator’s written consent is prohibited.',
          'Users may use visualisations created in their Account for personal purposes, and Workshops also to show to their customers and advertise their products; any watermark must be kept.',
        ],
      },
      {
        id: 'prohibited',
        title: 'Prohibited conduct',
        blocks: [
          'Users must not:',
          {
            list: [
              'upload fake, edited or someone else’s payment receipts;',
              'register an Account in another person’s name or use someone else’s Account;',
              'open several Accounts to obtain free credits or bonuses;',
              'send bulk requests with automated tools (bots, scripts, parsers), scrape data or bypass rate limits without the Operator’s permission;',
              'attempt to breach Platform security, probe for vulnerabilities (except as agreed with the Operator) or access other Users’ data;',
              'upload malware, viruses or code that disrupts the Platform;',
              'use the Platform for unlawful activity, fraud, money laundering or trading stolen property;',
              'insult or threaten Workshops or other Users or spread false information about them;',
              'encourage a Customer to pay directly, bypassing the Platform;',
              'remove the watermark or technically circumvent Platform limits.',
            ],
          },
          'Where prohibited conduct is found, the Operator may without notice remove content, restrict features, block the Account, cancel credits and claim compensation for damage.',
        ],
      },
      {
        id: 'termination',
        title: 'Suspension and deletion of the Account',
        blocks: [
          `The User may request deletion of the Account at any time via ${contact}. The request is carried out within **30 (thirty) calendar days** after the request is confirmed to come from the Account holder.`,
          'On deletion, personal data is erased or anonymised; data that must be kept for accounting, tax and payment records (order amount, date, payment confirmation) is retained in anonymised form for the period required by law.',
          'If there are unfulfilled Orders or unresolved disputes, deletion may be postponed until they are closed.',
          'On deletion, unused credits and the remaining plan period lapse and are not compensated in money.',
          'The Operator may suspend or delete an Account for breach of these Terms, where required by law, or after more than 24 months of inactivity. Before deleting an inactive Account the Operator sends a warning through an available channel.',
        ],
      },
      {
        id: 'disclaimer',
        title: 'Disclaimer',
        blocks: [
          'To the extent permitted by law, the Operator does not guarantee: uninterrupted and error-free operation of the Platform; an exact match between a visualisation and the real installation; the completeness and accuracy of information listed by Workshops; fitness of the Platform for a User’s particular purpose.',
          'The Operator is not liable as a seller for the quality, warranty, installation quality and safety of Products sold by Workshops; those obligations rest with the Workshop. This does not limit the Operator’s obligations to collect and refund payments under these Terms.',
        ],
      },
      {
        id: 'liability',
        title: 'Liability and its limits',
        blocks: [
          'The parties are liable for non-performance or improper performance of their obligations under the laws of the Republic of Uzbekistan and these Terms.',
          'To the extent permitted by law, the Operator is not liable for indirect losses such as lost profit, loss of data or business interruption.',
          'The Operator’s total liability for a particular Order is limited to the amount actually paid by the Customer for that Order and, for a plan, to the price of the last plan paid, unless the law provides otherwise.',
          'These limits do not apply to damage caused by the Operator intentionally or through gross negligence, or to liability that cannot be limited by law.',
          'The User is liable for damage (including claims, fines and legal costs) caused to the Operator or third parties by the User’s breach of these Terms.',
        ],
      },
      {
        id: 'force-majeure',
        title: 'Force majeure',
        blocks: [
          'The parties are released from liability for non-performance caused by force majeure: natural disasters, fire, epidemics, hostilities, decisions of public authorities, widespread power or internet outages, banking system failures, failure of third-party providers (hosting, AI providers, SMS operators).',
          'The affected party notifies the other as soon as possible. Deadlines are extended for the duration of such circumstances.',
        ],
      },
      {
        id: 'third-party',
        title: 'Third-party services and links',
        blocks: [
          'The Platform relies on third-party services: hosting and database (Vercel, Supabase), artificial intelligence providers, an SMS service (Eskiz.uz), Telegram, browser push services and Cloudflare. Their operation is governed by their own terms.',
          'The Platform may contain links to third-party websites. The Operator is not responsible for their content or privacy practices.',
        ],
      },
      {
        id: 'disputes',
        title: 'Requests and dispute resolution',
        blocks: [
          `Questions, complaints and claims are sent via ${contact}. Please include the phone number linked to the Account, the order number (if any) and a detailed description of the issue.`,
          'The Operator replies within **15 (fifteen) calendar days** of receiving a request; where further investigation is needed, this may be extended with notice to the User.',
          'Disputes are settled first by negotiation and a written claim. If no agreement is reached, the dispute is heard by the competent court at the Operator’s location under the laws of the Republic of Uzbekistan; a consumer keeps the right to sue in the court of their place of residence where the law allows.',
          'These Terms and all relations arising from them are governed by **the laws of the Republic of Uzbekistan**.',
        ],
      },
      {
        id: 'final',
        title: 'Final provisions',
        blocks: [
          'If any provision of these Terms is held invalid, the remaining provisions remain in force.',
          'The Operator’s failure to exercise a right is not a waiver of it.',
          'The User may not transfer rights and obligations under these Terms without the Operator’s written consent. The Operator may transfer its rights and obligations to a successor of the Platform with notice to the User.',
          'These Terms are published in Uzbek, Russian and English. In case of discrepancy, **the Uzbek text prevails**.',
          'Electronic messages (Platform notifications, push, SMS, email) are treated as written communications between the parties.',
        ],
      },
      {
        id: 'operator',
        title: 'Operator details and contacts',
        blocks: [
          {
            table: {
              head: ['Item', 'Details'],
              rows: [
                ['Operator', c.operator],
                ['Platform', `${c.brand} — ${c.site}`],
                ...(c.tin ? [['TIN', c.tin]] : []),
                ['Address', c.legalAddress ?? 'Tashkent, Republic of Uzbekistan'],
                ['Contact', c.email ?? 'the “Profile → Support” section of the Platform'],
                ['Hours', 'Monday–Friday, 9:00–18:00 (Tashkent time)'],
              ],
            },
          },
        ],
      },
    ],
  };
}
