import Banner from "./components/Banner";
import HeroSection from "./components/HeroSection";
import TopRatedProducts from "./components/TopRatedProducts";
import ProductList from "./components/ProductList";
import HomeFreeDeliveryBanner from "./components/HomeFreeDeliveryBanner";
import { getGlobalPageSettings } from "@/lib/pageSettingsServer";
import { isDeliveryPromoActive } from "@/lib/deliverySettings";
import { getDeliverySettings } from "@/lib/deliverySettings.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [settings, deliverySettings] = await Promise.all([
    getGlobalPageSettings(),
    getDeliverySettings(),
  ]);
  const showDeliveryPromo = isDeliveryPromoActive(deliverySettings);

  return (
    <main>
      <Banner
        banners={settings.home.banners}
        singleBanner={settings.home.singleBanner}
        bannerMode={settings.home.bannerMode}
        images={settings.home.bannerImages}
      />
      {showDeliveryPromo && <HomeFreeDeliveryBanner savedAmount={deliverySettings.fee} />}
      <HeroSection />
      <TopRatedProducts count={settings.home.topRatedCount} />
      <ProductList productsPerPage={settings.home.productsPerPage} />
    </main>
  );
}
