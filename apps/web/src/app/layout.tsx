import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Helpyme",
  description: "Asesor financiero inteligente para PyMEs",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem 1rem" }}>
        {children}
      </body>
    </html>
  );
}
