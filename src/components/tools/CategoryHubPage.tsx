import Link from 'next/link';

import { Container } from '@/components/common/Container';
import { ToolCard } from '@/components/common/ToolCard';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { AdSlot } from '@/components/ads/AdSlot';
import { AD_SLOTS } from '@/components/tools/ToolPage';

import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { absoluteUrl } from '@/lib/site';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { getToolsByCategory, getRelatedTools } from '@/data/toolRegistry';
import type { CategorySlug } from '@/lib/tools';

/**
 * Category hub page.
 *
 * A Server Component with no client JavaScript. Its job is to give every tool in
 * the category a strong inbound internal link and to target the broad head term
 * that an individual tool page cannot rank for.
 *
 * Each hub carries its own hub-specific prose (not shared boilerplate), a full
 * card grid, cross-links to the other hubs, and the four most-used tools from
 * the rest of the site so the page is never a dead end.
 */
export function CategoryHubPage({ category }: { category: CategorySlug }) {
  const meta = CATEGORY_META[category];
  const tools = getToolsByCategory(category);
  const otherHubs = CATEGORY_ORDER.filter((slug) => slug !== category);
  const crossSell = getRelatedTools(tools[0]?.slug ?? 'create-zip', 4).filter(
    (tool) => tool.category !== category
  );

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Tools', path: '/tools/' },
    { name: meta.navLabel },
  ];

  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({
            path: `/tools/${category}/`,
            name: meta.metaTitle,
            description: meta.metaDescription,
          }),
          breadcrumbSchema(breadcrumbs),
          {
            '@type': 'CollectionPage',
            name: meta.title,
            description: meta.metaDescription,
            url: absoluteUrl(`/tools/${category}/`),
            hasPart: tools.map((tool) => ({
              '@type': 'SoftwareApplication',
              name: tool.name,
              description: tool.tagline,
              applicationCategory: 'UtilitiesApplication',
              isAccessibleForFree: true,
            })),
          },
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-5 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{meta.intro}</p>
          <p className="mt-3 text-sm font-medium text-slate-500">
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'} · all free · nothing uploaded
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </Container>

      <Container>
        <AdSlot slot={AD_SLOTS.hubTop} format="horizontal" />
      </Container>

      <Container className="py-10">
        <div className="prose-toolino max-w-3xl">
          <h2>About these {meta.navLabel.toLowerCase()}</h2>
          {HUB_PROSE[category].map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </Container>

      <Container className="pb-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Other categories</h2>
            <ul className="mt-4 space-y-3">
              {otherHubs.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/tools/${slug}/`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
                  >
                    <span className="block text-sm font-semibold text-slate-900">
                      {CATEGORY_META[slug].title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {CATEGORY_META[slug].metaDescription.slice(0, 96)}…
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {crossSell.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-slate-900">You might also need</h2>
              <ul className="mt-4 space-y-3">
                {crossSell.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}/`}
                      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
                    >
                      <span className="block text-sm font-semibold text-slate-900">{tool.name}</span>
                      <span className="mt-1 block text-xs text-slate-600">{tool.tagline}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </Container>
    </>
  );
}

/**
 * Hub-specific prose. Written per category rather than generated, because these
 * paragraphs are the part of a hub page that has to be genuinely useful.
 */
