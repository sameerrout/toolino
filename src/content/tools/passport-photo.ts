import type { ToolContent } from '@/content/types';

export const passportPhotoContent: ToolContent = {
  overviewHeading: 'What this online passport photo maker does',
  overview: [
    'This in-browser passport and visa photo maker is designed to help you prepare passport-style photos using commonly published size requirements for over a dozen international jurisdictions, including US Passport (2x2 inch), UK Passport (35x45 mm), Schengen Visa (35x45 mm), Indian Passport & OCI (35x45 mm / 2x2 in), Canadian Visa, and Australian Passport. Always verify the current photo requirements of the relevant authority before submitting.',
    'It includes intuitive visual positioning tools to align your eyes, chin, and crown of head to published biometric proportions. You can change the photo background to clean white, light grey, or light blue, adjust brightness and contrast, and tile multiple photos onto standard 4x6 inch (10x15 cm) photo paper for convenient printing.',
    'Because identity photos are personal biometric data, this tool processes your image locally in your browser. Your photo is never uploaded to any remote server.',
  ],
  howTo: {
    heading: 'How to prepare passport and visa photos',
    intro: 'Prepare ID photos and printable multi-photo sheets in minutes. Always verify official requirements before submission.',
    steps: [
      {
        name: 'Upload a clear front-facing portrait',
        text: 'Select a photo taken at eye level against a neutral background. Make sure both ears and shoulders are visible with even lighting.',
      },
      {
        name: 'Select your country and document format',
        text: 'Pick your target country specification, such as US Passport (2x2 in), UK Passport (35x45 mm), or Indian Visa.',
      },
      {
        name: 'Align face with biometric guidelines',
        text: 'Zoom, pan, and rotate your image until your eye line and chin fit within the alignment template guides.',
      },
      {
        name: 'Choose background color and adjustments',
        text: 'Select required background color (pure white, off-white, or light blue) and fine-tune brightness and contrast according to authority rules.',
      },
      {
        name: 'Download single photo or printable 4x6 sheet',
        text: 'Export a single high-resolution digital JPG for online submissions, or a 4x6 inch multi-photo sheet with 6-8 photos ready for printing.',
      },
    ],
  },
  benefits: {
    heading: 'Why prepare passport photos with Toolino',
    intro: 'Designed for travellers, applicants, and families preparing passport and visa applications.',
    items: [
      {
        title: 'Local in-browser photo processing',
        text: 'Your photo is processed locally in your browser. Personal portraits are never transmitted to cloud servers or remote facial recognition databases.',
      },
      {
        title: 'Common international size presets',
        text: 'Pre-configured with commonly published millimeter and inch dimensions used by agencies in the US, UK, EU, India, and Canada.',
      },
      {
        title: 'Printable 4x6 inch sheet layout',
        text: 'Automatically arranges 6 to 8 photos onto standard 4x6 inch photo paper so you can print conveniently at local photo kiosks.',
      },
      {
        title: '300 DPI high-resolution export',
        text: 'Produces crisp, print-ready 300 DPI files with standard aspect ratios to help you match published application guidelines.',
      },
      {
        title: 'Instant re-tries with no fees',
        text: 'Take as many photos on your phone as you like until you find the right photo, with zero fees.',
      },
    ],
  },
  privacy: {
    heading: 'Your biometric portrait stays on your device',
    paragraphs: [
      'Facial images are biometric personal data. Many online photo editors upload portraits to remote cloud storage where they can be retained, analyzed, or fed into AI models without explicit user consent.',
      'Toolino processes your portrait entirely within your browser using the HTML5 Canvas API. The image data is decoded into your device’s local memory and processed strictly on your CPU/GPU.',
      'No image data is ever uploaded across the network. When you close the tab, all image buffers are immediately cleared.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Maintain a neutral facial expression with both eyes open, mouth closed, and looking directly into the camera lens.',
      'Avoid wearing white clothing if your required background is white, so your shoulders contrast clearly against the backdrop.',
      'Remove eyeglasses, hats, and head coverings unless worn daily for religious or documented medical purposes.',
      'Ensure lighting is balanced from the front to eliminate harsh shadows behind your head or under your eyes and nose.',
    ],
  },
  faqs: [
    {
      question: 'What size is a standard US passport photo?',
      answer:
        'A standard US passport photo is exactly 2 x 2 inches (51 x 51 mm), with the head height measuring between 1 inch and 1 3/8 inches (25 to 35 mm) from the bottom of the chin to the top of the head.',
    },
    {
      question: 'What size is a UK and European Schengen passport photo?',
      answer:
        'The standard UK and Schengen visa photo size is 35 x 45 mm (width x height), with the face occupying between 70% and 80% of the total photograph height.',
    },
    {
      question: 'How do I print the 4x6 photo sheet?',
      answer:
        'Save the generated 4x6 inch image to your phone or flash drive and print it as a standard 4x6 inch (10x15 cm) borderless photo print at any local pharmacy, grocery store, or home photo printer for a fraction of studio costs.',
    },
    {
      question: 'Will my passport photo be accepted by the relevant authority?',
      answer:
        'This tool is designed to help you prepare photos using commonly published specifications. Acceptance ultimately depends on the reviewing authority, official criteria (lighting, neutral expression, contrast, head coverings), and the current rules in force. Always verify the current photo requirements of the relevant authority before submitting.',
    },
    {
      question: 'Is my facial image saved or stored on any server?',
      answer:
        'No. All cropping, resizing, background adjustments, and tiling take place purely in your web browser. Nothing is uploaded to any server.',
    },
    {
      question: 'Can I use a smartphone selfie for my passport photo?',
      answer:
        'We recommend having someone else take the picture using your phone’s rear camera from about 1.5 to 2 meters away at eye level, rather than a wide-angle selfie which can distort facial proportions.',
    },
  ],
};
