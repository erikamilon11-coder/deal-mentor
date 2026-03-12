import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Trash2, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function CompsManager({ onCompsChange }) {
  const [comps, setComps] = useState([]);
  const [newComp, setNewComp] = useState({
    address: "",
    sale_price: "",
    sale_date: "",
    sqft: "",
    beds: "",
    baths: "",
  });

  const addComp = () => {
    if (!newComp.address || !newComp.sale_price) return;
    
    const updatedComps = [...comps, { ...newComp, id: Date.now() }];
    setComps(updatedComps);
    onCompsChange(updatedComps);
    setNewComp({
      address: "",
      sale_price: "",
      sale_date: "",
      sqft: "",
      beds: "",
      baths: "",
    });
  };

  const removeComp = (id) => {
    const updatedComps = comps.filter(c => c.id !== id);
    setComps(updatedComps);
    onCompsChange(updatedComps);
  };

  const calculateAvgPrice = () => {
    if (comps.length === 0) return 0;
    const total = comps.reduce((sum, comp) => sum + Number(comp.sale_price || 0), 0);
    return Math.round(total / comps.length);
  };

  const calculateAvgPricePerSqft = () => {
    const validComps = comps.filter(c => c.sale_price && c.sqft);
    if (validComps.length === 0) return 0;
    const total = validComps.reduce((sum, comp) => {
      const pricePerSqft = Number(comp.sale_price) / Number(comp.sqft);
      return sum + pricePerSqft;
    }, 0);
    return Math.round(total / validComps.length);
  };

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const avgPrice = calculateAvgPrice();
  const avgPricePerSqft = calculateAvgPricePerSqft();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Comparable Sales</h3>
        </div>
        <Badge variant="outline">{comps.length} comps</Badge>
      </div>

      {/* Comps Summary */}
      {comps.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">Average Sale Price</p>
            <p className="text-xl font-bold text-blue-900">{formatCurrency(avgPrice)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-xs text-purple-600 mb-1">Avg Price/SqFt</p>
            <p className="text-xl font-bold text-purple-900">
              {avgPricePerSqft > 0 ? `$${avgPricePerSqft}` : "N/A"}
            </p>
          </div>
        </div>
      )}

      {/* Existing Comps List */}
      {comps.length > 0 && (
        <div className="space-y-2">
          {comps.map((comp) => (
            <div
              key={comp.id}
              className="bg-slate-50 rounded-lg p-3 border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">{comp.address}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {formatCurrency(comp.sale_price)}
                    </Badge>
                    {comp.sqft && (
                      <Badge variant="outline" className="text-xs">
                        {comp.sqft} sqft
                      </Badge>
                    )}
                    {comp.beds && (
                      <Badge variant="outline" className="text-xs">
                        {comp.beds} bed
                      </Badge>
                    )}
                    {comp.baths && (
                      <Badge variant="outline" className="text-xs">
                        {comp.baths} bath
                      </Badge>
                    )}
                    {comp.sale_date && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        {format(new Date(comp.sale_date), "MMM yyyy")}
                      </Badge>
                    )}
                  </div>
                  {comp.sqft && comp.sale_price && (
                    <p className="text-xs text-slate-500 mt-1">
                      ${Math.round(Number(comp.sale_price) / Number(comp.sqft))}/sqft
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeComp(comp.id)}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Comp Form */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        <p className="text-sm font-medium text-slate-700">Add Comparable Sale</p>
        
        <div>
          <Label className="text-xs">Property Address</Label>
          <Input
            value={newComp.address}
            onChange={(e) => setNewComp({ ...newComp, address: e.target.value })}
            placeholder="123 Main St"
            className="h-10 mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Sale Price</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input
                type="number"
                value={newComp.sale_price}
                onChange={(e) => setNewComp({ ...newComp, sale_price: e.target.value })}
                placeholder="250000"
                className="h-10 pl-7"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Sale Date</Label>
            <Input
              type="date"
              value={newComp.sale_date}
              onChange={(e) => setNewComp({ ...newComp, sale_date: e.target.value })}
              className="h-10 mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">SqFt</Label>
            <Input
              type="number"
              value={newComp.sqft}
              onChange={(e) => setNewComp({ ...newComp, sqft: e.target.value })}
              placeholder="1500"
              className="h-10 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Beds</Label>
            <Input
              type="number"
              value={newComp.beds}
              onChange={(e) => setNewComp({ ...newComp, beds: e.target.value })}
              placeholder="3"
              className="h-10 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Baths</Label>
            <Input
              type="number"
              value={newComp.baths}
              onChange={(e) => setNewComp({ ...newComp, baths: e.target.value })}
              placeholder="2"
              className="h-10 mt-1"
            />
          </div>
        </div>

        <Button
          onClick={addComp}
          disabled={!newComp.address || !newComp.sale_price}
          className="w-full h-10"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Comp
        </Button>
      </div>

      {comps.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">Suggested ARV</p>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{formatCurrency(avgPrice)}</p>
          <p className="text-xs text-emerald-600 mt-1">
            Based on {comps.length} comparable sale{comps.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}