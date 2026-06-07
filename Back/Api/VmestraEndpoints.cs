using Back.Domain;
using Back.Infrastructure;

namespace Back.Api;

public static class VmestraEndpoints
{
    public static IEndpointRouteBuilder MapVmestraEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users", (InMemoryVmestraStore store) => Results.Ok(store.GetUsers()))
            .WithTags("Users");

        var spaces = app.MapGroup("/api/spaces").WithTags("Spaces");
        spaces.MapGet("/", (InMemoryVmestraStore store, Guid? userId) => Results.Ok(store.GetSpaces(userId)));
        spaces.MapPost("/", (InMemoryVmestraStore store, CreateSpaceRequest request) =>
        {
            if (IsBlank(request.Name))
            {
                return Results.BadRequest("Space name is required.");
            }

            var space = store.CreateSpace(request);
            return Results.Created($"/api/spaces/{space.Id}", space);
        });
        spaces.MapGet("/{spaceId:guid}", (InMemoryVmestraStore store, Guid spaceId) =>
            FoundOrNotFound(store.GetSpace(spaceId)));
        spaces.MapPatch("/{spaceId:guid}", (InMemoryVmestraStore store, Guid spaceId, UpdateSpaceRequest request) =>
            FoundOrNotFound(store.UpdateSpace(spaceId, request)));
        spaces.MapPost("/{spaceId:guid}/archive", (InMemoryVmestraStore store, Guid spaceId) =>
            FoundOrNotFound(store.UpdateSpace(spaceId, new UpdateSpaceRequest(null, SpaceState.Archived))));

