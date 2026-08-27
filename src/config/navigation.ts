/**
 * Primary navigation and footer link groups.
 *
 * These describe the site's information architecture (the URL structure the
 * catalogue will grow into). They are navigation, not product claims — listing
 * "/products" does not assert any specific product exists yet.
 */

export type NavLink = { label: string; href: string; description?: string };

export const primaryNav: NavLink[] = [
  { label: "Products", href: "/products", description: "Browse the chemical catalogue" },
  { label: "Categories", href: "/categories", description: "Chemicals grouped by type" },
  { label: "Industries", href: "/industries", description: "Solutions by sector" },
  { label: "Resources", href: "/resources", description: "Guides and technical notes" },
  { label: "About", href: "/about", description: "The company behind Cuprichem" },
  { label: "Contact", href: "/contact", description: "Talk to our sales team" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Catalogue",
    links: [
      { label: "All products", href: "/products" },
      { label: "Categories", href: "/categories" },
      { label: "Industries", href: "/industries" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Cuprichem", href: "/about" },
      { label: "Resources", href: "/resources" },
      { label: "Contact", href: "/contact" },
      { label: "Request a quote", href: "/request-a-quote" },
    ],
  },
];

/** The single most important conversion action across the site. */
export const primaryCta: NavLink = {
  label: "Request a quote",
  href: "/request-a-quote",
};
