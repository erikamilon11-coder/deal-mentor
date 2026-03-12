import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function EmailComposer({ lead, owner, onEmailSent, onCancel }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const recipientEmail = owner?.owner_name ? `${owner.owner_name}` : "Owner";
  const recipientAddress = owner?.mailing_address || lead?.property_address;

  const handleSend = async () => {
    if (!subject || !body) {
      alert("Please fill in both subject and message");
      return;
    }

    setIsSending(true);

    try {
      // Send email via Core integration
      await base44.integrations.Core.SendEmail({
        to: owner?.owner_name || "owner@example.com",
        subject: subject,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Dear ${recipientEmail},</p>
            <div style="margin: 20px 0; line-height: 1.6;">
              ${body.replace(/\n/g, '<br>')}
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              <strong>Property:</strong> ${lead.property_address}<br>
              ${recipientAddress ? `<strong>Address:</strong> ${recipientAddress}` : ''}
            </p>
          </div>
        `,
      });

      // Log email as a message
      await base44.entities.Message.create({
        lead_id: lead.id,
        direction: "Outbound",
        channel: "Email",
        message_text: `Subject: ${subject}\n\n${body}`,
        message_timestamp: new Date().toISOString(),
      });

      setSubject("");
      setBody("");
      if (onEmailSent) onEmailSent();
    } catch (error) {
      alert("Failed to send email: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Send Email</h3>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="bg-slate-50 rounded-lg p-3 text-sm">
        <p className="text-slate-600">
          <span className="font-medium">To:</span> {recipientEmail}
        </p>
        <p className="text-slate-500 text-xs mt-1">
          {recipientAddress}
        </p>
      </div>

      <div>
        <Label className="text-slate-700">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject..."
          className="mt-1.5 h-11 rounded-xl"
        />
      </div>

      <div>
        <Label className="text-slate-700">Message</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your email message..."
          className="mt-1.5 min-h-[150px] rounded-xl"
        />
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSend}
          disabled={isSending || !subject || !body}
          className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}