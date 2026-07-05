import type { Metadata, Viewport } from 'next'
import AdminShell from '@/components/admin/AdminShell'

/**
 * Layout serveur de l'espace admin : porte la metadata PWA **admin**.
 * Ces balises (manifest, apple-touch-icon, apple-mobile-web-app-capable,
 * theme-color) ne sont émises que pour les routes /admin/* — le site public
 * n'est donc jamais proposé à l'installation. L'UI (client) vit dans AdminShell.
 */
export const metadata: Metadata = {
  applicationName: 'ParaGlow Admin',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'ParaGlow Admin',
    statusBarStyle: 'black-translucent',
  },
  other: {
    // Balise historique lue par les anciennes versions d'iOS Safari
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    apple: '/icons/icon-180x180.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1b3a1e',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
