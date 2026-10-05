import type { ToolContent } from '@/content/types';

export const percentageCalculatorContent: ToolContent = {
  overviewHeading: 'What this multi-function percentage calculator does',
  overview: [
    'This versatile percentage calculator solves seven common percentage questions instantly in your browser: finding a percent of a number, finding what percent one number is of another, percentage increase and decrease, percent change between two values, reversing percentages, and percentage difference.',
    'Each calculation mode includes the mathematical formula and transparent step-by-step working out. This makes it ideal for double-checking financial discounts, corporate markups, sales tax calculations, academic grade percentages, and investment gains.',
    'All arithmetic runs locally in client-side JavaScript. There are no page refreshes, no delays, and no server requests. Values update in real time as you type each digit.',
  ],
  howTo: {
    heading: 'How to calculate percentages and differences',
    intro: 'Select the calculation mode that matches your math problem.',
    steps: [
      {
        name: 'Select your calculation tab',
        text: 'Choose from 7 dedicated modes: Percent Of, What Percent, Percent Change, Percent Increase, Percent Decrease, Reverse Percent, or Percent Difference.',
      },
      {
        name: 'Enter your starting values',
        text: 'Type your numbers into the input boxes. The calculator accepts positive, negative, and decimal values.',
      },
      {
        name: 'View the instant answer',
        text: 'The result displays immediately without having to click a calculate button.',
      },
      {
        name: 'Review the step-by-step working',
        text: 'Inspect the formula and arithmetic steps displayed below the answer to understand how the final number was derived.',
      },
      {
        name: 'Copy or reset calculations',
        text: 'Easily copy results to your clipboard or clear inputs to perform another calculation.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this online percentage tool',
    intro: 'Built for students, accountants, business owners, shoppers, and researchers.',
    items: [
      {
        title: 'Seven specialized calculation modes',
        text: 'Covers every common real-world percentage scenario from retail markdowns to investment growth.',
      },
      {
        title: 'Clear step-by-step math proofs',
        text: 'Shows the exact mathematical equations and working out so students and professionals can verify the logic.',
      },
      {
        title: 'Handles decimals and edge cases',
        text: 'Intelligently manages fractional percentages, negative numbers, and explains zero division clearly.',
      },
      {
        title: 'Real-time responsive updates',
        text: 'Calculates synchronously as you type each digit with zero lag or delay.',
      },
      {
        title: 'Safe from server logging',
        text: 'Financial calculations, salary revisions, and confidential sales figures remain 100% private on your machine.',
      },
    ],
  },
  privacy: {
    heading: 'Your financial and numerical data remains private',
    paragraphs: [
      'Users frequently calculate personal salary increments, confidential company revenues, or sensitive pricing figures using online percentage tools.',
      'Toolino computes all mathematical formulas entirely in your browser memory. We never record your entered values, log your calculations, or transmit figures to remote endpoints.',
      'Your financial privacy is completely protected when using our calculators.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Percentage change reflects the relative change: ((New Value - Old Value) / Old Value) * 100.',
      'Percentage difference compares two numbers when neither is considered the original base value.',
      'Reverse percentage determines the original pre-tax or pre-discount price before a percentage was applied.',
      'A 50% increase followed by a 50% decrease does not return to the original number (e.g., 100 + 50% = 150; 150 - 50% = 75).',
    ],
  },
  faqs: [
    {
      question: 'How do you calculate a percentage of a number?',
      answer:
        'To find X percent of Y, multiply Y by the percentage X, then divide by 100. For example, 15% of 200 is (15 * 200) / 100 = 30.',
    },
    {
      question: 'How do you find the percentage increase between two numbers?',
      answer:
        'Subtract the starting value from the new value, divide the result by the starting value, and multiply by 100. For example, from 50 to 75 is ((75 - 50) / 50) * 100 = 50% increase.',
    },
    {
      question: 'What is the reverse percentage formula?',
      answer:
        'To find the original value after a percentage increase, divide the final value by (1 + percentage/100). For a percentage discount, divide the final value by (1 - percentage/100).',
    },
    {
      question: 'What is the difference between percentage change and percentage difference?',
      answer:
        'Percentage change has a clear chronological direction (old value to new value). Percentage difference compares two values without direction, dividing the absolute difference by the average of the two numbers.',
    },
    {
      question: 'Why does dividing by zero show an error?',
      answer:
        'In mathematics, division by zero is undefined. If the whole or initial value is 0, a relative percentage cannot be calculated.',
    },
    {
      question: 'Can this tool calculate negative percentages?',
      answer:
        'Yes. If a value drops below zero or decreases, the tool correctly reports negative percentages and displays the directional trend clearly.',
    },
  ],
};
