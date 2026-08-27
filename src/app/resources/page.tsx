import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { photos } from "@/config/images";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = buildMetadata({
  title: "Resources & technical notes",
  description: `Guides, procurement notes and technical information from ${siteConfig.legalName} — practical references for buyers and technical staff in ${siteConfig.company.address.country}.`,
  path: "/resources",
});

export default async function ResourcesPage() {
  const articles = await getPublishedArticles();
  return (
    <>
      <PageHero
        trail={[{ name: "Resources", path: "/resources" }]}
        photo={photos.coatingsStore}
        kicker="Resources"
        title="Practical references for buyers and technical staff."
        intro="Guides and procurement notes to help you specify, source and handle industrial chemicals. We add resources only where they provide genuine, verifiable value."
      />
      <section className="u-container py-16">
        {articles.length > 0 ? (
          <ul className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line md:grid-cols-2">
            {articles.map((article) => (
              <li key={article.slug} className="bg-paper">
                <Link
                  href={`/resources/${article.slug}`}
                  className="group flex h-full flex-col p-8 transition-colors hover:bg-surface"
                >
                  <span className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                    <time dateTime={article.datePublished}>
                      {new Date(article.datePublished).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </span>
                  <h2 className="mt-3 text-xl text-ink group-hover:text-brand-700">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-muted">{article.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8">
            <p className="u-mono-label">Being published</p>
            <p className="mt-3 max-w-2xl text-muted">
              Resource articles are on the way. In the meantime, our team can
              answer specific technical questions directly.
            </p>
            <div className="mt-6">
              <Button href="/contact">Ask a question</Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
