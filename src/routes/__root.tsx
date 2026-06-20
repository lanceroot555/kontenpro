import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { AuthListener } from "@/lib/auth-listener";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md">
        <div className="text-[11px] uppercase tracking-[0.08em] text-primary">Error 404</div>
        <h1 className="mt-3 text-5xl font-bold tracking-tight">Halaman tidak ditemukan.</h1>
        <p className="mt-3 text-sm text-muted-foreground">URL yang kamu tuju tidak ada atau sudah dipindahkan.</p>
        <Link to="/" className="mt-6 inline-block border border-ink px-6 py-3 text-[12px] uppercase tracking-[0.06em] hover:bg-ink hover:text-surface">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md">
        <div className="text-[11px] uppercase tracking-[0.08em] text-primary">Error</div>
        <h1 className="mt-3 text-3xl font-bold">Halaman ini gagal dimuat.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Coba refresh atau kembali ke beranda.</p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="bg-primary text-primary-foreground px-6 py-3 text-[12px] uppercase tracking-[0.06em]"
          >Coba lagi</button>
          <a href="/" className="border border-ink px-6 py-3 text-[12px] uppercase tracking-[0.06em]">Beranda</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KontenPro — Platform Manajemen Konten Tim" },
      { name: "description", content: "Satu Platform untuk Kreasi, Approval, Penjadwalan, dan Analitik Konten Sosial Media" },
      { property: "og:title", content: "KontenPro — Platform Manajemen Konten Tim" },
      { property: "og:description", content: "Satu Platform untuk Kreasi, Approval, Penjadwalan, dan Analitik Konten Sosial Media" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "KontenPro — Platform Manajemen Konten Tim" },
      { name: "twitter:description", content: "Satu Platform untuk Kreasi, Approval, Penjadwalan, dan Analitik Konten Sosial Media" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/761afb26-25e2-4be4-8598-618179a20f8f/id-preview-818a5b15--b051621a-0135-45ab-a3ee-f2cb640ecdfb.lovable.app-1781920208756.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/761afb26-25e2-4be4-8598-618179a20f8f/id-preview-818a5b15--b051621a-0135-45ab-a3ee-f2cb640ecdfb.lovable.app-1781920208756.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <Outlet />
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 0, border: "1px solid #0A0A0A" } }} />
    </QueryClientProvider>
  );
}
