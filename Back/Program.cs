using Back.Api;
using Back.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSingleton<InMemoryVmestraStore>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/api/health", () => Results.Ok(new
{
    service = "Vmestra.Back",
    storage = "in-memory",
    status = "ok",
    utcNow = DateTimeOffset.UtcNow
}));

app.MapVmestraEndpoints();

app.Run();
