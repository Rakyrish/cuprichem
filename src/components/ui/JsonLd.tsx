/**
 * Emits a JSON-LD <script>. Server-rendered so crawlers see structured data in
 * the initial HTML. Content is our own trusted, statically-shaped data.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
