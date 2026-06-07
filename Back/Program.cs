using Back.Api;
using Back.Application.Abstractions;
using Back.Application.Services;
using Back.Persistence;
using Back.Persistence.InMemory;
using Back.Persistence.Postgres;
using Back.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
var storageProvider = StorageConfiguration.GetProvider(builder.Configuration);
if (storageProvider == StorageProvider.Postgres)
{
    var connectionString = builder.Configuration.GetConnectionString("VmestraPostgres");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("Storage:Provider is Postgres, but ConnectionStrings:VmestraPostgres is empty.");
    }

    builder.Services.AddDbContext<VmestraDbContext>(options => options.UseNpgsql(connectionString));
    builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
    builder.Services.AddScoped<ISpaceRepository, PostgresSpaceRepository>();
    builder.Services.AddScoped<IHistoryRepository, PostgresHistoryRepository>();
    builder.Services.AddScoped<IIdeaRepository, PostgresIdeaRepository>();
    builder.Services.AddScoped<IClassificationRepository, PostgresClassificationRepository>();
    builder.Services.AddScoped<IPlanningRepository, PostgresPlanningRepository>();
    builder.Services.AddScoped<ICommentRepository, PostgresCommentRepository>();
    builder.Services.AddScoped<IStorageHealth, PostgresStorageHealth>();
    builder.Services.AddScoped<VmestraSeeder>();
}
else
{
    builder.Services.AddSingleton<InMemoryVmestraDatabase>();
    builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
    builder.Services.AddSingleton<ISpaceRepository, InMemorySpaceRepository>();
    builder.Services.AddSingleton<IHistoryRepository, InMemoryHistoryRepository>();
    builder.Services.AddSingleton<IIdeaRepository, InMemoryIdeaRepository>();
    builder.Services.AddSingleton<IClassificationRepository, InMemoryClassificationRepository>();
    builder.Services.AddSingleton<IPlanningRepository, InMemoryPlanningRepository>();
    builder.Services.AddSingleton<ICommentRepository, InMemoryCommentRepository>();
    builder.Services.AddSingleton<IStorageHealth, InMemoryStorageHealth>();
}
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<SpaceService>();
builder.Services.AddScoped<IdeaService>();
builder.Services.AddScoped<ClassificationService>();
builder.Services.AddScoped<PlanningService>();
builder.Services.AddScoped<HistoryService>();
builder.Services.AddScoped<CommentService>();

var app = builder.Build();

if (storageProvider == StorageProvider.Postgres)
{
    try
    {
        using var scope = app.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<VmestraSeeder>().SeedPostgres();
    }
    catch (Exception exception)
    {
        app.Logger.LogWarning(exception, "Postgres migration/seed failed during startup. The API is still running so /api/health can report storage availability.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/api/health", (IStorageHealth storage) => Results.Ok(new
{
    service = "Vmestra.Back",
    storage = storage.ProviderName,
    status = storage.IsAvailable() ? "ok" : "unavailable",
    utcNow = DateTimeOffset.UtcNow
}));

app.MapVmestraEndpoints();

app.Run();
