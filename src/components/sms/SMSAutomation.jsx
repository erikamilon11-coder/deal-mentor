import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Zap, CheckCircle2 } from "lucide-react";

const AUTOMATION_RULES = [
  {
    id: "offer_sent",
    trigger: "Offer Sent",
    description: "Send automated text when offer is sent to seller",
    defaultEnabled: true,
  },
  {
    id: "under_contract",
    trigger: "Under Contract",
    description: "Notify seller when deal goes under contract",
    defaultEnabled: true,
  },
  {
    id: "first_contact",
    trigger: "New → Contacted",
    description: "Send initial text message to new leads",
    defaultEnabled: false,
  },
];

export default function SMSAutomation() {
  const [automations, setAutomations] = useState(
    AUTOMATION_RULES.reduce((acc, rule) => {
      acc[rule.id] = rule.defaultEnabled;
      return acc;
    }, {})
  );

  const toggleAutomation = (ruleId) => {
    setAutomations(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const activeCount = Object.values(automations).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-slate-900">SMS Automations</h3>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {activeCount} Active
        </Badge>
      </div>

      <p className="text-sm text-slate-600">
        Automatically send text messages when lead status changes
      </p>

      <div className="space-y-3">
        {AUTOMATION_RULES.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white border rounded-xl p-4 transition-all ${
              automations[rule.id]
                ? "border-amber-200 bg-amber-50/30"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {rule.trigger}
                  </Badge>
                  {automations[rule.id] && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm text-slate-700">{rule.description}</p>
              </div>
              <Switch
                checked={automations[rule.id]}
                onCheckedChange={() => toggleAutomation(rule.id)}
                className="ml-4"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">How it works</h4>
            <p className="text-xs text-blue-700 mt-1">
              When a lead's status changes to a trigger status, an automated text message is sent using the phone number on file. All messages are logged in the Chat tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}