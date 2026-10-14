export type Job = {
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  /** One line shown on the card */
  teaser: string;
  /** "What this job is": shown first in the detail window */
  summary: string;
  responsibilities: string[];
  requirements: string[];
  offer: string[];
};

/**
 * ✏️ EDIT HERE to change the openings.
 * To close a role, delete its block. To add one, copy a block and give it a new unique `slug`.
 *
 * DRAFT: these descriptions are written as sensible starting points. The live career page on
 * tayscientific.com.my loads its job text with a script, so it could not be copied. Replace anything
 * that does not match what you are really hiring for.
 */
export const jobs: Job[] = [
  {
    slug: "sales-executive",
    title: "Sales Executive",
    department: "Sales",
    location: "Johor Bahru, Johor",
    type: "Full-time",
    teaser: "Grow our customer base across labs, schools and industry.",
    summary:
      "You will be the first point of contact for customers who need laboratory instruments, consumables and chemicals. You find new customers, understand what their lab needs, and turn that into quotations and orders.",
    responsibilities: [
      "Find and follow up new customers in universities, schools, industry and testing labs.",
      "Prepare quotations and follow them up until the order is confirmed.",
      "Visit customers, understand their needs and recommend suitable products and brands.",
      "Work with the store, operations and service teams so orders are delivered on time.",
      "Keep customer records and sales reports up to date.",
    ],
    requirements: [
      "Diploma or degree in Science, Chemistry, Business or a related field.",
      "Experience in laboratory or scientific supply sales is an advantage; fresh graduates are welcome to apply.",
      "Good communication skills in English and Bahasa Malaysia. Mandarin is an advantage.",
      "Comfortable with MS Office and willing to travel within Johor and nearby states.",
      "Own transport and a valid driving licence.",
    ],
    offer: [
      "Basic salary with sales commission, based on experience.",
      "Product training on the brands we carry.",
      "EPF and SOCSO contributions.",
      "Clear room to grow into senior sales roles.",
    ],
  },
  {
    slug: "account-executive",
    title: "Account Executive",
    department: "Finance & Accounts",
    location: "Johor Bahru, Johor",
    type: "Full-time",
    teaser: "Keep invoices, payments and company accounts accurate.",
    summary:
      "You will look after the day-to-day accounts of the company: customer invoices, supplier bills, payments and month-end records, so that our books are always accurate and up to date.",
    responsibilities: [
      "Prepare invoices, credit notes and statements for customers.",
      "Record supplier bills and process payments on time.",
      "Follow up outstanding customer payments.",
      "Reconcile bank and supplier accounts each month.",
      "Support the monthly closing, audit and tax submissions.",
    ],
    requirements: [
      "Diploma or degree in Accounting, Finance or a related field.",
      "At least 1 year of accounting experience is preferred.",
      "Working knowledge of an accounting software and MS Excel.",
      "Careful, organised and able to meet deadlines.",
      "Good English and Bahasa Malaysia.",
    ],
    offer: [
      "Fixed monthly salary, based on experience.",
      "EPF and SOCSO contributions.",
      "Training and support from a friendly accounts team.",
      "Stable, regular Monday to Friday working hours.",
    ],
  },
  {
    slug: "operation-executive",
    title: "Operation Executive",
    department: "Operations",
    location: "Johor Bahru, Johor",
    type: "Full-time",
    teaser: "Make sure every order is processed and delivered on time.",
    summary:
      "You will coordinate the work between sales, the store and our suppliers so that orders are ordered, received and delivered correctly and on time. You keep the process moving and solve problems before customers notice them.",
    responsibilities: [
      "Process confirmed sales orders and place purchase orders with suppliers.",
      "Track shipments and update the sales team and customers on delivery dates.",
      "Arrange import documents and local delivery with forwarders and couriers.",
      "Keep stock and order records accurate.",
      "Handle order issues, returns and delays with suppliers and customers.",
    ],
    requirements: [
      "Diploma or degree in Business, Logistics, Supply Chain or a related field.",
      "Experience in purchasing, logistics or order processing is an advantage.",
      "Good with details and able to handle several orders at once.",
      "Good communication skills and comfortable with MS Office.",
      "Able to work with different teams.",
    ],
    offer: [
      "Fixed monthly salary, based on experience.",
      "EPF and SOCSO contributions.",
      "Hands-on learning about scientific products and imports.",
      "Opportunity to grow into a senior operations role.",
    ],
  },
  {
    slug: "store-assistant",
    title: "Store Assistant",
    department: "Store & Warehouse",
    location: "Johor Bahru, Johor",
    type: "Full-time",
    teaser: "Receive, pack and keep our laboratory stock in order.",
    summary:
      "You will keep our store organised and make sure the right products are received, stored, packed and ready for delivery. Care with handling is important, as many of our products are glassware, chemicals and instruments.",
    responsibilities: [
      "Receive and check incoming goods against delivery orders.",
      "Store products safely and keep the store neat and labelled.",
      "Pick, pack and prepare orders for delivery or customer collection.",
      "Do regular stock checks and report differences.",
      "Follow safe handling rules for chemicals and fragile items.",
    ],
    requirements: [
      "SPM or above.",
      "Experience in a store or warehouse is an advantage.",
      "Able to lift and move stock safely.",
      "Honest, careful and willing to learn.",
      "Valid driving licence is an advantage.",
    ],
    offer: [
      "Fixed monthly salary.",
      "EPF and SOCSO contributions.",
      "Training on safe handling of laboratory products.",
      "Stable, regular working hours.",
    ],
  },
  {
    slug: "service-engineer",
    title: "Service Engineer",
    department: "Technical Service",
    location: "Johor Bahru, Johor",
    type: "Full-time",
    teaser: "Install, calibrate and repair laboratory equipment.",
    summary:
      "You will install, maintain, calibrate and repair laboratory instruments at customer sites and in our workshop, so that our customers' equipment keeps running accurately.",
    responsibilities: [
      "Install equipment and train customers to use it.",
      "Carry out calibration and preventive maintenance.",
      "Diagnose faults and repair instruments on site or in the workshop.",
      "Record every service job and report back to the service team.",
      "Give technical support to customers and to the sales team.",
    ],
    requirements: [
      "Diploma or degree in Electrical, Electronics, Mechanical, Mechatronics or a related field.",
      "Experience with laboratory or electronic equipment is an advantage.",
      "Able to read technical manuals and troubleshoot step by step.",
      "Willing to travel to customer sites.",
      "Own transport and a valid driving licence.",
    ],
    offer: [
      "Fixed monthly salary with allowances for site work.",
      "Product and service training.",
      "EPF and SOCSO contributions.",
      "Opportunity to grow as a technical specialist.",
    ],
  },
  {
    slug: "admin-customer-service",
    title: "Admin Customer Service",
    department: "Customer Service",
    location: "Johor Bahru, Johor",
    type: "Full-time",
    teaser: "Be the friendly voice and inbox customers reach first.",
    summary:
      "You will answer customer calls, emails and WhatsApp messages, prepare quotations with the sales team and keep our admin work running smoothly. You are the first person many customers speak to.",
    responsibilities: [
      "Reply to customer enquiries by phone, email and WhatsApp.",
      "Prepare quotations and documents for the sales team.",
      "Keep customer and order records up to date.",
      "Follow up with customers on quotations, deliveries and service jobs.",
      "Support the team with general office administration.",
    ],
    requirements: [
      "SPM, Diploma or degree in any field.",
      "Good communication skills in English and Bahasa Malaysia. Mandarin is an advantage.",
      "Comfortable with MS Office and typing.",
      "Polite, patient and organised.",
      "Fresh graduates are welcome to apply.",
    ],
    offer: [
      "Fixed monthly salary, based on experience.",
      "EPF and SOCSO contributions.",
      "On-the-job training about our products and services.",
      "Stable, regular Monday to Friday working hours.",
    ],
  },
];
