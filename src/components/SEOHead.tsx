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
  title = "Eden Sneakers Kenya - Buy Original Sneakers Online | Best Prices",
  description = "Buy authentic sneakers online in Kenya. Original Jordans, Nike, designer sneakers for men & women. Affordable prices, fast delivery to Nairobi, Mombasa, Kisumu. Shop now!",
  keywords = "buy sneakers online Kenya, sneakers for men Kenya, sneakers for women Kenya, affordable sneakers Kenya, designer sneakers Kenya, cheap sneakers Kenya, original sneakers Kenya, best sneakers Kenya, sneakers sale Kenya, buy Jordans Kenya, original Jordans Kenya, authentic Jordans Kenya, sneakers Nairobi, Jordans Nairobi, sneakers Mombasa, sneakers Kisumu, casual shoes Kenya, sports shoes Kenya, running shoes Kenya, men's shoes Kenya, women's shoes Kenya, unisex sneakers Kenya, sneaker store Kenya, buy shoes online Kenya, sneaker delivery Nairobi, Eden Sneakers",
  canonicalUrl,
  imageUrl = "/lovable-uploads/fc4c83df-0c8f-4dc1-b577-fda0d7537c33.png",
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