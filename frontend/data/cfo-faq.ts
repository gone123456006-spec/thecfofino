/**
 * Preloaded CFO Assistant FAQ: Finovert product Q&A.
 * Used to match user questions and return relevant answers.
 */

export type FAQItem = {
  id: number;
  question: string;
  answer: string;
  keywords: string[]; // for matching user queries
};

export const CFO_FAQ: FAQItem[] = [
  {
    id: 1,
    question: 'What is Finovert?',
    answer:
      'Finovert is an AI-powered Virtual CFO platform for businesses. It manages company registration, compliance, tax filing, accounting, financing, and financial planning — all in one app.',
    keywords: ['what is finovert', 'finovert', 'virtual cfo', 'platform'],
  },
  {
    id: 2,
    question: 'Who is Finovert designed for?',
    answer:
      'Finovert is built for startups, MSMEs, freelancers, agencies, D2C brands, and growing businesses. Anyone running a business and needing structured financial management can use it.',
    keywords: ['who is finovert for', 'designed for', 'startups', 'msme', 'freelancers', 'agencies', 'd2c'],
  },
  {
    id: 3,
    question: 'Is Finovert only for startups?',
    answer:
      'No. It supports businesses from the idea stage to scaling enterprises with complex financial needs.',
    keywords: ['only for startups', 'startups only', 'enterprise'],
  },
  {
    id: 4,
    question: 'Does Finovert operate across India?',
    answer: 'Yes. All services are aligned with Indian tax and corporate regulations.',
    keywords: ['india', 'operate', 'pan india', 'indian'],
  },
  {
    id: 5,
    question: 'Is Finovert a replacement for a CA?',
    answer:
      'No. Finovert combines AI automation with certified professionals to ensure accuracy and compliance.',
    keywords: ['replacement for ca', 'chartered accountant', 'ca', 'replace ca'],
  },
  // Company Registration & Compliance
  {
    id: 6,
    question: 'Can I register a Private Limited company through Finovert?',
    answer: 'Yes. The app guides you through documentation and manages the complete registration process.',
    keywords: ['private limited', 'company registration', 'pvt ltd', 'register company'],
  },
  {
    id: 7,
    question: 'Does Finovert support LLP registration?',
    answer: 'Yes. You can initiate LLP formation directly within the app.',
    keywords: ['llp', 'llp registration', 'limited liability partnership'],
  },
  {
    id: 8,
    question: 'Can I register an OPC (One Person Company)?',
    answer: 'Yes. Finovert supports OPC registration with minimal paperwork handling.',
    keywords: ['opc', 'one person company', 'single person company'],
  },
  {
    id: 9,
    question: 'Does Finovert assist with GST registration?',
    answer: 'Yes. You can apply and track GST registration status from your dashboard.',
    keywords: ['gst registration', 'register gst', 'gst apply'],
  },
  {
    id: 10,
    question: 'Can I get MSME (Udyam) registration done?',
    answer: 'Yes. The process is streamlined to ensure quick submission and approval tracking.',
    keywords: ['msme', 'udyam', 'udyam registration', 'msme registration'],
  },
  {
    id: 11,
    question: 'Does Finovert handle ROC filings?',
    answer: 'Yes. Annual ROC returns and compliance filings are managed through reminders and expert support.',
    keywords: ['roc', 'roc filing', 'roc returns', 'registrar of companies'],
  },
  {
    id: 12,
    question: 'Will I receive compliance deadline alerts?',
    answer: 'Yes. Automated notifications ensure you never miss a filing deadline.',
    keywords: ['compliance', 'deadline', 'alerts', 'reminders', 'notifications'],
  },
  {
    id: 13,
    question: 'Can I track filing status in real time?',
    answer: 'Yes. The dashboard provides live updates on application and filing progress.',
    keywords: ['track', 'filing status', 'real time', 'dashboard', 'progress'],
  },
  {
    id: 14,
    question: 'Does Finovert manage annual returns?',
    answer: 'Yes. It ensures proper documentation and timely submission.',
    keywords: ['annual returns', 'annual filing', 'returns'],
  },
  {
    id: 15,
    question: 'Can I upload and store documents securely?',
    answer: 'Yes. Documents are encrypted and stored securely in the cloud.',
    keywords: ['upload', 'documents', 'store', 'secure', 'cloud'],
  },
  // Tax & Accounting
  {
    id: 16,
    question: 'Does Finovert file GST returns?',
    answer: 'Yes. Monthly, quarterly, and annual GST returns are handled professionally.',
    keywords: ['gst return', 'gst filing', 'file gst', 'gst returns'],
  },
  {
    id: 17,
    question: 'Does it handle Income Tax filing?',
    answer: 'Yes. Both business and applicable personal tax filings are supported.',
    keywords: ['income tax', 'itr', 'tax filing', 'income tax filing'],
  },
  {
    id: 18,
    question: 'Can Finovert manage TDS compliance?',
    answer: 'Yes. TDS calculations, filings, and reporting are automated.',
    keywords: ['tds', 'tds compliance', 'tds filing', 'tds calculation'],
  },
  {
    id: 19,
    question: 'Does it provide bookkeeping services?',
    answer: 'Yes. Daily transactions are recorded and categorized properly.',
    keywords: ['bookkeeping', 'books', 'accounting', 'transactions'],
  },
  {
    id: 20,
    question: 'Can I generate financial statements?',
    answer: 'Yes. You can access Profit & Loss, Balance Sheet, and Cash Flow reports anytime.',
    keywords: ['financial statements', 'p&l', 'balance sheet', 'cash flow', 'reports'],
  },
  {
    id: 21,
    question: 'Can I monitor my tax liabilities?',
    answer: 'Yes. The app shows real-time tax payable estimates.',
    keywords: ['tax liability', 'tax payable', 'monitor tax'],
  },
  {
    id: 22,
    question: 'Does Finovert reconcile bank statements?',
    answer: 'Yes. Bank transactions can be matched with books for accuracy.',
    keywords: ['reconcile', 'bank statement', 'bank reconciliation'],
  },
  {
    id: 23,
    question: 'Can I manage payroll compliance?',
    answer: 'Yes (in advanced plans). It handles salary structuring, TDS, and statutory deductions.',
    keywords: ['payroll', 'salary', 'payroll compliance', 'statutory'],
  },
  {
    id: 24,
    question: 'Does it calculate advance tax automatically?',
    answer: 'Yes. AI estimates advance tax based on your revenue trends.',
    keywords: ['advance tax', 'advance tax calculation'],
  },
  {
    id: 25,
    question: 'Can I download reports anytime?',
    answer: 'Yes. All reports are downloadable in shareable formats.',
    keywords: ['download', 'reports', 'export'],
  },
  // Cash Flow & Financing
  {
    id: 26,
    question: 'What is invoice financing in Finovert?',
    answer:
      'It allows you to unlock cash against unpaid invoices. You receive funds without waiting for customer payments.',
    keywords: ['invoice financing', 'invoice funding', 'unpaid invoices', 'cash against invoice'],
  },
  {
    id: 27,
    question: 'How quickly can I receive invoice financing funds?',
    answer: 'Approval depends on eligibility and partners. Finovert speeds up documentation and evaluation.',
    keywords: ['invoice financing', 'how quickly', 'funds', 'approval time'],
  },
  {
    id: 28,
    question: 'Does Finovert help with business loans?',
    answer: 'Yes. It connects you with lending partners after assessing eligibility.',
    keywords: ['business loan', 'loan', 'lending', 'financing'],
  },
  {
    id: 29,
    question: 'Can I check loan eligibility instantly?',
    answer: 'Yes. AI analyzes your financial data to estimate approval chances.',
    keywords: ['loan eligibility', 'eligibility', 'check loan'],
  },
  {
    id: 30,
    question: 'Does Finovert provide working capital planning tools?',
    answer: 'Yes. It forecasts cash flow gaps and suggests improvements.',
    keywords: ['working capital', 'cash flow', 'planning', 'forecast'],
  },
  {
    id: 31,
    question: 'Can I track receivables and payables?',
    answer: 'Yes. You can monitor who owes you and what you owe in one place.',
    keywords: ['receivables', 'payables', 'track', 'dues'],
  },
  {
    id: 32,
    question: 'Does Finovert provide a financial health score?',
    answer: 'Yes. The score reflects liquidity, compliance status, and profitability.',
    keywords: ['financial health', 'health score', 'score'],
  },
  {
    id: 33,
    question: 'Can I forecast revenue growth?',
    answer: 'Yes. AI-based projections are generated using historical trends.',
    keywords: ['revenue', 'forecast', 'growth', 'projection'],
  },
  {
    id: 34,
    question: 'Does it help reduce cash flow gaps?',
    answer: 'Yes. Alerts and financing options help maintain liquidity.',
    keywords: ['cash flow', 'cash flow gap', 'liquidity'],
  },
  {
    id: 35,
    question: 'Can I manage multiple funding sources?',
    answer: 'Yes. Advanced plans allow integration of loans and credit lines.',
    keywords: ['funding', 'multiple', 'loans', 'credit line'],
  },
  // Technology & Security
  {
    id: 36,
    question: 'Is my business data secure?',
    answer: 'Yes. Bank-grade encryption protects all financial information.',
    keywords: ['secure', 'security', 'data', 'encryption', 'privacy'],
  },
  {
    id: 37,
    question: 'Does Finovert use AI technology?',
    answer: 'Yes. AI automates calculations, predictions, and financial insights.',
    keywords: ['ai', 'artificial intelligence', 'automation', 'technology'],
  },
  {
    id: 38,
    question: 'Can I access Finovert on mobile and desktop?',
    answer: 'Yes. The platform is accessible across devices.',
    keywords: ['mobile', 'desktop', 'app', 'access', 'devices'],
  },
  {
    id: 39,
    question: 'Is my data shared without consent?',
    answer: 'No. Data is shared only with authorized partners when required.',
    keywords: ['data shared', 'consent', 'privacy', 'data sharing'],
  },
  {
    id: 40,
    question: 'Does Finovert integrate with other tools?',
    answer: 'Yes (depending on plan). Integration options enhance accounting efficiency.',
    keywords: ['integrate', 'integration', 'tools', 'software'],
  },
  // Pricing & Plans
  {
    id: 41,
    question: 'Is Finovert subscription-based?',
    answer: 'Yes. Users pay monthly or annually based on their plan.',
    keywords: ['subscription', 'pricing', 'pay', 'monthly', 'annual'],
  },
  {
    id: 42,
    question: 'Are there multiple pricing tiers?',
    answer: 'Yes. Plans are designed for small, growing, and enterprise businesses.',
    keywords: ['pricing', 'tiers', 'plans', 'enterprise'],
  },
  {
    id: 43,
    question: 'Is a free trial available?',
    answer: 'Yes (if offered). Trial access allows users to explore features before committing.',
    keywords: ['free trial', 'trial', 'demo'],
  },
  {
    id: 44,
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes. Plan flexibility ensures scalability.',
    keywords: ['upgrade', 'downgrade', 'change plan', 'plan change'],
  },
  {
    id: 45,
    question: 'Are there hidden charges?',
    answer: 'No. Pricing is transparent and clearly mentioned.',
    keywords: ['hidden charges', 'hidden cost', 'transparent', 'pricing'],
  },
  // Support & Operations
  {
    id: 46,
    question: 'Do I get expert support?',
    answer: 'Yes. Certified professionals assist with compliance and filings.',
    keywords: ['support', 'expert', 'help', 'assistance'],
  },
  {
    id: 47,
    question: 'Can I chat with support inside the app?',
    answer: 'Yes. In-app chat support ensures quick assistance.',
    keywords: ['chat', 'support', 'in-app', 'customer support'],
  },
  {
    id: 48,
    question: 'How quickly does Finovert respond to queries?',
    answer: 'Response times depend on the plan. Priority support is available in higher tiers.',
    keywords: ['response', 'response time', 'query', 'support time'],
  },
  {
    id: 49,
    question: 'Can I manage multiple businesses under one account?',
    answer: 'Yes (advanced plans). You can switch between entities easily.',
    keywords: ['multiple businesses', 'multiple companies', 'one account', 'entities'],
  },
  {
    id: 50,
    question: 'How do I get started with Finovert?',
    answer:
      'Download the app, create your business profile, choose a plan, and start managing your finances instantly.',
    keywords: ['get started', 'start', 'sign up', 'onboard', 'how to start'],
  },
];

