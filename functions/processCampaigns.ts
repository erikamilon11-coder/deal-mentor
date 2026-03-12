import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      enrolled: 0,
      sent: 0,
      completed: 0,
      errors: 0
    };

    // Get all active campaigns
    const campaigns = await base44.asServiceRole.entities.CampaignSequence.filter({ is_active: true });

    // Get all leads
    const leads = await base44.asServiceRole.entities.Lead.list();

    const now = new Date();

    // Process each campaign
    for (const campaign of campaigns) {
      const steps = JSON.parse(campaign.sequence_steps || "[]");
      if (steps.length === 0) continue;

      // Find leads that match the trigger condition
      for (const lead of leads) {
        try {
          let shouldEnroll = false;

          // Check trigger conditions
          if (campaign.trigger_type === "status_change") {
            shouldEnroll = lead.status === campaign.trigger_status;
          } else if (campaign.trigger_type === "days_since_contact") {
            if (lead.last_contact_date) {
              const daysSince = Math.floor((now - new Date(lead.last_contact_date)) / (1000 * 60 * 60 * 24));
              shouldEnroll = daysSince >= campaign.trigger_days;
            }
          } else if (campaign.trigger_type === "days_since_created") {
            const daysSince = Math.floor((now - new Date(lead.created_date)) / (1000 * 60 * 60 * 24));
            shouldEnroll = daysSince >= campaign.trigger_days;
          }

          if (!shouldEnroll) continue;

          // Check if already enrolled
          const existingEnrollments = await base44.asServiceRole.entities.CampaignEnrollment.filter({
            lead_id: lead.id,
            campaign_id: campaign.id
          });

          if (existingEnrollments.length > 0) {
            // Process existing enrollment
            const enrollment = existingEnrollments[0];
            
            if (enrollment.status !== "Active") continue;
            if (!enrollment.next_send_date || new Date(enrollment.next_send_date) > now) continue;

            // Send the current step
            const currentStep = steps[enrollment.current_step];
            if (!currentStep) {
              // Campaign completed
              await base44.asServiceRole.entities.CampaignEnrollment.update(enrollment.id, {
                status: "Completed"
              });
              results.completed++;
              continue;
            }

            // Get owner for recipient info
            const owners = await base44.asServiceRole.entities.Owner.filter({ lead_id: lead.id });
            const owner = owners[0];

            // Replace variables in message
            let message = currentStep.message
              .replace(/{{property_address}}/g, lead.property_address || '')
              .replace(/{{owner_name}}/g, owner?.owner_name || '')
              .replace(/{{city}}/g, lead.city || '')
              .replace(/{{state}}/g, lead.state || '');

            // Send based on channel
            if (campaign.channel === "Email" && owner?.email) {
              let subject = currentStep.subject
                .replace(/{{property_address}}/g, lead.property_address || '')
                .replace(/{{owner_name}}/g, owner?.owner_name || '');

              await base44.asServiceRole.integrations.Core.SendEmail({
                to: owner.email,
                subject: subject,
                body: message
              });

              // Log email
              await base44.asServiceRole.entities.EmailLog.create({
                lead_id: lead.id,
                campaign_id: campaign.id,
                sequence_number: enrollment.current_step + 1,
                subject: subject,
                body: message,
                sent_date: now.toISOString(),
                recipient_email: owner.email
              });

              results.sent++;
            } else if (campaign.channel === "SMS" && owner) {
              // Get phone numbers
              const phones = await base44.asServiceRole.entities.Phone.filter({ 
                owner_id: owner.id,
                do_not_contact: false
              });

              if (phones.length > 0) {
                await base44.asServiceRole.functions.invoke('sendSMS', {
                  phone: phones[0].phone_number,
                  message: message
                });

                // Log message
                await base44.asServiceRole.entities.Message.create({
                  lead_id: lead.id,
                  direction: "Outbound",
                  channel: "SMS",
                  message_text: message,
                  message_timestamp: now.toISOString()
                });

                results.sent++;
              }
            }

            // Update enrollment to next step
            const nextStep = enrollment.current_step + 1;
            const nextStepData = steps[nextStep];
            
            if (nextStepData) {
              const nextSendDate = new Date(now);
              nextSendDate.setDate(nextSendDate.getDate() + nextStepData.delay_days);

              await base44.asServiceRole.entities.CampaignEnrollment.update(enrollment.id, {
                current_step: nextStep,
                next_send_date: nextSendDate.toISOString(),
                last_sent_date: now.toISOString()
              });
            } else {
              // No more steps, mark as completed
              await base44.asServiceRole.entities.CampaignEnrollment.update(enrollment.id, {
                status: "Completed",
                last_sent_date: now.toISOString()
              });
              results.completed++;
            }

          } else {
            // Create new enrollment
            const firstStep = steps[0];
            const nextSendDate = new Date(now);
            
            // First step sends immediately (delay_days should be 0)
            if (firstStep.delay_days > 0) {
              nextSendDate.setDate(nextSendDate.getDate() + firstStep.delay_days);
            }

            await base44.asServiceRole.entities.CampaignEnrollment.create({
              lead_id: lead.id,
              campaign_id: campaign.id,
              current_step: 0,
              enrollment_date: now.toISOString(),
              next_send_date: nextSendDate.toISOString(),
              status: "Active"
            });

            results.enrolled++;
          }
        } catch (error) {
          console.error(`Error processing lead ${lead.id} for campaign ${campaign.id}:`, error);
          results.errors++;
        }
      }
    }

    return Response.json({
      success: true,
      results,
      timestamp: now.toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});