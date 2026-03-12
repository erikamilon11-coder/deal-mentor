import { useState } from "react";
import { useMediaQuery } from "@/components/hooks";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MobileSelect({ value, onValueChange, options, placeholder, label, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between ${triggerClassName}`}
        >
          <span className="text-slate-600">{value || placeholder}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>{label || placeholder}</SheetTitle>
        </SheetHeader>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onValueChange(option);
                setOpen(false);
              }}
              className={`w-full text-left p-4 rounded-xl transition-colors ${
                value === option
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-900"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}