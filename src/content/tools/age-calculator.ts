import type { ToolContent } from '@/content/types';

export const ageCalculatorContent: ToolContent = {
  overviewHeading: 'What this exact age calculator does',
  overview: [
    'This online age calculator determines your exact chronological age in years, months, and days from your date of birth to today or any chosen reference date. It accurately accounts for leap years, variable calendar month lengths, and time zone offsets.',
    'Beyond your primary age in years, it breaks down your lifespan into fascinating total milestones: total months lived, total weeks, total days, hours, minutes, and seconds. It also calculates the exact days remaining until your next birthday and reveals your Western zodiac and astrological sign details.',
    'Everything runs instantly inside your browser without page reloads or remote network requests. Your birthdate remains completely confidential and is never saved, tracked, or sent to any analytics service.',
  ],
  howTo: {
    heading: 'How to calculate your exact age',
    intro: 'Determine your chronological age and birthday countdown in a single step.',
    steps: [
      {
        name: 'Enter your date of birth',
        text: 'Select your birth year, month, and day using the calendar input or type it directly.',
      },
      {
        name: 'Select a reference date (optional)',
        text: 'The calculator defaults to today’s date. If you want to know how old you were or will be on a specific future or past date, enter that target date.',
      },
      {
        name: 'Review your exact age breakdown',
        text: 'Instantly view your age in exact years, months, and days along with your next upcoming birthday countdown.',
      },
      {
        name: 'Explore lifespan milestones',
        text: 'Scroll through the cumulative metrics showing your total days, hours, minutes, and seconds lived on earth.',
      },
      {
        name: 'Check astrological & zodiac details',
        text: 'Discover your Western star sign, element, and date range determined by your day and month of birth.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this age calculator',
    intro: 'Built for job applications, official paperwork, passport applications, and curiosity.',
    items: [
      {
        title: 'Precise calendar mathematics',
        text: 'Correctly accounts for February 29th leap years and varying month durations for accurate date difference calculation.',
      },
      {
        title: 'Compare against any target date',
        text: 'Calculate your age as of an upcoming job cutoff date, retirement eligibility day, or historical anniversary.',
      },
      {
        title: 'Next birthday countdown',
        text: 'Shows the exact number of months and days remaining until your next birthday celebration.',
      },
      {
        title: 'Comprehensive time units',
        text: 'Breaks your lifespan down into total months, weeks, days, hours, and minutes for interesting comparisons.',
      },
      {
        title: 'Zero server storage',
        text: 'Your date of birth is personal identifying information. It is processed in your local browser and never logged.',
      },
    ],
  },
  privacy: {
    heading: 'Your date of birth is never logged or stored',
    paragraphs: [
      'Dates of birth are frequently used as verification security questions and identity markers. Many free websites record birthdates and link them with IP addresses or cookies for advertising profiling.',
      'ToolForForever evaluates all date calculations directly in your browser JavaScript environment. No network request is initiated when you calculate your age.',
      'Nothing is stored in browser cookies or transmitted to our servers. When you leave the page, your birthdate is forgotten.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Leap years occur every 4 years (except years divisible by 100 unless also divisible by 400), adding February 29th.',
      'In common legal systems, a person turns a given age on the anniversary of their birth.',
      'Total hours, minutes, and seconds are calculated based on calendar days, assuming 24 hours per day.',
      'You can calculate the age of a company, marriage, pet, or historical event simply by entering the founding date.',
    ],
  },
  faqs: [
    {
      question: 'How does the calculator handle leap years?',
      answer:
        'The calculator uses real calendar mathematics that tracks every leap year (366 days) and common year (365 days) between your birthdate and the reference date, guaranteeing exact precision.',
    },
    {
      question: 'Can I calculate my age on a specific date in the future?',
      answer:
        'Yes. Change the "Age at the date of" field to any future date to find out exactly how old you will be for retirement, driving eligibility, or insurance requirements.',
    },
    {
      question: 'Why do different age calculators sometimes give different days?',
      answer:
        'Some simple calculators approximate every month as 30 or 30.4 days, creating errors of 1 to 3 days. ToolForForever calculates exact calendar months based on the true number of days in each specific calendar month.',
    },
    {
      question: 'Is my birthdate saved or shared?',
      answer:
        'No. Your birthdate stays entirely in your browser’s temporary memory. Nothing is transmitted over the internet or saved.',
    },
    {
      question: 'How is the birthday countdown calculated?',
      answer:
        'The tool determines your next birth anniversary in the current or following year and calculates the exact remaining months and days until that date.',
    },
    {
      question: 'Can this tool calculate the age of a baby in months and days?',
      answer:
        'Yes. For infants and toddlers under one year old, it displays the exact number of months and days since birth.',
    },
  ],
};
