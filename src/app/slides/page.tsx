import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Slides — Axiom Foundation",
  description:
    "Slide decks from the Axiom Foundation's talks, webinars, and briefings.",
};

// Deck routes under /slides/* rewrite to the axiom-slides deck app
// (vercel.json); this page is the index in front of them. It reads the deck
// registry's manifest so a new deck registered there reaches this listing
// without a site redeploy.
const MANIFEST_URL = "https://axiom-slides.vercel.app/slides/index.json";

interface SpeakerMeta {
  name: string;
  title: string;
  photo: string;
}

interface DeckMeta {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  slideCount: number;
  speakers?: SpeakerMeta[];
}

async function getDecks(): Promise<DeckMeta[]> {
  try {
    const res = await fetch(MANIFEST_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const body = (await res.json()) as { decks?: DeckMeta[] };
    return body.decks ?? [];
  } catch {
    return [];
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = MONTHS[month - 1] ?? "";
  if (day === 1) return `${monthName} ${year}`;
  return `${monthName} ${day}, ${year}`;
}

export default async function SlidesPage() {
  const decks = await getDecks();

  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-16">
          <h1 className="heading-page mb-6">Slides</h1>
          <p className="text-lg text-[color:var(--color-ink-muted)]">
            Decks from the Axiom Foundation&rsquo;s talks, webinars, and
            briefings.
          </p>
        </header>

        {decks.length === 0 ? (
          <p className="text-[color:var(--color-ink-muted)]">
            The deck list is momentarily unavailable — try again shortly.
          </p>
        ) : (
          <ul className="grid gap-6 list-none p-0 m-0">
            {decks.map((deck) => (
              <li key={deck.id}>
                <a
                  href={`/slides/${deck.id}`}
                  className="block no-underline rounded-2xl border border-[color:var(--color-rule-subtle)] bg-white/60 px-7 py-6 transition-colors hover:border-[color:var(--color-ink)]"
                >
                  <h2 className="text-xl font-semibold leading-snug mb-2 text-[color:var(--color-ink)]">
                    {deck.title}
                  </h2>
                  <p className="text-[0.95rem] leading-normal mb-5 text-[color:var(--color-ink-muted)]">
                    {deck.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {deck.speakers?.slice(0, 3).map((speaker, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={speaker.name}
                          src={speaker.photo}
                          alt={speaker.name}
                          title={`${speaker.name} — ${speaker.title}`}
                          className={`h-8 w-8 rounded-full border-2 border-white object-cover ${i > 0 ? "-ml-2" : ""}`}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-xs text-[color:var(--color-ink-muted)]">
                      {formatDate(deck.date)} &middot; {deck.slideCount} slides
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
