import type { Metadata } from 'next';

interface SiteMetadata {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  keywords: string[];
  author: {
    name: string;
    email: string;
    url: string;
  };
}

export const siteMetadata: SiteMetadata = {
  name: 'StewardTrack',
  description:
    'Modern church management system to simplify administration and amplify ministry impact. Manage members, events, giving, and communications in one platform.',
  url: 'https://stewardtrack.com',
  ogImage: '/og-image.png',
  keywords: [
    'church management software',
    'church management system',
    'church database',
    'church member management',
    'church giving software',
    'church event planning',
    'ministry management',
    'church communication',
    'church admin software',
    'church cms',
  ],
  author: {
    name: 'StewardTrack',
    email: 'hello@stewardtrack.com',
    url: 'https://stewardtrack.com',
  },
};

export function generatePageMetadata({
  title,
  description,
  keywords = [],
  ogImage,
  path = '',
}: {
  title: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  path?: string;
}): Metadata {
  const pageDescription = description || siteMetadata.description;
  const pageKeywords = [...siteMetadata.keywords, ...keywords];
  const pageOgImage = ogImage || siteMetadata.ogImage;
  const pageUrl = `${siteMetadata.url}${path}`;

  return {
    title: {
      default: title,
      template: `%s | ${siteMetadata.name}`,
    },
    description: pageDescription,
    keywords: pageKeywords,
    authors: [{ name: siteMetadata.author.name, url: siteMetadata.author.url }],
    creator: siteMetadata.author.name,
    publisher: siteMetadata.author.name,
    metadataBase: new URL(siteMetadata.url),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description: pageDescription,
      url: pageUrl,
      siteName: siteMetadata.name,
      images: [
        {
          url: pageOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: pageDescription,
      images: [pageOgImage],
      creator: '@stewardtrack',
      site: '@stewardtrack',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'your-google-verification-code',
      yandex: 'your-yandex-verification-code',
    },
  };
}
