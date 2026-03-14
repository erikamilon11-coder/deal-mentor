import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVImporter from "@/components/import/CSVImporter";
import LeadCSVImporter from "@/components/import/LeadCSVImporter";

export default function BulkLeadImporter({ onImportComplete, onClose }) {


  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">Bulk Lead Import</h3>
          <p className="text-sm text-slate-500 mt-1">Choose your import method</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick">Quick Import</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Import</TabsTrigger>
        </TabsList>
        
        <TabsContent value="quick" className="mt-4">
          <LeadCSVImporter 
            onComplete={() => {
              if (onImportComplete) onImportComplete();
            }}
          />
        </TabsContent>
        
        <TabsContent value="advanced" className="mt-4">
          <CSVImporter 
            onComplete={(results) => {
              if (onImportComplete) onImportComplete();
            }}
            onCancel={onClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}