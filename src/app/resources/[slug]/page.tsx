import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/articles";
import { getArticleBySlug, getAnyCategoryBySlug } from "@/lib/content";
import { articleLd, buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { rotatePhoto } from "@/config/images";
import { JsonLd } from "@/components/ui/JsonLd";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/types/content";

export function generateStaticParams() {
  return articles
    .filter((a) => a.status === "published")
    .map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };
  return buildMetadata({
    title: article.title,
    description: article.summary,
    path: `/resources/${article.slug}`,
    ogType: "article",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = (
    await Promise.all(
      (article.relatedCategories ?? []).map((s) => getAnyCategoryBySlug(s)),
    )
  ).filter((c): c is Category => Boolean(c));

  return (
    <>
      <JsonLd
        data={articleLd({
          headline: article.title,
          description: article.summary,
          url: `/resources/${article.slug}`,
          datePublished: article.datePublished,
          dateModified: article.dateModified,
        })}
      />
      <PageHero
        size="compact"
        trail={[
          { name: "Resources", path: "/resources" },
          { name: article.title, path: `/resources/${article.slug}` },
        ]}
        photo={rotatePhoto(
          articles.findIndex((a) => a.slug === article.slug),
        )}
        kicker={`Resource · ${new Date(article.datePublished).toLocaleDateString(
          "en-GB",
          { year: "numeric", month: "long", day: "numeric" },
        )}`}
        title={article.title}
        intro={article.summary}
      />

      <article className="u-container py-16">
        <div className="max-w-2xl">
          {article.body.map((block, i) => {
            if (block.type === "heading") {
              return (
                <h2 key={i} className="mt-10 text-2xl">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={i} className="mt-4 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="border-l-2 border-brand pl-4 text-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="mt-5 leading-relaxed text-ink/85">
                {block.text}
              </p>
            );
          })}
        </div>

        {related.length > 0 && (
          <aside className="mt-14 max-w-2xl border-t border-line pt-8">
            <h2 className="u-mono-label">Related categories</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {related.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="inline-flex rounded-full border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:border-brand hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="mt-12 max-w-2xl">
          <Button href="/request-a-quote">Request a quote</Button>
        </div>
      </article>
    </>
  );
}
