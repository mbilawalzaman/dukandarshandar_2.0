import Banner from "./components/Banner";
import HeroSection from "./components/HeroSection";
import TopRatedProducts from "./components/TopRatedProducts";
import ProductList from "./components/ProductList";
import { getGlobalPageSettings } from "@/lib/pageSettingsServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const settings = await getGlobalPageSettings();

  return (
    <main>
      <Banner
        banners={settings.home.banners}
        singleBanner={settings.home.singleBanner}
        bannerMode={settings.home.bannerMode}
        images={settings.home.bannerImages}
      />
      <HeroSection />
      <TopRatedProducts count={settings.home.topRatedCount} />
      <ProductList productsPerPage={settings.home.productsPerPage} />
    </main>
  );
}
