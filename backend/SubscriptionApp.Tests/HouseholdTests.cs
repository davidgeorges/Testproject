using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class HouseholdTests
{
    [Fact]
    public async Task InvitationCanReplaceAnEmptyPersonalHouseholdAndGrantEditorAccess()
    {
        var store = new InMemoryWorkspaceStore();
        var owner = "owner";
        var guest = "guest";
        var home = await store.Household(owner, default);
        var invited = new HouseholdMember
        {
            HouseholdId = home.Household.Id,
            DisplayName = "Julie",
            Relationship = "partner",
            Email = "julie@example.fr",
            AccountStatus = "invited",
            AccessRole = "editor",
            InvitationTokenHash = "token-hash",
            InvitationExpiresAt = DateTimeOffset.UtcNow.AddDays(1),
        };
        await store.SaveHouseholdMember(owner, invited, default);

        var emptyGuestHome = await store.Household(guest, default);
        Assert.NotEqual(home.Household.Id, emptyGuestHome.Household.Id);
        Assert.True(await store.AcceptHouseholdInvitation(guest, "token-hash", DateTimeOffset.UtcNow, default));

        var joined = await store.Household(guest, default);
        Assert.Equal(home.Household.Id, joined.Household.Id);
        Assert.True(joined.CanEdit);
        Assert.False(joined.CanManageMembers);
        Assert.Contains(joined.Members, member => member.Id == invited.Id && member.LinkedUserId is not null);
    }
}
