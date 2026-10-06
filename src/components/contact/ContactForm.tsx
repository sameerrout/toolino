'use client';

/**
 * Toolino Contact Form.
 *
 * Submits inquiries directly to the secure backend storage so that
 * authorized administrators can review, reply, and manage messages
 * from the Manager dashboard.
 */

import { useMemo, useState } from 'react';
import { Send, CheckCircle2, AlertTriangle, Loader2, MessageSquare } from 'lucide-react';

type Topic = 'bug' | 'question' | 'feedback' | 'business' | 'legal' | 'other';

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'bug', label: 'A tool produced a wrong result' },
  { value: 'question', label: 'A question about using a tool' },
  { value: 'feedback', label: 'Feedback or a feature request' },
  { value: 'business', label: 'Business or advertising enquiry' },
  { value: 'legal', label: 'Privacy, legal or takedown request' },
  { value: 'other', label: 'Something else' },
];

const MAX_MESSAGE = 4000;

export function ContactForm() {
  const [topic, setTopic] = useState<Topic>('question');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const found: Partial<Record<'name' | 'email' | 'message', string>> = {};
    if (name.trim().length < 2) found.name = 'Please enter your name so we know who to address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      found.email = 'Please enter a valid email address.';
    }
    if (message.trim().length < 10) {
      found.message = 'Please add a little more detail, at least 10 characters.';
    }
    if (message.length > MAX_MESSAGE) {
      found.message = `Please keep the message under ${MAX_MESSAGE} characters.`;
    }
    return found;
  }, [name, email, message]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);
    setSuccess(false);

    if (!isValid) return;

    setSubmitting(true);
    try {
      const selectedTopic = TOPICS.find((entry) => entry.value === topic)?.label ?? 'General Inquiry';
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category: selectedTopic,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "We couldn't send your message right now. Please try again.");
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTopic('question');
      setTouched(false);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "We couldn't send your message right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
      <p className="mt-1 text-sm text-slate-600">
        Fill out the form below to reach the Toolino support team. All messages are securely routed directly to our administrators.
      </p>

      {success && (
        <div
          role="status"
          className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">Message sent successfully.</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              We&apos;ll review your message and get back to you.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-3 animate-in fade-in"
        >
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Submission Error</p>
            <p className="mt-0.5 text-xs text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label htmlFor="contact-topic" className="field-label">
            What is this about?
          </label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value as Topic)}
            className="field-input"
            disabled={submitting}
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
              disabled={submitting}
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
              placeholder="you@domain.com"
              disabled={submitting}
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
            disabled={submitting}
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
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send aria-hidden="true" className="h-4 w-4" />
                <span>Send Message</span>
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        <MessageSquare aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          We answer messages promptly. For bug reports, telling us your browser, operating
          system, and file type helps our team reproduce and resolve the problem quickly without you
          needing to upload any sensitive data.
        </span>
      </p>
    </div>
  );
}
