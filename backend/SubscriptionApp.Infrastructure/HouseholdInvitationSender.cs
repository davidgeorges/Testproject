using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed record HouseholdInvitationEmailOptions(
    string Host,
    int Port,
    string User,
    string Password,
    string From,
    bool EnableSsl = true
);

public sealed class SmtpHouseholdInvitationSender(
    HouseholdInvitationEmailOptions options,
    ILogger<SmtpHouseholdInvitationSender> logger) : IHouseholdInvitationSender
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.Host)
        && !string.IsNullOrWhiteSpace(options.User)
        && !string.IsNullOrWhiteSpace(options.Password)
        && MailAddress.TryCreate(options.From, out _);

    public async Task<bool> Send(string email, string displayName, string code, DateTimeOffset expiresAt, CancellationToken ct)
    {
        if (!IsConfigured || !MailAddress.TryCreate(email, out var recipient)) return false;
        using var message = new MailMessage(new MailAddress(options.From), recipient)
        {
            Subject = "Invitation à rejoindre un foyer",
            Body = $"Bonjour {displayName},\n\nVous avez été invité à rejoindre un foyer dans l’application.\n\nCode : {code}\nExpiration : {expiresAt:dd/MM/yyyy HH:mm} UTC\n\nOuvrez Profil > Mon foyer > J’ai un code pour accepter.",
            IsBodyHtml = false,
        };
        using var client = new SmtpClient(options.Host, options.Port)
        {
            EnableSsl = options.EnableSsl,
            Credentials = new NetworkCredential(options.User, options.Password),
        };
        try { await client.SendMailAsync(message, ct); return true; }
        catch (Exception exception) { logger.LogWarning(exception, "Household invitation email could not be delivered"); return false; }
    }
}

public sealed class DisabledHouseholdInvitationSender : IHouseholdInvitationSender
{
    public bool IsConfigured => false;
    public Task<bool> Send(string email, string displayName, string code, DateTimeOffset expiresAt, CancellationToken ct) => Task.FromResult(false);
}
