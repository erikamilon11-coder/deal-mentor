import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Filter, X, CalendarIcon, Users, Target } from "lucide-react";
import { format } from "date-fns";

export default function AnalyticsFilters({ onFilterChange, users }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    agent: "all",
    leadSource: "all",
    dateFrom: null,
    dateTo: null,
  });

  const leadSources = [
    "Driving for Dollars",
    "List",
    "Referral",
    "Other"
  ];

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      agent: "all",
      leadSource: "all",
      dateFrom: null,
      dateTo: null,
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFilterCount = [
    filters.agent !== "all",
    filters.leadSource !== "all",
    filters.dateFrom !== null,
    filters.dateTo !== null,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">Filter Analytics</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Agent Filter */}
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Agent
              </Label>
              <Select value={filters.agent} onValueChange={(value) => updateFilter("agent", value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Source Filter */}
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Lead Source
              </Label>
              <Select value={filters.leadSource} onValueChange={(value) => updateFilter("leadSource", value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {leadSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-start text-left font-normal">
                      {filters.dateFrom ? (
                        format(filters.dateFrom, "MMM d")
                      ) : (
                        <span className="text-slate-500 text-xs">From</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter("dateFrom", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-start text-left font-normal">
                      {filters.dateTo ? (
                        format(filters.dateTo, "MMM d")
                      ) : (
                        <span className="text-slate-500 text-xs">To</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter("dateTo", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.agent !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Agent: {users?.find(u => u.email === filters.agent)?.full_name || filters.agent}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("agent", "all")}
              />
            </Badge>
          )}
          {filters.leadSource !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Source: {filters.leadSource}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("leadSource", "all")}
              />
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.dateFrom, "MMM d")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("dateFrom", null)}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.dateTo, "MMM d")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("dateTo", null)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}