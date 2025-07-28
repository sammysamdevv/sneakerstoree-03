import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  imageUrl?: string;
  type?: string;
}

const SEOHead = ({ 
  title = "Sneaker Store - Premium Shoes & Footwear",
  description = "Discover premium shoes and footwear at Sneaker Store. Browse our collection of sneakers, heels, sandals, and more for men, women, and unisex styles.",
  keywords = "sneakers, shoes, footwear, men shoes, women shoes, heels, sandals, nike, jordans, premium shoes",
  canonicalUrl,
  imageUrl = "/placeholder.svg",
  type = "website"
}: SEOHeadProps) => {
  const baseUrl = "https://sneakerstore.co.ke";
  const fullCanonicalUrl = canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl;
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Sneaker Store" />
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="author" content="Sneaker Store" />
    </Helmet>
  );
};

export default SEOHead;