"use client";

import { useState } from "react";
import { ArrowRightIcon } from "@/components/icons";

const FIELD_CLASS =
  "w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-4 py-3 font-body text-[0.95rem] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors";

const LABEL_CLASS =
  "block mb-2 font-mono text-[0.65rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)]";

/**
 * Contact form, mailto-backed: submitting composes an email to
 * hello@ in the visitor's own mail client, so it works with zero
 * server-side infrastructure. Swap handleSubmit for a POST when a
 * form backend (Resend, MailChimp inbox, etc.) is provisioned.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [topic, setTopic] = useState("General");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `[${topic}] ${name}${org ? ` — ${org}` : ""}`;
    const body = `${message}\n\n— ${name}${org ? `, ${org}` : ""}`;
    window.location.href = `mailto:hello@axiom.org?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={LABEL_CLASS}>
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="contact-org" className={LABEL_CLASS}>
            Organization <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="contact-org"
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="Agency, lab, company…"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-topic" className={LABEL_CLASS}>
          Topic
        </label>
        <select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={FIELD_CLASS}
        >
          <option>General</option>
          <option>Partnership</option>
          <option>Contributing</option>
          <option>Funding</option>
          <option>Press</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className={LABEL_CLASS}>
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What are you working on, and how can we help?"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <button type="submit" className="btn-primary">
          Send message
          <ArrowRightIcon className="w-5 h-5" />
        </button>
        <p className="mt-3 mb-0 font-body text-[0.8rem] text-[var(--color-ink-muted)]">
          Opens your mail client addressed to hello@axiom.org.
        </p>
      </div>
    </form>
  );
}
