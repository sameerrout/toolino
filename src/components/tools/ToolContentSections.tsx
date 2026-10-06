import type { ToolContent } from '@/content/types';

/**
 * Renders the long-form SEO prose for a tool.
 *
 * A Server Component: the copy ships as static HTML, costs zero client
 * JavaScript, and is what an AdSense reviewer and a search crawler actually
 * read. Ordering is deliberate - what it does, how to use it, why it is good,
 * how it protects you, what it cannot do, then FAQs.
 */
export function ToolContentSections({ content }: { content: ToolContent }) {
  return (
    <div className="prose-toolino">
      <h2>{content.overviewHeading}</h2>
      {content.overview.map((paragraph) => (
        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
      ))}

      <h2>{content.howTo.heading}</h2>
      <p>{content.howTo.intro}</p>
      <ol className="mt-4 space-y-4 pl-0">
        {content.howTo.steps.map((step, index) => (
          <li key={step.name} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
            >
              {index + 1}
            </span>
            <span>
              <strong className="block text-slate-900">{step.name}</strong>
              <span className="mt-0.5 block">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <h2>{content.benefits.heading}</h2>
      <p>{content.benefits.intro}</p>
      <ul className="mt-4 space-y-3">
        {content.benefits.items.map((item) => (
          <li key={item.title} className="list-none">
            <strong className="block text-slate-900">{item.title}</strong>
            <span className="mt-0.5 block">{item.text}</span>
          </li>
        ))}
      </ul>

      <h2>{content.privacy.heading}</h2>
      {content.privacy.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
      ))}

      <h2>{content.goodToKnow.heading}</h2>
      <ul className="mt-4 space-y-2">
        {content.goodToKnow.items.map((item) => (
          <li key={item.slice(0, 40)}>{item}</li>
        ))}
      </ul>

      <h2>Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {content.faqs.map((faq, index) => (
          <details key={faq.question} className="group py-4" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-slate-900">
              <span>{faq.question}</span>
              <span
                aria-hidden="true"
                className="mt-1 shrink-0 text-slate-400 transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[0.9375rem] leading-7 text-slate-700">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
