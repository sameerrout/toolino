import type { ToolContent } from '@/content/types';

export const qrCodeGeneratorContent: ToolContent = {
  overviewHeading: 'What this free online QR code generator does',
  overview: [
    'This tool creates high-resolution, scannable QR (Quick Response) codes instantly in your browser. Whether you need a code for your website, Wi-Fi network credentials, contact card (vCard), WhatsApp message, email link, or plain text, it generates crisp vector SVG and pixel-perfect PNG formats.',
    'You have full control over visual appearance: configure custom foreground and background colors, adjust pixel resolution, and select error correction levels from Low (7%) up to High (30%) so your codes remain scannable even if printed on textured materials or partially obscured.',
    'Unlike commercial QR code services that redirect users through tracking shortlinks or expire after a trial period, this tool creates direct static QR codes. Static QR codes do not have an expiration date. However, the information they contain must remain valid.',
  ],
  howTo: {
    heading: 'How to create a custom QR code',
    intro: 'Generating a high-resolution static QR code takes just three steps.',
    steps: [
      {
        name: 'Choose your QR code type',
        text: 'Select the data type you want to encode: Website URL, Wi-Fi login details, vCard contact information, Email, Phone number, SMS, or Plain Text.',
      },
      {
        name: 'Enter your content details',
        text: 'Type your link or text into the input field. For Wi-Fi codes, enter your network name (SSID), password, and encryption type.',
      },
      {
        name: 'Customize colors and error correction',
        text: 'Pick your foreground and background colors. Ensure strong contrast (dark colors on light backgrounds) for reliable camera scanning.',
      },
      {
        name: 'Adjust resolution and margins',
        text: 'Set the output image size and quiet-zone margin so the code is easy for smartphones to isolate and scan from any angle.',
      },
      {
        name: 'Download in PNG or SVG format',
        text: 'Download as high-res PNG for web and digital screens, or export vector SVG for professional print materials, banners, and signage.',
      },
    ],
  },
  benefits: {
    heading: 'Why create QR codes with Toolino',
    intro: 'Designed for business owners, marketers, event organizers, and graphic designers.',
    items: [
      {
        title: 'Static codes without redirect expiration',
        text: 'Static QR codes do not have an expiration date. However, the information they contain must remain valid.',
      },
      {
        title: 'Scalable vector SVG & high-res PNG',
        text: 'Download scalable vector SVG graphics for large displays and print shops, or crisp raster PNGs for mobile screens.',
      },
      {
        title: 'Complete privacy & no telemetry',
        text: 'Your Wi-Fi passwords, contact details, and links are generated inside your browser and never logged or stored.',
      },
      {
        title: 'Four error correction levels',
        text: 'Choose between Low (7%), Medium (15%), Quartile (25%), and High (30%) fault tolerance for maximum durability.',
      },
      {
        title: 'Instant real-time live preview',
        text: 'The QR code matrix re-renders instantaneously as you type, letting you test-scan it with your phone camera on screen.',
      },
    ],
  },
  privacy: {
    heading: 'Your QR code data never touches a server',
    paragraphs: [
      'Many third-party QR code generators route every scan through proprietary redirect servers so they can collect user analytics, serve advertisements, or charge subscription fees to keep the code active.',
      'Toolino produces true static QR codes directly in your browser using pure client-side mathematical algorithms. The data you enter is encoded directly into the black-and-white grid pattern.',
      'We do not capture your Wi-Fi credentials, personal phone numbers, or private URLs. The resulting code belongs completely to you.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Always maintain high contrast between foreground and background; dark foreground patterns on light backgrounds scan most reliably.',
      'High error correction (level H) allows up to 30% of the QR code to be damaged or covered while still remaining fully readable.',
      'Wi-Fi QR codes let visitors connect automatically without having to manually type complex wireless passwords.',
      'Static QR codes directly encode data, meaning the destination URL cannot be edited once the QR code is printed.',
    ],
  },
  faqs: [
    {
      question: 'Do these QR codes expire?',
      answer:
        'Static QR codes do not have an expiration date, because data is encoded directly into the matrix without middleman tracking URLs. However, the destination URL, phone number, Wi-Fi password, or target information encoded in it must remain active.',
    },
    {
      question: 'Can I use these QR codes for commercial projects?',
      answer:
        'Yes. You are completely free to use the generated QR codes for commercial packaging, advertising, menus, signs, flyers, and business cards.',
    },
    {
      question: 'Should I download PNG or SVG?',
      answer:
        'Use PNG for digital displays, websites, emails, and social media. Use SVG for print projects such as brochures, packaging, and banners because vector SVG scales to any size without losing crispness.',
    },
    {
      question: 'How do Wi-Fi QR codes work?',
      answer:
        'When a smartphone camera scans a Wi-Fi QR code, it recognizes the standard WIFI: protocol and prompts the user to join the wireless network with a single tap, entering the password automatically.',
    },
    {
      question: 'What is the optimal size to print a QR code?',
      answer:
        'For business cards and menus, print QR codes at least 2 cm x 2 cm (0.8 in x 0.8 in). For posters and flyers scanned from a distance, follow a 10:1 viewing ratio (e.g. 10 cm wide for scanning from 1 meter away).',
    },
    {
      question: 'Are my entered Wi-Fi passwords or links sent to your server?',
      answer:
        'No. All QR code generation is executed directly within your browser’s JavaScript runtime. Nothing is ever sent to or saved on any server.',
    },
  ],
};
