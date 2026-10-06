import type { ToolContent } from '@/content/types';

export const emiCalculatorContent: ToolContent = {
  overviewHeading: 'What this loan EMI calculator does',
  overview: [
    'This loan EMI (Equated Monthly Installment) calculator computes estimated monthly loan repayments, total interest payable, and overall loan cost for home loans, car loans, personal loans, and education loans. It uses the standard reducing-balance amortization method utilized by banks and commercial lenders worldwide.',
    'It provides both monthly and yearly amortization schedules, illustrating how each monthly payment is split between principal repayment and interest charges over the full loan tenure.',
    'All calculations happen locally in your browser. Unlike banking portals that require your phone number or email before showing repayment estimates, Toolino requires zero personal data, login, or phone number.',
  ],
  howTo: {
    heading: 'How to calculate your monthly loan EMI',
    intro: 'Plan your loan repayments and compare banking interest rates in minutes.',
    steps: [
      {
        name: 'Select your loan category',
        text: 'Choose Home Loan, Car Loan, Personal Loan, Education Loan, or Custom to preload sensible interest and tenure defaults.',
      },
      {
        name: 'Enter your principal loan amount',
        text: 'Enter the total amount of money you want to borrow from the lending institution.',
      },
      {
        name: 'Set the annual interest rate',
        text: 'Type the annual percentage rate (APR) offered by your lender, supporting decimal rates like 8.65%.',
      },
      {
        name: 'Specify loan tenure',
        text: 'Enter the duration of the loan in years or total months.',
      },
      {
        name: 'Analyze your repayment schedule',
        text: 'Review the monthly EMI amount, total interest paid, principal-to-interest ratio, and the yearly balance breakdown.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this private EMI calculator',
    intro: 'Built for home buyers, vehicle purchasers, students, and financial planners.',
    items: [
      {
        title: 'Standard reducing-balance formula',
        text: 'Uses the standard reducing-balance mathematical formula utilized by commercial banks and mortgage lenders.',
      },
      {
        title: 'Complete amortization breakdown',
        text: 'View year-by-year and month-by-month tables showing remaining balance, principal repaid, and interest paid.',
      },
      {
        title: 'Zero spam calls or leads',
        text: 'We never ask for your mobile phone number, email address, or identity. No unsolicited sales calls.',
      },
      {
        title: 'Interest vs principal visual breakdown',
        text: 'See what percentage of your total payment goes toward principal versus financing interest.',
      },
      {
        title: 'Instant comparison across terms',
        text: 'Adjust interest rates and loan tenure sliders to find the sweet spot between monthly affordability and total interest cost.',
      },
    ],
  },
  privacy: {
    heading: 'Your loan calculations are completely confidential',
    paragraphs: [
      'Financial lead generation websites routinely capture loan amounts, loan types, and IP addresses to sell as qualified borrower leads to banks and credit brokers, triggering aggressive telemarketing calls.',
      'Toolino does not collect, record, or transmit your financial calculations. All mathematical algorithms execute inside your web browser’s JavaScript engine.',
      'Your borrowing plans remain strictly confidential.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'In a reducing-balance loan, early monthly payments consist largely of interest, while later payments consist mostly of principal.',
      'Opting for a shorter loan tenure increases monthly EMI but dramatically reduces the total interest paid over the life of the loan.',
      'Prepaying or making extra lump-sum payments toward your principal directly reduces the remaining loan balance and total tenure.',
      'Calculations are estimates for planning purposes. Actual lender figures may vary slightly due to processing fees, statutory taxes, insurance, rounding rules, or specific day-count conventions.',
    ],
  },
  faqs: [
    {
      question: 'What is the formula for calculating loan EMI?',
      answer:
        'The formula is: EMI = [P x R x (1+R)^N] / [(1+R)^N - 1], where P is Principal loan amount, R is monthly interest rate (annual rate / 12 / 100), and N is the number of monthly installments.',
    },
    {
      question: 'What is the difference between flat interest rate and reducing balance rate?',
      answer:
        'A flat rate calculates interest on the full original principal throughout the loan tenure. A reducing-balance rate calculates interest only on the remaining outstanding principal as you pay it down. Reducing balance is the standard used by reputable mortgage and banking institutions.',
    },
    {
      question: 'How does loan tenure affect total interest?',
      answer:
        'A longer tenure lowers your monthly payment because repayment is spread over more months, but significantly increases the total interest you pay over the loan life. A shorter tenure has a higher EMI but minimizes total interest.',
    },
    {
      question: 'Can I calculate loans with zero percent interest?',
      answer:
        'Yes. For 0% promotional financing, the monthly payment is simply the total principal divided by the number of repayment months, with zero interest.',
    },
    {
      question: 'Does this calculator save my financial inputs?',
      answer:
        'No. All calculations run strictly in your web browser. No data is stored, saved to cookies, or sent to any server.',
    },
    {
      question: 'What is an amortization schedule?',
      answer:
        'An amortization schedule is a complete table showing every scheduled loan payment, detailing how much of each payment goes toward paying down the principal loan balance and how much pays interest.',
    },
  ],
};
