import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      lead_id,
      appointment_type,
      title,
      description,
      location,
      start_time,
      end_time,
      calendar_provider,
      attendee_email,
    } = await req.json();

    if (!lead_id || !start_time || !end_time) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get calendar connection
    let eventId = null;
    let calendarUrl = null;

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection(
        calendar_provider === 'outlook' ? 'outlook' : 'googlecalendar'
      );

      if (calendar_provider === 'google') {
        // Create Google Calendar event
        const event = {
          summary: title,
          description: description,
          location: location,
          start: {
            dateTime: start_time,
            timeZone: 'America/Chicago',
          },
          end: {
            dateTime: end_time,
            timeZone: 'America/Chicago',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 15 },
              { method: 'email', minutes: 60 },
            ],
          },
        };

        if (attendee_email) {
          event.attendees = [{ email: attendee_email }];
        }

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        const data = await response.json();
        eventId = data.id;
        calendarUrl = data.htmlLink;
      } else {
        // Create Outlook Calendar event
        const event = {
          subject: title,
          body: {
            contentType: 'Text',
            content: description,
          },
          start: {
            dateTime: start_time,
            timeZone: 'Central Standard Time',
          },
          end: {
            dateTime: end_time,
            timeZone: 'Central Standard Time',
          },
          location: {
            displayName: location,
          },
          isReminderOn: true,
          reminderMinutesBeforeStart: 15,
        };

        if (attendee_email) {
          event.attendees = [
            {
              emailAddress: { address: attendee_email },
              type: 'required',
            },
          ];
        }

        const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          throw new Error(`Outlook Calendar API error: ${response.statusText}`);
        }

        const data = await response.json();
        eventId = data.id;
        calendarUrl = data.webLink;
      }
    } catch (calendarError) {
      console.error('Calendar API error:', calendarError);
      // Continue to create task even if calendar sync fails
    }

    // Create task in the system
    const task = await base44.entities.Task.create({
      lead_id,
      task_type: appointment_type === 'call' ? 'Call' : 'Appointment',
      description: title,
      due_date: start_time,
      status: 'Open',
      auto_generated: true,
    });

    // Update lead activity
    await base44.entities.Lead.update(lead_id, {
      last_activity_date: new Date().toISOString(),
      next_followup_date: start_time,
    });

    // Log the appointment as a message
    await base44.entities.Message.create({
      lead_id,
      direction: 'Outbound',
      channel: 'Call',
      message_text: `Scheduled ${appointment_type} for ${new Date(start_time).toLocaleString()}${
        eventId ? ' - Synced to calendar' : ''
      }`,
      message_timestamp: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      task_id: task.id,
      event_id: eventId,
      calendar_url: calendarUrl,
      calendar_synced: !!eventId,
      message: eventId
        ? 'Appointment created and synced to calendar'
        : 'Appointment created (calendar sync unavailable)',
    });
  } catch (error) {
    console.error('Create calendar event error:', error);
    return Response.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
});