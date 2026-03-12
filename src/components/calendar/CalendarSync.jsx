import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMinutes } from "date-fns";

const APPOINTMENT_TYPES = [
  { value: "viewing", label: "Property Viewing", duration: 30, color: "blue" },
  { value: "call", label: "Follow-up Call", duration: 15, color: "green" },
  { value: "meeting", label: "Negotiation Meeting", duration: 60, color: "purple" },
  { value: "inspection", label: "Property Inspection", duration: 120, color: "amber" },
];

export default function CalendarSync({ lead, owner }) {
  const [appointmentType, setAppointmentType] = useState("viewing");
  const [startDateTime, setStartDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarProvider, setCalendarProvider] = useState("google");
  const queryClient = useQueryClient();

  const selectedType = APPOINTMENT_TYPES.find(t => t.value === appointmentType);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("createCalendarEvent", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", lead.id] });
      setStartDateTime("");
      setNotes("");
    },
  });

  const handleCreateAppointment = () => {
    if (!startDateTime) return;

    const startDate = new Date(startDateTime);
    const endDate = addMinutes(startDate, selectedType.duration);

    const eventData = {
      lead_id: lead.id,
      appointment_type: appointmentType,
      title: `${selectedType.label} - ${lead.property_address}`,
      description: `${selectedType.label} for property at ${lead.property_address}\n\nOwner: ${owner?.owner_name || "N/A"}\nNotes: ${notes || "None"}`,
      location: lead.property_address + ", " + lead.city + ", " + lead.state,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      calendar_provider: calendarProvider,
      attendee_email: owner?.email,
    };

    createAppointmentMutation.mutate(eventData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Schedule Appointment</h3>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="w-3 h-3 mr-1" />
          Calendar Sync
        </Badge>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-4">
        {/* Calendar Provider */}
        <div>
          <Label className="text-slate-700 mb-2 block">Calendar Provider</Label>
          <div className="flex gap-2">
            <Button
              variant={calendarProvider === "google" ? "default" : "outline"}
              onClick={() => setCalendarProvider("google")}
              className="flex-1"
            >
              Google Calendar
            </Button>
            <Button
              variant={calendarProvider === "outlook" ? "default" : "outline"}
              onClick={() => setCalendarProvider("outlook")}
              className="flex-1"
            >
              Outlook
            </Button>
          </div>
        </div>

        {/* Appointment Type */}
        <div>
          <Label className="text-slate-700">Type</Label>
          <Select value={appointmentType} onValueChange={setAppointmentType}>
            <SelectTrigger className="mt-1.5 h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${type.color}-500`} />
                    {type.label} ({type.duration} min)
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date & Time */}
        <div>
          <Label className="text-slate-700">Date & Time</Label>
          <Input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            className="mt-1.5 h-11 rounded-xl"
          />
          {startDateTime && (
            <p className="text-xs text-slate-500 mt-1.5">
              Duration: {selectedType.duration} minutes (ends at{" "}
              {format(addMinutes(new Date(startDateTime), selectedType.duration), "h:mm a")})
            </p>
          )}
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Location</p>
              <p className="text-sm text-slate-700 font-medium">
                {lead.property_address}, {lead.city}, {lead.state}
              </p>
            </div>
          </div>
        </div>

        {/* Attendee */}
        {owner?.email && (
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Invite</p>
                <p className="text-sm text-slate-700 font-medium">
                  {owner.owner_name} ({owner.email})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <Label className="text-slate-700">Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details..."
            className="mt-1.5 rounded-xl min-h-[80px]"
          />
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreateAppointment}
          disabled={!startDateTime || createAppointmentMutation.isPending}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
        >
          {createAppointmentMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Add to {calendarProvider === "google" ? "Google" : "Outlook"} Calendar
            </>
          )}
        </Button>

        {/* Success/Error Messages */}
        {createAppointmentMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Appointment Created!</p>
              <p className="text-xs text-green-700 mt-0.5">
                Event added to your calendar and task created
              </p>
            </div>
          </div>
        )}

        {createAppointmentMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Failed to Create</p>
              <p className="text-xs text-red-700 mt-0.5">
                {createAppointmentMutation.error?.message || "Please connect your calendar first"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <LinkIcon className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-900">Calendar Sync Enabled</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Appointments auto-sync with your calendar. You'll receive reminders 15 minutes before.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}