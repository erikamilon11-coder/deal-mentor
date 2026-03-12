import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { force_sync } = await req.json();

    // Get Google Calendar connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Fetch all open tasks and upcoming appointments
    const tasks = await base44.asServiceRole.entities.Task.filter({ status: 'Open' });
    const leads = await base44.asServiceRole.entities.Lead.list();

    let syncedCount = 0;
    const errors = [];

    for (const task of tasks) {
      try {
        // Skip if already synced and not force sync
        if (task.calendar_event_id && !force_sync) {
          continue;
        }

        const lead = leads.find(l => l.id === task.lead_id);
        const summary = task.description || `${task.task_type}: ${lead?.property_address || 'Unknown Lead'}`;
        const dueDate = new Date(task.due_date);

        const event = {
          summary: summary,
          description: `Lead: ${lead?.property_address || 'Unknown'}\nStatus: ${lead?.status || 'Unknown'}\nTask Type: ${task.task_type}`,
          start: {
            dateTime: dueDate.toISOString(),
            timeZone: 'America/Chicago',
          },
          end: {
            dateTime: new Date(dueDate.getTime() + 30 * 60000).toISOString(), // 30 min duration
            timeZone: 'America/Chicago',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
            ],
          },
        };

        let calendarEventId = task.calendar_event_id;

        if (calendarEventId) {
          // Update existing event
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Failed to update event: ${updateResponse.statusText}`);
          }
        } else {
          // Create new event
          const createResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
            }
          );

          if (!createResponse.ok) {
            throw new Error(`Failed to create event: ${createResponse.statusText}`);
          }

          const createdEvent = await createResponse.json();
          calendarEventId = createdEvent.id;

          // Update task with calendar event ID
          await base44.asServiceRole.entities.Task.update(task.id, {
            calendar_event_id: calendarEventId,
          });
        }

        syncedCount++;
      } catch (error) {
        errors.push({
          taskId: task.id,
          error: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : null,
      message: `Successfully synced ${syncedCount} tasks to Google Calendar`,
    });

  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});