import type { ToolContent } from '@/content/types';

export const gstCalculatorContent: ToolContent = {
  overviewHeading: 'What this online GST calculator does',
  overview: [
    'This online Goods and Services Tax (GST) calculator calculates both inclusive and exclusive GST amounts in seconds. Whether you need to add GST to a base invoice price or extract the net amount and tax portion from a gross total, it handles all standard slabs: 0%, 3%, 5%, 12%, 18%, and 28%, along with custom percentages.',
    'It accurately splits tax amounts into intra-state components (Central GST and State GST, 50/50 split) or inter-state integrated tax (IGST 100%), matching statutory invoicing standards.',
    'Everything runs client-side in your browser. Accountants, business owners, and freelancers can compute invoices and billing figures without exposing corporate sales numbers to third-party servers.',
  ],
  howTo: {
    heading: 'How to calculate GST (Add or Remove GST)',
    intro: 'Calculate tax breakdown and invoice amounts in three simple steps.',
    steps: [
      {
        name: 'Select calculation mode',
        text: 'Choose "Add GST" (Exclusive) to add tax to a net base price, or "Remove GST" (Inclusive) to extract the tax from a gross amount.',
      },
      {
        name: 'Enter your monetary amount',
        text: 'Enter the net price or gross invoice total into the amount field.',
      },
      {
        name: 'Pick your GST tax rate',
        text: 'Select standard rates (0%, 3%, 5%, 12%, 18%, 28%) or type a custom tax percentage.',
      },
      {
        name: 'Select transaction type',
        text: 'Choose Intra-State to split into CGST + SGST (50% each) or Inter-State for 100% IGST.',
      },
      {
        name: 'Review the invoice breakdown',
        text: 'View net base amount, total tax amount, component tax breakdown, and the final invoice total.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this GST calculator',
    intro: 'Engineered for chartered accountants, small business owners, freelancers, and shoppers.',
    items: [
      {
        title: 'Both Add GST & Remove GST modes',
        text: 'Seamlessly toggle between forward markup calculations and reverse tax extraction from gross retail totals.',
      },
      {
        title: 'Intra-state & inter-state tax splitting',
        text: 'Automatically calculates CGST and SGST splits for local sales or IGST for cross-border commercial transactions.',
      },
      {
        title: 'Standard GST tax rate presets',
        text: 'Includes quick-select buttons for 0%, 3%, 5%, 12%, 18%, and 28% tax slabs with category descriptions.',
      },
      {
        title: 'Invoice-ready currency formatting',
        text: 'Formats numbers clearly with standard separators and 2-decimal precision for direct entry into invoicing software.',
      },
      {
        title: 'Complete financial privacy',
        text: 'All invoicing calculations run in your local browser runtime. Zero sales telemetry or ledger logs.',
      },
    ],
  },
  privacy: {
    heading: 'Your invoicing data remains strictly confidential',
    paragraphs: [
      'Business turnover, bill amounts, and transaction sizes are confidential commercial information that should never be leaked to third-party web apps.',
      'Toolino computes all GST calculations directly in your browser. No HTTP requests are sent when you type amounts or change tax rates.',
      'We do not store your invoice figures, customer bill amounts, or tax calculations.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'To add GST (Exclusive): GST Amount = (Base Amount x Rate) / 100; Total = Base Amount + GST Amount.',
      'To remove GST (Inclusive): Base Amount = Total / (1 + Rate / 100); GST Amount = Total - Base Amount.',
      'Intra-state sales within the same state or union territory are split equally between CGST (Central) and SGST (State).',
      'Inter-state transactions between two different states or territories are subject to IGST (Integrated GST) in full.',
    ],
  },
  faqs: [
    {
      question: 'What is the formula to remove GST from a total price?',
      answer:
        'To remove GST from an inclusive total, use: Base Price = Total / (1 + Rate/100). The GST portion is then: GST Amount = Total - Base Price. For example, for $118 at 18% GST: Base = 118 / 1.18 = $100, and GST = $18.',
    },
    {
      question: 'What is the difference between CGST, SGST, and IGST?',
      answer:
        'CGST (Central GST) and SGST (State GST) apply to intra-state sales within the same state, split equally 50/50. IGST (Integrated GST) applies to inter-state sales across state borders and is collected as a single combined tax.',
    },
    {
      question: 'What items fall under different GST rate slabs?',
      answer:
        '0% covers basic fresh food; 3% covers precious metals and jewellery; 5% covers household essentials; 12% covers processed food and electronics; 18% is the standard rate for IT services and restaurants; 28% applies to luxury items and automobiles.',
    },
    {
      question: 'How do I calculate GST on discounted products?',
      answer:
        'GST must always be calculated on the discounted sale price, not the original MRP sticker price. Deduct the discount first, then compute the GST on the net selling price.',
    },
    {
      question: 'Can this calculator be used for international VAT or Sales Tax?',
      answer:
        'Yes. By entering any country’s standard tax rate as a custom percentage, you can use the Add or Remove modes for any VAT, sales tax, or consumption tax worldwide.',
    },
    {
      question: 'Does this calculator store my business calculations?',
      answer:
        'No. All calculations are executed locally in your browser’s JavaScript memory and are never transmitted over the internet or saved.',
    },
  ],
};
