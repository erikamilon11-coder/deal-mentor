import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ResponsiveSelect({ value, onValueChange, placeholder, children, label }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full justify-between h-9"
        >
          <span className="truncate">{value && value !== "" ? value : placeholder}</span>
        </Button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>{label || "Select option"}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[300px] mt-4">
              <div className="space-y-2 pr-4">
                {children?.props?.children?.map((item, idx) => (
                  <Button
                    key={idx}
                    variant={value === item.props.value ? "default" : "outline"}
                    onClick={() => {
                      onValueChange(item.props.value);
                      setIsOpen(false);
                    }}
                    className="w-full justify-start"
                  >
                    {item.props.children}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop view - use standard Select
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}