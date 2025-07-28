import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Ad {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  target_url: string;
}

interface PromotionalContent {
  id: string;
  title: string;
  description?: string;
  content_url?: string;
  content_type: string;
}

type CarouselItem = (Ad | PromotionalContent) & {
  type: 'ad' | 'promotion';
};

const AdsPromotionsCarousel = () => {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifiedAds, setVerifiedAds] = useState<Set<string>>(new Set());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const autoplayRef = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  useEffect(() => {
    const fetchAdsAndPromotions = async () => {
      try {
        // Fetch active ads
        const { data: ads } = await supabase
          .from('ads')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        // Fetch active promotional content
        const { data: promotions } = await supabase
          .from('promotional_content')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        // Combine and mark with type
        const combinedItems: CarouselItem[] = [
          ...(ads || []).map(ad => ({ ...ad, type: 'ad' as const })),
          ...(promotions || []).map(promo => ({ ...promo, type: 'promotion' as const }))
        ];

        setItems(combinedItems);
      } catch (error) {
        console.error('Error fetching ads and promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdsAndPromotions();
  }, []);


  const requiresVerification = (url: string): boolean => {
    // Check if URL is from ad networks that typically require verification
    return url.includes('monetag') || url.includes('adsterra') || url.includes('popads') || 
           url.includes('hilltopads') || url.includes('propellerads') || url.includes('trafficforce') ||
           url.includes('exoclick') || url.includes('clickadu') || url.includes('juicyads') || 
           url.includes('otieu.com') || url.includes('adnow') || url.includes('revenuehits');
  };

  const handleItemClick = (item: CarouselItem) => {
    const url = item.type === 'ad' && 'target_url' in item ? item.target_url : 
                item.type === 'promotion' && 'content_url' in item ? item.content_url : null;
    
    if (!url) return;

    const itemId = `${item.type}-${item.id}`;
    
    // Check if this ad requires verification
    if (requiresVerification(url)) {
      // If not verified yet, don't open URL on first click
      if (!verifiedAds.has(itemId)) {
        return; // User needs to verify first
      }
    }
    
    // Open URL if not requiring verification or already verified
    window.open(url, '_blank');
  };

  const handleVerification = (itemId: string) => {
    setVerifiedAds(prev => new Set([...prev, itemId]));
    // Update autoplay to use normal timing
    if (autoplayRef.current) {
      autoplayRef.current.reset();
    }
  };

  const getImageUrl = (item: CarouselItem) => {
    if (item.type === 'ad' && 'image_url' in item && item.image_url) {
      return `${supabase.storage.from('ad-images').getPublicUrl(item.image_url).data.publicUrl}`;
    } else if (item.type === 'promotion' && 'content_url' in item && item.content_url) {
      return `${supabase.storage.from('promotional-videos').getPublicUrl(item.content_url).data.publicUrl}`;
    }
    return null;
  };

  const isVideoContent = (item: CarouselItem) => {
    if (item.type === 'promotion' && 'content_type' in item) {
      return item.content_type.includes('video');
    }
    if (item.type === 'ad' && 'image_url' in item && item.image_url) {
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
      return videoExtensions.some(ext => item.image_url!.toLowerCase().includes(ext));
    }
    return false;
  };

  const isDirectLink = (url: string) => {
    // Check if URL should be displayed as iframe (external ad networks or embedded content)
    return url.includes('http') && (
      url.includes('monetag') || url.includes('adsterra') || url.includes('popads') || 
      url.includes('hilltopads') || url.includes('propellerads') || url.includes('trafficforce') ||
      url.includes('exoclick') || url.includes('clickadu') || url.includes('juicyads') || 
      url.includes('otieu.com') || url.includes('adnow') || url.includes('revenuehits') ||
      url.includes('embed') || url.includes('iframe')
    );
  };

  // Dynamic autoplay delay based on verification status
  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentSlideIndex];
    if (!currentItem) return;

    const url = currentItem.type === 'ad' && 'target_url' in currentItem ? currentItem.target_url : 
                currentItem.type === 'promotion' && 'content_url' in currentItem ? currentItem.content_url : null;
    
    if (!url) return;

    const itemId = `${currentItem.type}-${currentItem.id}`;
    const needsVerification = requiresVerification(url);
    const isVerified = verifiedAds.has(itemId);
    
    // Set delay: 15s for unverified ads requiring verification, 5s for others
    const delay = needsVerification && !isVerified ? 15000 : 5000;
    
    if (autoplayRef.current) {
      autoplayRef.current.reset();
      // Create new autoplay instance with correct delay
      autoplayRef.current = Autoplay({ delay, stopOnInteraction: false });
    }
  }, [currentSlideIndex, verifiedAds, items]);

  // Early return after all hooks are called
  if (loading || items.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-32 mb-8 rounded-lg overflow-hidden bg-muted/30">
      <Carousel
        plugins={[autoplayRef.current]}
        className="w-full h-full"
      >
        <CarouselContent className="h-full">
          {items.map((item) => {
            const imageUrl = getImageUrl(item);
            const itemId = `${item.type}-${item.id}`;
            const url = item.type === 'ad' && 'target_url' in item ? item.target_url : 
                        item.type === 'promotion' && 'content_url' in item ? item.content_url : null;
            const needsVerification = url ? requiresVerification(url) : false;
            const isVerified = verifiedAds.has(itemId);
            
            // Check if it's an ad with a direct link to external ad networks or iframe content
            if (item.type === 'ad' && 'target_url' in item && isDirectLink(item.target_url)) {
              return (
                <CarouselItem key={item.id} className="h-full">
                  <div className="relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                    <iframe
                      src={item.target_url}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox"
                      loading="eager"
                      title={item.title || "Advertisement"}
                      allow="autoplay; encrypted-media; fullscreen"
                      style={{
                        minHeight: '128px',
                        background: 'linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--primary)/0.05))'
                      }}
                    />
                    
                    {/* Verification overlay for unverified ads */}
                    {needsVerification && !isVerified && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                        <div className="bg-white p-4 rounded-lg text-center max-w-xs mx-4 shadow-xl">
                          <div className="mb-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h4 className="text-base font-semibold mb-1 text-gray-800">Human Verification</h4>
                            <p className="text-xs text-gray-600 mb-3">
                              Click below to verify and view the ad
                            </p>
                          </div>
                          <div 
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerification(itemId);
                            }}
                          >
                            ✓ Verify I'm Human
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Clickable overlay - only show if verified or doesn't need verification */}
                    {(!needsVerification || isVerified) && (
                      <div 
                        className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-5 bg-primary transition-opacity flex items-center justify-center z-10"
                        onClick={() => handleItemClick(item)}
                        title={`Click to open ${item.title} in new window`}
                      >
                        <div className="text-white text-sm bg-black/50 px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                          Click to open
                        </div>
                      </div>
                    )}
                  </div>
                </CarouselItem>
              );
            }
            
            return (
              <CarouselItem key={item.id} className="h-full">
                <div
                  className="relative w-full h-full cursor-pointer group bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between px-6 rounded-lg"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  {imageUrl && (
                    <div className="flex-shrink-0 ml-4">
                      {isVideoContent(item) ? (
                        <video
                          src={imageUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-20 h-20 object-cover rounded-md group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <img
                          src={imageUrl}
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded-md group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg" />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};

export default AdsPromotionsCarousel;