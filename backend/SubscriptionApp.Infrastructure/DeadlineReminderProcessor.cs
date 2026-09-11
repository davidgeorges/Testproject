using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class DeadlineReminderProcessor(IWorkspaceStore store, TimeProvider time)
{
    public async Task<int> RunOnce(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var created = 0;
        foreach (var deadline in await store.DueDeadlineReminders(now, 100, ct))
        {
            await store.AddNotification(new UserNotification
            {
                UserId = deadline.UserId,
                Type = "deadline_reminder",
                Title = deadline.Title,
                Body = ReminderBody(deadline.DueAt, now),
                ResourceId = deadline.Id.ToString(),
                SourceKey = $"deadline:{deadline.Id}:{deadline.DueAt:O}:{deadline.ReminderMinutesBefore}",
            }, ct);
            await store.MarkDeadlineReminderSent(deadline.Id, now, ct);
            created++;
        }

        var today = DateOnly.FromDateTime(now.UtcDateTime);
        foreach (var document in await store.DueDocumentDeadlines(today, today.AddDays(7), ct))
        {
            await store.AddNotification(new UserNotification
            {
                UserId = document.UserId,
                Type = "document_deadline",
                Title = document.Title,
                Body = $"Échéance le {document.DueDate:dd/MM/yyyy}.",
                ResourceId = document.Id.ToString(),
                SourceKey = $"document-deadline:{document.Id}:{document.DueDate:yyyy-MM-dd}",
            }, ct);
            created++;
        }
        return created;
    }

    private static string ReminderBody(DateTimeOffset dueAt, DateTimeOffset now)
    {
        var remaining = dueAt - now;
        if (remaining <= TimeSpan.Zero) return "Cette échéance est arrivée.";
        if (remaining.TotalHours < 24) return $"Échéance aujourd’hui à {dueAt.ToLocalTime():HH:mm}.";
        var days = Math.Max(1, (int)Math.Ceiling(remaining.TotalDays));
        return $"Échéance dans {days} jour{(days > 1 ? "s" : "")}, le {dueAt.ToLocalTime():dd/MM/yyyy}.";
    }
}