        var members = spaces.MapGroup("/{spaceId:guid}/members").WithTags("Space members");
        members.MapGet("/", (InMemoryVmestraStore store, Guid spaceId) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetMembers(spaceId)) : Results.NotFound());
        members.MapPost("/", (InMemoryVmestraStore store, Guid spaceId, AddSpaceMemberRequest request) =>
            FoundOrCreated($"/api/spaces/{spaceId}/members", store.AddMember(spaceId, request)));
        members.MapPatch("/{memberId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request) =>
            FoundOrNotFound(store.UpdateMember(spaceId, memberId, request)));
        members.MapDelete("/{memberId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid memberId) =>
            store.RemoveMember(spaceId, memberId) ? Results.NoContent() : Results.NotFound());

        var ideas = spaces.MapGroup("/{spaceId:guid}/ideas").WithTags("Ideas");
        ideas.MapGet("/", (InMemoryVmestraStore store, Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived = false) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetIdeas(spaceId, folderId, tagId, categoryId, state, includeArchived)) : Results.NotFound());
        ideas.MapPost("/", (InMemoryVmestraStore store, Guid spaceId, CreateIdeaRequest request) =>
            IsBlank(request.Text)
                ? Results.BadRequest("Idea text is required.")
                : FoundOrCreated($"/api/spaces/{spaceId}/ideas", store.CreateIdea(spaceId, request)));
        ideas.MapGet("/{ideaId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid ideaId) =>
            FoundOrNotFound(store.GetIdea(spaceId, ideaId)));
        ideas.MapPatch("/{ideaId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid ideaId, UpdateIdeaRequest request) =>
            FoundOrNotFound(store.UpdateIdea(spaceId, ideaId, request)));

        ideas.MapGet("/{ideaId:guid}/comments", (InMemoryVmestraStore store, Guid spaceId, Guid ideaId) =>
            store.GetIdea(spaceId, ideaId) is null ? Results.NotFound() : Results.Ok(store.GetComments(spaceId, ideaId)));
        ideas.MapPost("/{ideaId:guid}/comments", (InMemoryVmestraStore store, Guid spaceId, Guid ideaId, CreateCommentRequest request) =>
            IsBlank(request.Text)
                ? Results.BadRequest("Comment text is required.")
                : FoundOrCreated($"/api/spaces/{spaceId}/ideas/{ideaId}/comments", store.AddComment(spaceId, ideaId, request)));

        ideas.MapPost("/{ideaId:guid}/plans", (InMemoryVmestraStore store, Guid spaceId, Guid ideaId, ScheduleIdeaRequest request) =>
            request.StartsAt == default
                ? Results.BadRequest("Plan startsAt is required.")
                : FoundOrCreated($"/api/spaces/{spaceId}/plan", store.ScheduleIdea(spaceId, ideaId, request)));

        var folders = spaces.MapGroup("/{spaceId:guid}/folders").WithTags("Folders");
        folders.MapGet("/", (InMemoryVmestraStore store, Guid spaceId) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetFolders(spaceId)) : Results.NotFound());
        folders.MapPost("/", (InMemoryVmestraStore store, Guid spaceId, CreateNamedItemRequest request) =>
            IsBlank(request.Name) ? Results.BadRequest("Folder name is required.") : FoundOrCreated($"/api/spaces/{spaceId}/folders", store.CreateFolder(spaceId, request)));
        folders.MapPatch("/{folderId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid folderId, UpdateNamedItemRequest request) =>
            FoundOrNotFound(store.UpdateFolder(spaceId, folderId, request)));
        folders.MapDelete("/{folderId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid folderId) =>
            store.RemoveFolder(spaceId, folderId) ? Results.NoContent() : Results.NotFound());

        var tags = spaces.MapGroup("/{spaceId:guid}/tags").WithTags("Tags");
        tags.MapGet("/", (InMemoryVmestraStore store, Guid spaceId) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetTags(spaceId)) : Results.NotFound());
        tags.MapPost("/", (InMemoryVmestraStore store, Guid spaceId, CreateTagRequest request) =>
            IsBlank(request.Name) ? Results.BadRequest("Tag name is required.") : FoundOrCreated($"/api/spaces/{spaceId}/tags", store.CreateTag(spaceId, request)));
        tags.MapPatch("/{tagId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid tagId, UpdateTagRequest request) =>
            FoundOrNotFound(store.UpdateTag(spaceId, tagId, request)));
        tags.MapDelete("/{tagId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid tagId) =>
            store.RemoveTag(spaceId, tagId) ? Results.NoContent() : Results.NotFound());

        var categories = spaces.MapGroup("/{spaceId:guid}/categories").WithTags("Categories");
        categories.MapGet("/", (InMemoryVmestraStore store, Guid spaceId) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetCategories(spaceId)) : Results.NotFound());
        categories.MapPost("/", (InMemoryVmestraStore store, Guid spaceId, CreateNamedItemRequest request) =>
            IsBlank(request.Name) ? Results.BadRequest("Category name is required.") : FoundOrCreated($"/api/spaces/{spaceId}/categories", store.CreateCategory(spaceId, request)));
        categories.MapPatch("/{categoryId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid categoryId, UpdateNamedItemRequest request) =>
            FoundOrNotFound(store.UpdateCategory(spaceId, categoryId, request)));
        categories.MapDelete("/{categoryId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid categoryId) =>
            store.RemoveCategory(spaceId, categoryId) ? Results.NoContent() : Results.NotFound());

        var plan = spaces.MapGroup("/{spaceId:guid}/plan").WithTags("Planning");
        plan.MapGet("/", (InMemoryVmestraStore store, Guid spaceId, DateTimeOffset? from, DateTimeOffset? to) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetSchedule(spaceId, from, to)) : Results.NotFound());
        plan.MapPatch("/{scheduledIdeaId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request) =>
            FoundOrNotFound(store.UpdateSchedule(spaceId, scheduledIdeaId, request)));

        var history = spaces.MapGroup("/{spaceId:guid}/history").WithTags("History");
        history.MapGet("/", (InMemoryVmestraStore store, Guid spaceId, Guid? ideaId) =>
            SpaceExists(store, spaceId) ? Results.Ok(store.GetHistory(spaceId, ideaId)) : Results.NotFound());
        history.MapPost("/", (InMemoryVmestraStore store, Guid spaceId, CreateHistoryEntryRequest request) =>
            IsBlank(request.Title) ? Results.BadRequest("History title is required.") : FoundOrCreated($"/api/spaces/{spaceId}/history", store.CreateHistoryEntry(spaceId, request)));
        history.MapPatch("/{entryId:guid}", (InMemoryVmestraStore store, Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request) =>
            FoundOrNotFound(store.UpdateHistoryEntry(spaceId, entryId, request)));

        return app;
    }

    private static bool IsBlank(string? value) => string.IsNullOrWhiteSpace(value);

    private static bool SpaceExists(InMemoryVmestraStore store, Guid spaceId) => store.GetSpace(spaceId) is not null;

    private static IResult FoundOrNotFound<T>(T? value) => value is null ? Results.NotFound() : Results.Ok(value);

    private static IResult FoundOrCreated<T>(string location, T? value) => value is null ? Results.NotFound() : Results.Created(location, value);
}
