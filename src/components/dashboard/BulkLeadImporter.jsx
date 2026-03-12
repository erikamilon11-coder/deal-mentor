import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import CSVImporter from "@/components/import/CSVImporter";

export default function BulkLeadImporter({ onImportComplete, onClose }) {


  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">Advanced CSV Import</h3>
          <p className="text-sm text-slate-500 mt-1">Map columns, validate data, and assign batch status</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <CSVImporter 
        onComplete={(results) => {
          if (onImportComplete) onImportComplete();
        }}
        onCancel={onClose}
      />
    </div>
  );
}