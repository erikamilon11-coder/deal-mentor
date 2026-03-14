import { Card } from "@/components/ui/card";
import { Lightbulb, CheckCircle2, Clock, Zap } from "lucide-react";

export default function NurtureSequenceGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">How Nurture Sequences Work</h3>
            <p className="text-sm text-blue-800 mt-1">
              Create automated email/SMS campaigns that trigger based on lead status changes. Messages are sent on a schedule you define, with automatic variable replacement for personalization.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-semibold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">Create a Campaign</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              Click "New Campaign" to set up an automated sequence
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-semibold flex-shrink-0">
            2
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">Configure Trigger</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              Set the trigger condition (e.g., when lead status changes to "New")
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-semibold flex-shrink-0">
            3
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">Build Sequence</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              Add message steps with delays (e.g., send immediately, then after 3 days, then after 7 days)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-semibold flex-shrink-0">
            4
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">Activate & Monitor</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              Turn on the campaign to start auto-enrolling matching leads
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-3">Example: New Lead Welcome Sequence</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-medium">Trigger:</span> Status changes to "New"
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-medium">Step 1:</span> Send welcome email immediately
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-medium">Step 2:</span> Send follow-up SMS after 2 days
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-medium">Step 3:</span> Send property inquiry email after 5 days
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 border-green-200">
        <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Available Message Variables
        </h4>
        <div className="space-y-1 text-sm font-mono text-green-800 bg-white bg-opacity-50 p-3 rounded-lg">
          <div>{'{{property_address}}'} - Full property address</div>
          <div>{'{{owner_name}}'} - Owner name</div>
          <div>{'{{city}}'} - City</div>
          <div>{'{{state}}'} - State</div>
        </div>
      </Card>
    </div>
  );
}