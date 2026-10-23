import type { Metadata, Viewport } from "next";
import "./globals.css";
import "sweetalert2/dist/sweetalert2.min.css";

export const metadata: Metadata = {
  title: "Gudang Marketing",
  description: "Sistem manajemen stok, alokasi, serah-terima, dan inventori Gudang Marketing.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#173c35", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
