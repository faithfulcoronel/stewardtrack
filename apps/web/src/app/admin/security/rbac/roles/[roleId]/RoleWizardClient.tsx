'use client';

import { RoleWizard, type WizardMode } from '@/components/admin/rbac/wizard/RoleWizard';

interface RoleWizardClientProps {
  roleId: string;
  mode: WizardMode;
}

export function RoleWizardClient({ roleId, mode }: RoleWizardClientProps) {
  return <RoleWizard mode={mode} roleId={roleId} />;
}
