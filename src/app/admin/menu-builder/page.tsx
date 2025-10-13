/**
 * Menu Builder Page
 *
 * Super admin only page for managing dynamic menu items.
 * Provides drag-drop interface for creating, editing, and reordering menu items.
 *
 * SECURITY: Protected by ProtectedAdminPage with superAdminOnly flag
 */

import { ProtectedAdminPage } from '@/components/access-gate/ProtectedAdminPage';
import { MenuBuilderUI } from '@/components/admin/menu-builder/MenuBuilderUI';

export const metadata = {
  title: 'Menu Builder | StewardTrack',
  description: 'Manage dynamic menu items for the admin sidebar',
};

export default async function MenuBuilderPage() {
  return (
    <ProtectedAdminPage superAdminOnly requireTenant={false}>
      <div className="flex h-full flex-col">
        <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-screen-2xl items-center">
            <h1 className="text-lg font-semibold">Menu Builder</h1>
            <p className="ml-4 text-sm text-muted-foreground">
              Create and manage dynamic menu items for the admin sidebar
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <MenuBuilderUI />
        </div>
      </div>
    </ProtectedAdminPage>
  );
}
