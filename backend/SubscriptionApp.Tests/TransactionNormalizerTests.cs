using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class TransactionNormalizerTests
{
    [Fact]
    public void NormalizerRemovesBankPrefixesNormalizesCurrencyAndClassifiesKnownMerchant()
    {
        var transaction = new BankTransaction { MerchantName = "  PRLV SEPA   netflix ", Category = "other", Currency = " eur " };
        new TransactionNormalizer().Normalize([transaction]);
        Assert.Equal("Netflix", transaction.MerchantName);
        Assert.Equal("streaming", transaction.Category);
        Assert.Equal("EUR", transaction.Currency);
    }

    [Fact]
    public void NormalizerPreservesSupportedProviderCategory()
    {
        var transaction = new BankTransaction { MerchantName = "Fournisseur inconnu", Category = "insurance", Currency = "EUR" };
        new TransactionNormalizer().Normalize([transaction]);
        Assert.Equal("insurance", transaction.Category);
    }

    [Theory]
    [InlineData("ORANGE", "other", "mobile")]
    [InlineData("EDF", "other", "energy")]
    [InlineData("AXA FRANCE", "other", "insurance")]
    [InlineData("Fournisseur", "EXPENSES_HOUSEHOLD_ENERGY", "energy")]
    [InlineData("Fournisseur", "expenses:entertainment:streaming", "streaming")]
    public void NormalizerMapsRealMerchantAndTinkCategories(string merchant, string supplied, string expected)
    {
        var transaction = new BankTransaction { MerchantName = merchant, Category = supplied, Currency = "EUR" };
        new TransactionNormalizer().Normalize([transaction]);
        Assert.Equal(expected, transaction.Category);
    }

    [Fact]
    public void NormalizerMarksOppositeOperationsAcrossAccountsAsInternalTransfers()
    {
        var outgoing = new BankTransaction { AccountKey = "checking", BookedAt = new(2026, 9, 4), Amount = -250, MerchantName = "Virement", Category = "transfer", Currency = "EUR" };
        var incoming = new BankTransaction { AccountKey = "savings", BookedAt = new(2026, 9, 5), Amount = 250, MerchantName = "Virement reçu", Category = "transfer", Currency = "EUR" };

        new TransactionNormalizer().Normalize([outgoing, incoming]);

        Assert.True(outgoing.IsInternalTransfer);
        Assert.True(incoming.IsInternalTransfer);
    }

    [Fact]
    public void NormalizerDoesNotTreatAnUnmatchedTransferAsInternal()
    {
        var transaction = new BankTransaction { AccountKey = "checking", BookedAt = new(2026, 9, 4), Amount = -250, MerchantName = "Virement propriétaire", Category = "transfer", Currency = "EUR" };

        new TransactionNormalizer().Normalize([transaction]);

        Assert.False(transaction.IsInternalTransfer);
    }
}
