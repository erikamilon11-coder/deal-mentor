import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    // Get Google Calendar connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");
    
    const task = data;
    const taskId = event.entity_id;
    
    // Only sync Follow-up Text, Call, and Appointment tasks
    if (!["Follow-up Text", "Call", "Appointment"].includes(task.task_type)) {
      return Response.json({ 
        success: true, 
        message: "Task type not synced to calendar" 
      });
    }
    
    // Get lead details for event description
    const lead = await base44.asServiceRole.entities.Lead.filter({ id: task.lead_id }).then(r => r[0]);
    
    if (!lead) {
      return Response.json({ 
        success: false, 
        error: "Lead not found" 
      }, { status: 404 });
    }
    
    const eventTitle = `${task.task_type}: ${lead.property_address}`;
    const eventDescription = `${task.description || ''}\n\nProperty: ${lead.property_address}, ${lead.city}, ${lead.state}\nLead Status: ${lead.status}\n\nTask ID: ${taskId}`;
    
    // Calculate event time
    const dueDate = new Date(task.due_date);
    const endDate = new Date(dueDate.getTime() + (30 * 60 * 1000)); // 30 min duration
    
    if (event.type === "create") {
      // Create calendar event
      const calendarEvent = {
        summary: eventTitle,
        description: eventDescription,
        start: {
          dateTime: dueDate.toISOString(),
          timeZone: "UTC"
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "UTC"
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 }
          ]
        }
      };
      
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(calendarEvent)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Calendar API error: ${error}`);
      }
      
      const createdEvent = await response.json();
      
      // Store calendar event ID in task
      await base44.asServiceRole.entities.Task.update(taskId, {
        calendar_event_id: createdEvent.id
      });
      
      return Response.json({ 
        success: true, 
        calendar_event_id: createdEvent.id,
        message: "Task synced to Google Calendar" 
      });
      
    } else if (event.type === "update") {
      // Update calendar event if it exists
      const existingTask = await base44.asServiceRole.entities.Task.filter({ id: taskId }).then(r => r[0]);
      
      if (existingTask?.calendar_event_id) {
        const calendarEvent = {
          summary: eventTitle,
          description: eventDescription,
          start: {
            dateTime: dueDate.toISOString(),
            timeZone: "UTC"
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: "UTC"
          }
        };
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingTask.calendar_event_id}`,
          {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(calendarEvent)
          }
        );
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Google Calendar API error: ${error}`);
        }
        
        return Response.json({ 
          success: true, 
          message: "Calendar event updated" 
        });
      }
      
      return Response.json({ 
        success: true, 
        message: "No calendar event to update" 
      });
      
    } else if (event.type === "delete") {
      // Delete calendar event if it exists
      const existingTask = await base44.asServiceRole.entities.Task.filter({ id: taskId }).then(r => r[0]);
      
      if (existingTask?.calendar_event_id) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingTask.calendar_event_id}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          }
        );
        
        if (!response.ok && response.status !== 404) {
          const error = await response.text();
          throw new Error(`Google Calendar API error: ${error}`);
        }
        
        return Response.json({ 
          success: true, 
          message: "Calendar event deleted" 
        });
      }
      
      return Response.json({ 
        success: true, 
        message: "No calendar event to delete" 
      });
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { 
      status: 500 
    });
  }
});