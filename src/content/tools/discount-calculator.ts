import type { ToolContent } from '@/content/types';

export const discountCalculatorContent: ToolContent = {
  overviewHeading: 'What this online discount calculator does',
  overview: [
    'This discount calculator helps shoppers and merchants calculate sale prices, net savings, and effective percentage discounts instantly. It supports standard percentage discounts, double/stacked discounts (e.g., 20% off plus an extra 10% off clearance), fixed-amount coupons ($ off / ₹ off), and reverse discount calculations.',
    'It also includes an optional sales tax calculation, allowing you to see the exact out-of-pocket register total after applying both the discount and your local sales tax or VAT.',
    'All calculations happen in real time inside your browser. No personal shopping lists or retail budgets are uploaded or tracked.',
  ],
  howTo: {
    heading: 'How to calculate sale prices and savings',
    intro: 'Find your final price and exact savings in seconds.',
    steps: [
      {
        name: 'Select your discount calculation type',
        text: 'Choose Standard Discount (% off), Stacked Discounts (multiple coupons), Fixed Off ($/₹ off), or Reverse Discount (find original price).',
      },
      {
        name: 'Enter original sticker price',
        text: 'Type in the regular retail price before any sales or markdown reductions.',
      },
      {
        name: 'Enter discount percentage or amount',
        text: 'Type the discount percentage (e.g. 25%) or coupon dollar amount.',
      },
      {
        name: 'Add sales tax if applicable',
        text: 'Optionally toggle sales tax to compute the final register total including local tax or VAT.',
      },
      {
        name: 'View final price and total saved',
        text: 'Review the final discounted price per unit, total savings, and total bill across multiple item quantities.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this discount calculator',
    intro: 'Designed for smart shoppers, retail managers, and e-commerce sellers.',
    items: [
      {
        title: 'Multi-coupon stacked discounts',
        text: 'Accurately calculates compound discounts (e.g. 30% storewide sale + 10% loyalty coupon) without mathematical errors.',
      },
      {
        title: 'Integrated sales tax calculations',
        text: 'Calculates the real final register cost after discounts and post-discount sales taxes are applied.',
      },
      {
        title: 'Reverse discount lookup',
        text: 'Given a clearance sale tag and discount percentage, find the original retail price before the markdown.',
      },
      {
        title: 'Quantity multiplier support',
        text: 'Compute bulk purchasing savings across multiple units with automatic total price aggregation.',
      },
      {
        title: '100% private and ad-safe',
        text: 'No shopping habits, prices, or budgets are sent to third-party ad networks or tracking servers.',
      },
    ],
  },
  privacy: {
    heading: 'Your budget and pricing calculations stay private',
    paragraphs: [
      'Commercial shopping tools often monitor consumer price queries to profile purchasing intent and sell data to affiliate ad networks.',
      'ToolForForever evaluates all discount math entirely within your local browser sandbox. No server requests are triggered when you calculate discounts.',
      'Your pricing calculations are never recorded or monetized.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Stacked discounts are applied sequentially: a $100 item with 20% + 10% off becomes $80, then $72 (an effective 28% discount, not 30%).',
      'Sales tax is typically levied on the discounted sale price rather than the original manufacturer suggested retail price (MSRP).',
      'Fixed-amount coupons ($10 off) deliver a much higher effective percentage discount on low-cost items than expensive items.',
      'Reverse discounts help determine if an advertised "original" price is genuine or artificially marked up.',
    ],
  },
  faqs: [
    {
      question: 'How do you calculate a 20% discount on an item?',
      answer:
        'Multiply the original price by 0.20 to find the savings amount, then subtract that amount from the original price. For example, on a $50 item, the savings is $10 and the final price is $40.',
    },
    {
      question: 'How do stacked discounts (e.g. 20% + 10% off) work?',
      answer:
        'Stacked discounts are calculated sequentially, not added together. On a $100 item, 20% off reduces the price to $80. The additional 10% is taken from $80 ($8 savings), giving a final price of $72 (28% total discount, not 30%).',
    },
    {
      question: 'Is sales tax applied before or after the discount?',
      answer:
        'In most jurisdictions, sales tax is applied after manufacturer discounts and store markdowns are deducted from the retail price.',
    },
    {
      question: 'What is a reverse discount calculation?',
      answer:
        'Reverse discount determines the original price when you only know the final sale price and the discount percentage: Original Price = Sale Price / (1 - Discount/100).',
    },
    {
      question: 'Can this tool calculate bulk item discounts?',
      answer:
        'Yes. Enter the item quantity and the calculator will multiply both the per-unit savings and the final price by your specified quantity.',
    },
    {
      question: 'Does this calculator support international currencies?',
      answer:
        'Yes. You can use the calculator with dollars ($), euros (€), pounds (£), rupees (₹), or any other numerical currency.',
    },
  ],
};