const HUB_PROSE: Record<CategorySlug, string[]> = {
  'file-tools': [
    'File and archive tools solve a problem that has nothing to do with file formats: getting a group of things from one place to another as a single unit. An archive is the standard answer, because it preserves names, timestamps and directory structure while optionally making the whole bundle smaller.',
    'The two tools here cover the complete cycle. Create ZIP packs any mixture of file types, including a whole folder tree, into one archive, choosing sensible compression per file rather than applying the same setting to everything. Extract ZIP opens an archive, lists what is inside with sizes, and lets you pull out individual files without unpacking the lot.',
    'Both are built for large jobs. Archives are produced in a Web Worker so the page stays responsive, and where the browser supports it the archive is streamed straight to your disk instead of being assembled in memory first. That is what makes it practical to zip a folder of several gigabytes on a laptop with 4 GB of RAM.',
  ],
  'pdf-tools': [
    'PDF is a container format, not a document format in the way a Word file is. A PDF holds page objects, embedded fonts and images, and a set of instructions for drawing them. That structure is why most edits to a PDF are cheap and lossless: moving, copying, deleting or rotating a page rearranges references to existing objects without re-encoding any content.',
    'The tools here split into two groups. The lossless group - merge, split, rotate, organise, watermark, page numbers - works directly on the page tree with PDF-LIB and never touches the pixels, so output quality is bit-for-bit identical to the input. The re-encoding group is smaller: compress PDF rasterises image content at a chosen quality, and PDF to Image renders pages to bitmaps. Both deliberately trade some quality for a smaller or differently-shaped result.',
    'This matters when you are handling documents that have to remain legally or professionally intact. Rotating a scan back to upright, or stamping a contract as a draft, does not alter the underlying text or the embedded images at all. Compression does alter them, which is why it is the one tool in this category that warns you about quality before you run it.',
    'Every one of these tools operates on your own device. That is not incidental for this category: the documents people most often want to merge, split or redact are contracts, invoices, medical letters and identity documents, which are exactly the files that should not be passing through an unknown server.',
  ],
  'image-tools': [
    'Images are where file size and quality fight each other hardest, and where the right answer depends entirely on what the picture is. A screenshot of a user interface is mostly flat colour and sharp text, so it compresses extremely well as PNG. A photograph is continuous tone, so it compresses far better as JPEG or WebP and looks terrible as PNG.',
    'The tools here let you make that decision explicitly rather than accepting a default. Compress Image works by quality level or by an exact target file size, using real encoder output to search for settings rather than guessing from a table. Resize Image changes dimensions by pixels, percentage or a preset, with aspect-ratio locking and high-quality step-down resampling. Convert Image moves between JPEG, PNG, WebP and AVIF with control over transparency and quality.',
    'Two tools go further. Remove Background runs a segmentation model locally to cut a subject out of a photo and export a transparent PNG. Image to Text runs optical character recognition on a photo, screenshot or scan and gives you editable text.',
    'There is a privacy reason this category exists as a browser tool rather than an upload service. Photographs carry EXIF metadata that frequently includes the GPS coordinates where the picture was taken, along with the device model and an exact timestamp. Re-encoding an image through a canvas drops that metadata, and doing the re-encoding locally means the original never leaves your machine in the first place.',
  ],
  'text-tools': [
    'These are the tools that do not involve files at all, or barely do: counting, checking and formatting text, and turning text into a QR code. They are small, they are fast, and they are the ones people keep open in a tab all day.',
    'Word Counter gives live counts of words, characters, sentences and paragraphs as you type or paste, with estimated reading and speaking time, plus keyword density for anyone writing for search. JSON Formatter validates a document and reports the exact position of a syntax error, then formats or minifies it and shows you how much space the change saved. QR Code Generator produces static codes for links, Wi-Fi networks, contact cards, email, SMS and phone numbers, exportable as PNG or SVG.',
    'The reason these run locally is not primarily about performance. Unpublished writing, draft legal text, API responses and configuration files routinely contain material that should not be pasted into a third-party service. Keeping the parsing and counting in your own browser removes the question entirely.',
  ],
  calculators: [
    'Everyday arithmetic that is easy to get subtly wrong: how many days old you are, what a percentage change actually is, what a loan really costs, how a stacked discount compounds, and how a tax-inclusive price breaks down.',
    'Each calculator here shows the formula it used, not just the answer. That is deliberate. A percentage change calculated against the wrong baseline, or an EMI computed with a monthly rather than annual rate, produces a plausible number that is simply incorrect, and being able to see the working is what lets you catch it.',
    'The EMI calculator produces a full amortization schedule showing how each instalment splits between interest and principal, which is usually the point people are actually trying to understand: how much of the early payments is interest. The GST calculator splits tax into CGST and SGST for intra-state supplies or a single IGST figure for inter-state ones.',
    'None of these tools stores what you type. Financial figures and dates of birth are among the more sensitive things people enter into a website, and there is no reason for a calculator to remember any of it.',
  ],
};
