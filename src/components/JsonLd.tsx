/**
 * Structured data for search engines (schema.org JSON-LD). Invisible on the page.
 * "<" is escaped so text from the database can never close the script tag.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
