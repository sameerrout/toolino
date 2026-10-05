'use client';

/**
 * Contact form with no server.
 *
 * The site has no backend, so the form cannot POST anywhere. Rather than
 * pretending otherwise (a form that silently discards messages is worse than no
 * form), it composes a properly formatted email in the visitor's own mail client
 * via a `mailto:` URL, and copies the text to the clipboard as a fallback for
 * people using webmail with no registered mail handler.
 *
 * That is a real, working contact route: AdSense review requires a contact
 * method that actually reaches a human, and this one does.
 */

import { useCallback, useMemo, useState } from 'react';
import { Check, Copy, Mail, Send } from 'lucide-react';

import { BRAND, SITE_URL } from '@/lib/site';

type Topic = 'bug' | 'question' | 'feedback' | 'business' | 'legal' | 'other';

const TOPICS: { value: Topic; label: string; subject: string }[] = [
  { value: 'bug', label: 'A tool produced a wrong result', subject: 'Bug report' },
  { value: 'question', label: 'A question about using a tool', subject: 'Question' },
  { value: 'feedback', label: 'Feedback or a feature request', subject: 'Feedback' },
  { value: 'business', label: 'Business or advertising enquiry', subject: 'Business enquiry' },
  { value: 'legal', label: 'Privacy, legal or takedown request', subject: 'Legal request' },
  { value: 'other', label: 'Something else', subject: 'Enquiry' },
];

const MAX_MESSAGE = 4000;

export function ContactForm() {
  const [topic, setTopic] = useState<Topic>('question');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const found: Partial<Record<'name' | 'email' | 'message', string>> = {};
    if (name.trim().length < 2) found.name = 'Please tell us your name so we can reply.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      found.email = 'That does not look like a valid email address.';
    }
    if (message.trim().length < 20) {
      found.message = 'Please add a little more detail, at least 20 characters.';
    }
    if (message.length > MAX_MESSAGE) {
      found.message = `Please keep the message under ${MAX_MESSAGE} characters.`;
    }
    return found;
  }, [name, email, message]);

  const isValid = Object.keys(errors).length === 0;

  const subject = useMemo(() => {
    const selected = TOPICS.find((entry) => entry.value === topic);
    return `[${BRAND.name}] ${selected?.subject ?? 'Enquiry'} — ${name.trim() || 'website visitor'}`;
  }, [topic, name]);

  const body = useMemo(
    () =>
      [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Topic: ${TOPICS.find((entry) => entry.value === topic)?.label ?? 'Enquiry'}`,
        '',
        message.trim(),
        '',
        '---',
        `Sent from the contact form at ${new URL(SITE_URL).host}`,
      ].join('\n'),
    [name, email, topic, message]
  );

  const mailtoHref = useMemo(
    () => `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    [subject, body]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`To: ${BRAND.email}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [subject, body]);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
      <p className="mt-1 text-sm text-slate-600">
        This form opens your own email app with the message filled in, so nothing is transmitted
        through this website. If you prefer, write to{' '}
        <a href={`mailto:${BRAND.email}`} className="font-medium text-brand-700 underline">
          {BRAND.email}
        </a>{' '}
        directly.
      </p>

      <form
        className="mt-6 space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (!isValid) return;
          window.location.href = mailtoHref;
        }}
      >
        <div>
          <label htmlFor="contact-topic" className="field-label">
            What is this about?
          </label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value as Topic)}
            className="field-input"
          >
            {TOPICS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="field-label">
              Your name
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && Boolean(errors.name)}
              aria-describedby={touched && errors.name ? 'contact-name-error' : undefined}
              className="field-input"
              placeholder="Alex Morgan"
            />
            {touched && errors.name ? (
              <p id="contact-name-error" className="mt-1 text-xs text-red-700">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="contact-email" className="field-label">
              Your email address
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && Boolean(errors.email)}
              aria-describedby={touched && errors.email ? 'contact-email-error' : undefined}
              className="field-input"
              placeholder="you@example.com"
            />
            {touched && errors.email ? (
              <p id="contact-email-error" className="mt-1 text-xs text-red-700">
                {errors.email}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="field-label">
            Your message
          </label>
          <textarea
            id="contact-message"
            rows={7}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && Boolean(errors.message)}
            aria-describedby="contact-message-help"
            className="field-input resize-y"
            placeholder="Tell us which tool you were using, what you expected, and what happened instead."
          />
          <p id="contact-message-help" className="mt-1 flex justify-between text-xs text-slate-500">
            <span>
              {touched && errors.message ? (
                <span className="text-red-700">{errors.message}</span>
              ) : (
                'Please do not send confidential files: we never need them to investigate a bug.'
              )}
            </span>
            <span className="tabular-nums">
              {message.length}/{MAX_MESSAGE}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary">
            <Send aria-hidden="true" className="h-4 w-4" />
            Open in my email app
          </button>
          <button type="button" onClick={() => void handleCopy()} className="btn-secondary">
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy message instead'}
          </button>
        </div>

        <p aria-live="polite" className="sr-only">
          {copied ? 'Message copied to the clipboard.' : ''}
        </p>
      </form>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        <Mail aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          We answer most messages within two working days. For bug reports, tell us your browser and
          operating system, and what the file type was &mdash; that is usually enough to reproduce the
          problem without you sending us anything confidential.
        </span>
      </p>
    </div>
  );
}
