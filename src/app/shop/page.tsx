import ProductList from "../components/ProductList";
import PageBanner from "../components/PageBanner";
import { getGlobalPageSettings } from "@/lib/pageSettingsServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ShopPage() {
  const settings = await getGlobalPageSettings();

  return (
    <div>
      <PageBanner
        title={settings.shop.bannerTitle || "Shop Catalog"}
        subtitle={settings.shop.bannerSubtitle}
        bgImage={settings.shop.bannerImage}
        bgMedia={settings.shop.bannerMedia}
      />
      <ProductList
        hideHeader={true}
        productsPerPage={settings.shop.productsPerPage}
      />
    </div>
  );
}
