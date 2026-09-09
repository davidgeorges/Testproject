using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.Repositories;

namespace SubscriptionApp.Api;

// The development server must not create a persistent key ring in the user's OS profile.
public sealed class EphemeralKeyRepository : IXmlRepository
{
    private readonly List<XElement> elements = [];

    public IReadOnlyCollection<XElement> GetAllElements()
    {
        lock (elements)
            return elements.Select(e => new XElement(e)).ToArray();
    }

    public void StoreElement(XElement element, string friendlyName)
    {
        lock (elements)
            elements.Add(new XElement(element));
    }
}
