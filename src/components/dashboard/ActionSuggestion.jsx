import { Lightbulb, MessageSquare, Phone, FileText, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const suggestions = {
  "New": {
    icon: MessageSquare,
    text: "Send First Message",
    description: "Reach out to the owner to gauge their interest",
    color: "bg-blue-500",
  },
  "Contacted": {
    icon: Phone,
    text: "Ask Motivation Questions",
    description: "Understand why they might sell and their timeline",
    color: "bg-amber-500",
  },
  "Responded": {
    icon: FileText,
    text: "Prepare Offer",
    description: "Calculate your numbers and craft an offer",
    color: "bg-emerald-500",
  },
  "Talking": {
    icon: Send,
    text: "Send Contract",
    description: "Lock in the deal with a purchase agreement",
    color: "bg-purple-500",
  },
  "Offer Sent": {
    icon: Clock,
    text: "Follow Up for Decision",
    description: "Check in and address any concerns",
    color: "bg-indigo-500",
  },
};

export default function ActionSuggestion({ status, onAction }) {
  const suggestion = suggestions[status];
  
  if (!suggestion) return null;

  const Icon = suggestion.icon;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${suggestion.color}`}>
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Next Action</p>
          <h3 className="font-semibold text-lg mt-0.5">{suggestion.text}</h3>
          <p className="text-slate-400 text-sm mt-1">{suggestion.description}</p>
          <p className="text-slate-400 text-xs mt-2">Verify key info first, then complete this action and set the next follow-up step.</p>
        </div>
      </div>
      <Button 
        onClick={onAction}
        className={`w-full mt-4 ${suggestion.color} hover:opacity-90 text-white border-0`}
      >
        <Icon className="w-4 h-4 mr-2" />
        {suggestion.text}
      </Button>
    </div>
  );
}
