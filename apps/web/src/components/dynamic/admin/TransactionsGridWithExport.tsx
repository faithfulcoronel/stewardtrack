'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { AdminDataGridSection, type AdminDataGridSectionProps } from './AdminDataGridSection';
import { TransactionExportDialog } from './TransactionExportDialog';

interface TransactionsGridWithExportProps extends AdminDataGridSectionProps {
  tenantName?: string;
  currency?: string;
}

export function TransactionsGridWithExport({
  tenantName,
  currency,
  ...gridProps
}: TransactionsGridWithExportProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  return (
    <>
      <AdminDataGridSection
        {...gridProps}
        headerSlot={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExportDialogOpen(true)}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />
      <TransactionExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        tenantName={tenantName}
        currency={currency}
      />
    </>
  );
}