/** Normalize text for matching: lowercase, collapse spaces, remove punctuation. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the best FAQ match for a user message.
 * Returns the FAQ item if score is above threshold, else null.
 */
export function findFAQMatch(userMessage: string): FAQItem | null {
  const normalized = normalize(userMessage);
  if (!normalized || normalized.length < 2) return null;

  const words = normalized.split(' ').filter((w) => w.length > 1);
  let best: { item: FAQItem; score: number } = { item: CFO_FAQ[0], score: 0 };

  for (const faq of CFO_FAQ) {
    const qNorm = normalize(faq.question);
    const aNorm = normalize(faq.answer);
    const combined = `${qNorm} ${aNorm}`;
    const keywordStr = faq.keywords.join(' ');

    let score = 0;
    for (const word of words) {
      if (word.length < 2) continue;
      if (qNorm.includes(word)) score += 3;
      if (keywordStr.includes(word)) score += 2;
      if (aNorm.includes(word)) score += 1;
    }
    // Exact phrase match in question
    if (qNorm.includes(normalized) || normalized.includes(qNorm)) score += 10;
    if (keywordStr.includes(normalized)) score += 5;

    if (score > best.score) best = { item: faq, score };
  }

  const minScore = 2;
  return best.score >= minScore ? best.item : null;
}

/** Get a few suggested questions for the chat UI (e.g. chips). */
export function getSuggestedQuestions(count: number = 6): string[] {
  const indices = [0, 5, 8, 15, 25, 49]; // What is Finovert, CA replacement, GST reg, GST return, Invoice financing, Get started
  return indices.slice(0, count).map((i) => CFO_FAQ[i].question);
}
