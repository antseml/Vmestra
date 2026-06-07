using Back.Persistence.Postgres;
using Microsoft.EntityFrameworkCore;

namespace Back.Persistence;

public enum StorageProvider
{
    InMemory,
    Postgres
}

public interface IStorageHealth
{
    string ProviderName { get; }
    bool IsAvailable();
}

public sealed class InMemoryStorageHealth : IStorageHealth
{
    public string ProviderName => "in-memory";

    public bool IsAvailable() => true;
}

public sealed class PostgresStorageHealth(VmestraDbContext db) : IStorageHealth
{
    public string ProviderName => "postgres";

    public bool IsAvailable() => db.Database.CanConnect();
}

public static class StorageConfiguration
{
    public static StorageProvider GetProvider(IConfiguration configuration)
    {
        var configured = configuration["Storage:Provider"];
        return string.Equals(configured, "Postgres", StringComparison.OrdinalIgnoreCase)
            ? StorageProvider.Postgres
            : StorageProvider.InMemory;
    }
}
