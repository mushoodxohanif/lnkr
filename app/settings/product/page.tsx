import { connection } from "next/server";
import { ProductForm } from "@/components/settings/product-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getUserProfile } from "@/lib/settings/actions";

export default async function ProductSettingsPage() {
  await connection();
  const profile = await getUserProfile();

  return (
    <SettingsShell
      title="Product profile"
      description="Tell the agent what you sell — product name and value props are required. Industries and personas auto-feed ICP scoring."
    >
      <ProductForm initialData={profile} />
    </SettingsShell>
  );
}
