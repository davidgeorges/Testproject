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
}
