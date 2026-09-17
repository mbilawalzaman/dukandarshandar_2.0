import Banner from "./components/Banner";
import HeroSection from "./components/HeroSection";
import TopRatedProducts from "./components/TopRatedProducts";
import ProductList from "./components/ProductList";
import HomeFreeDeliveryBanner from "./components/HomeFreeDeliveryBanner";
import { getGlobalPageSettings } from "@/lib/pageSettingsServer";
import { isDeliveryPromoActive } from "@/lib/deliverySettings";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { getPublicPromotions } from "@/services/promotionService";
import PromotionBanner from "./components/promotions/PromotionBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [settings, deliverySettings, promotions] = await Promise.all([
    getGlobalPageSettings(),
    getDeliverySettings(),
    getPublicPromotions().catch(() => []),
  ]);
  const showDeliveryPromo = isDeliveryPromoActive(deliverySettings);
  // Highest-priority live public promotion drives the banner when the store-wide delivery toggle is off.
  const featured = promotions.filter((p) => p.status === "active").sort((a, b) => b.priority - a.priority)[0] || null;

  return (
    <main>
      <Banner
        banners={settings.home.banners}
        singleBanner={settings.home.singleBanner}
        bannerMode={settings.home.bannerMode}
        images={settings.home.bannerImages}
      />
      {showDeliveryPromo ? (
        <HomeFreeDeliveryBanner savedAmount={deliverySettings.fee} />
      ) : featured ? (
        <PromotionBanner promotion={featured} deliveryFee={deliverySettings.fee} />
      ) : null}
      <HeroSection />
      <TopRatedProducts count={settings.home.topRatedCount} />
      <ProductList productsPerPage={settings.home.productsPerPage} />
    </main>
  );
}
