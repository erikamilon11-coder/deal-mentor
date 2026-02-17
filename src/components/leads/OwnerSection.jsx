import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Phone, Building, Trash2, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ENTITY_TYPES = ["Individual", "LLC", "Trust", "Other"];
const CONFIDENCE_LEVELS = ["High", "Medium", "Low"];

export default function OwnerSection({ leadId, owners, phones }) {
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState(null);
  const [newOwner, setNewOwner] = useState({ owner_name: "", mailing_address: "", entity_type: "Individual" });
  const [newPhone, setNewPhone] = useState({ phone_number: "", confidence_level: "Medium" });

  const queryClient = useQueryClient();

  const addOwnerMutation = useMutation({
    mutationFn: (data) => base44.entities.Owner.create({ ...data, lead_id: leadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners", leadId] });
      setShowAddOwner(false);
      setNewOwner({ owner_name: "", mailing_address: "", entity_type: "Individual" });
    },
  });

  const addPhoneMutation = useMutation({
    mutationFn: (data) => base44.entities.Phone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phones"] });
      setShowAddPhone(null);
      setNewPhone({ phone_number: "", confidence_level: "Medium" });
    },
  });

  const deletePhoneMutation = useMutation({
    mutationFn: (id) => base44.entities.Phone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phones"] }),
  });

  const getOwnerPhones = (ownerId) => phones?.filter(p => p.owner_id === ownerId) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4" />
          Owners
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddOwner(true)}
          className="text-slate-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {showAddOwner && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <Input
            placeholder="Owner Name"
            value={newOwner.owner_name}
            onChange={(e) => setNewOwner({ ...newOwner, owner_name: e.target.value })}
            className="h-10 rounded-lg"
          />
          <Input
            placeholder="Mailing Address"
            value={newOwner.mailing_address}
            onChange={(e) => setNewOwner({ ...newOwner, mailing_address: e.target.value })}
            className="h-10 rounded-lg"
          />
          <Select
            value={newOwner.entity_type}
            onValueChange={(v) => setNewOwner({ ...newOwner, entity_type: v })}
          >
            <SelectTrigger className="h-10 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddOwner(false)}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => addOwnerMutation.mutate(newOwner)}
              disabled={!newOwner.owner_name || addOwnerMutation.isPending}
              className="bg-slate-900"
            >
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      {owners?.length === 0 && !showAddOwner && (
        <p className="text-sm text-slate-500 py-4 text-center">No owners added yet</p>
      )}

      {owners?.map((owner) => (
        <div key={owner.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{owner.owner_name}</span>
                <Badge variant="secondary" className="text-xs">
                  <Building className="w-3 h-3 mr-1" />
                  {owner.entity_type}
                </Badge>
              </div>
              {owner.mailing_address && (
                <p className="text-sm text-slate-500 mt-1">{owner.mailing_address}</p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase">Phone Numbers</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddPhone(owner.id)}
                className="h-6 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>

            {showAddPhone === owner.id && (
              <div className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2">
                <Input
                  placeholder="Phone Number"
                  value={newPhone.phone_number}
                  onChange={(e) => setNewPhone({ ...newPhone, phone_number: e.target.value })}
                  className="h-9 rounded-lg text-sm"
                />
                <Select
                  value={newPhone.confidence_level}
                  onValueChange={(v) => setNewPhone({ ...newPhone, confidence_level: v })}
                >
                  <SelectTrigger className="h-9 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIDENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level} Confidence</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowAddPhone(null)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addPhoneMutation.mutate({ ...newPhone, owner_id: owner.id })}
                    disabled={!newPhone.phone_number || addPhoneMutation.isPending}
                    className="h-7 text-xs bg-slate-900"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {getOwnerPhones(owner.id).map((phone) => (
              <div key={phone.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">{phone.phone_number}</span>
                  <Badge variant="outline" className="text-xs">
                    {phone.confidence_level}
                  </Badge>
                  {phone.do_not_contact && (
                    <Badge variant="destructive" className="text-xs">DNC</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePhoneMutation.mutate(phone.id)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            {getOwnerPhones(owner.id).length === 0 && showAddPhone !== owner.id && (
              <p className="text-xs text-slate-400 py-2">No phone numbers</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}