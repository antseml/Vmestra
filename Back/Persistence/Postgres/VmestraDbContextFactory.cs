using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Back.Persistence.Postgres;

public sealed class VmestraDbContextFactory : IDesignTimeDbContextFactory<VmestraDbContext>
{
    public VmestraDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("VmestraPostgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = "Host=localhost;Port=5432;Database=vmestra;Username=postgres;Password=postgres";
        }

        var options = new DbContextOptionsBuilder<VmestraDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new VmestraDbContext(options);
    }
}
