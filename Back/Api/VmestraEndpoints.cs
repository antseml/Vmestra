using Back.Application.Services;
using Back.Domain;
using System.Security.Claims;

namespace Back.Api;

public static class VmestraEndpoints
{
    public static IEndpointRouteBuilder MapVmestraEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Auth");
        auth.MapPost("/register", (AuthService service, RegisterRequest request) =>
            service.Register(request).ToCreatedHttpResult(response => $"/api/users/{response.User.Id}"));
        auth.MapPost("/login", (AuthService service, LoginRequest request) =>
            service.Login(request).ToHttpResult());
        auth.MapGet("/me", (AuthService service, ClaimsPrincipal principal) =>
        {
            var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdValue, out var userId)
                ? service.GetCurrentUser(userId).ToHttpResult()
                : Results.Unauthorized();
        }).RequireAuthorization();

        app.MapGet("/api/users", (UserService service) => service.GetUsers().ToHttpResult())
            .WithTags("Users");

        var spaces = app.MapGroup("/api/spaces").WithTags("Spaces");
        spaces.MapGet("/", (SpaceService service, Guid? userId) => service.GetSpaces(userId).ToHttpResult());
        spaces.MapPost("/", (SpaceService service, CreateSpaceRequest request) =>
            service.CreateSpace(request).ToCreatedHttpResult(space => $"/api/spaces/{space.Id}"));
        spaces.MapGet("/{spaceId:guid}", (SpaceService service, Guid spaceId) =>
            service.GetSpace(spaceId).ToHttpResult());
        spaces.MapPatch("/{spaceId:guid}", (SpaceService service, Guid spaceId, UpdateSpaceRequest request) =>
            service.UpdateSpace(spaceId, request).ToHttpResult());
        spaces.MapPost("/{spaceId:guid}/archive", (SpaceService service, Guid spaceId) =>
            service.ArchiveSpace(spaceId).ToHttpResult());

        var members = spaces.MapGroup("/{spaceId:guid}/members").WithTags("Space members");
        members.MapGet("/", (SpaceService service, Guid spaceId) => service.GetMembers(spaceId).ToHttpResult());
        members.MapPost("/", (SpaceService service, Guid spaceId, AddSpaceMemberRequest request) =>
            service.AddMember(spaceId, request).ToCreatedHttpResult(member => $"/api/spaces/{spaceId}/members/{member.Id}"));
        members.MapPatch("/{memberId:guid}", (SpaceService service, Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request) =>
            service.UpdateMember(spaceId, memberId, request).ToHttpResult());
        members.MapDelete("/{memberId:guid}", (SpaceService service, Guid spaceId, Guid memberId) =>
            service.RemoveMember(spaceId, memberId).ToNoContentResult());

        var ideas = spaces.MapGroup("/{spaceId:guid}/ideas").WithTags("Ideas");
        ideas.MapGet("/", (IdeaService service, Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived = false) =>
            service.GetIdeas(spaceId, folderId, tagId, categoryId, state, includeArchived).ToHttpResult());
        ideas.MapPost("/", (IdeaService service, Guid spaceId, CreateIdeaRequest request) =>
            service.CreateIdea(spaceId, request).ToCreatedHttpResult(idea => $"/api/spaces/{spaceId}/ideas/{idea.Id}"));
        ideas.MapGet("/{ideaId:guid}", (IdeaService service, Guid spaceId, Guid ideaId) =>
            service.GetIdea(spaceId, ideaId).ToHttpResult());
        ideas.MapPatch("/{ideaId:guid}", (IdeaService service, Guid spaceId, Guid ideaId, UpdateIdeaRequest request) =>
            service.UpdateIdea(spaceId, ideaId, request).ToHttpResult());

        ideas.MapGet("/{ideaId:guid}/comments", (CommentService service, Guid spaceId, Guid ideaId) =>
            service.GetComments(spaceId, ideaId).ToHttpResult());
        ideas.MapPost("/{ideaId:guid}/comments", (CommentService service, Guid spaceId, Guid ideaId, CreateCommentRequest request) =>
            service.AddComment(spaceId, ideaId, request).ToCreatedHttpResult(comment => $"/api/spaces/{spaceId}/ideas/{ideaId}/comments/{comment.Id}"));

        ideas.MapPost("/{ideaId:guid}/plans", (PlanningService service, Guid spaceId, Guid ideaId, ScheduleIdeaRequest request) =>
            service.ScheduleIdea(spaceId, ideaId, request).ToCreatedHttpResult(plan => $"/api/spaces/{spaceId}/plan/{plan.Id}"));

        var folders = spaces.MapGroup("/{spaceId:guid}/folders").WithTags("Folders");
        folders.MapGet("/", (ClassificationService service, Guid spaceId) => service.GetFolders(spaceId).ToHttpResult());
        folders.MapPost("/", (ClassificationService service, Guid spaceId, CreateNamedItemRequest request) =>
            service.CreateFolder(spaceId, request).ToCreatedHttpResult(folder => $"/api/spaces/{spaceId}/folders/{folder.Id}"));
        folders.MapPatch("/{folderId:guid}", (ClassificationService service, Guid spaceId, Guid folderId, UpdateNamedItemRequest request) =>
            service.UpdateFolder(spaceId, folderId, request).ToHttpResult());
        folders.MapDelete("/{folderId:guid}", (ClassificationService service, Guid spaceId, Guid folderId) =>
            service.RemoveFolder(spaceId, folderId).ToNoContentResult());

        var tags = spaces.MapGroup("/{spaceId:guid}/tags").WithTags("Tags");
        tags.MapGet("/", (ClassificationService service, Guid spaceId) => service.GetTags(spaceId).ToHttpResult());
        tags.MapPost("/", (ClassificationService service, Guid spaceId, CreateTagRequest request) =>
            service.CreateTag(spaceId, request).ToCreatedHttpResult(tag => $"/api/spaces/{spaceId}/tags/{tag.Id}"));
        tags.MapPatch("/{tagId:guid}", (ClassificationService service, Guid spaceId, Guid tagId, UpdateTagRequest request) =>
            service.UpdateTag(spaceId, tagId, request).ToHttpResult());
        tags.MapDelete("/{tagId:guid}", (ClassificationService service, Guid spaceId, Guid tagId) =>
            service.RemoveTag(spaceId, tagId).ToNoContentResult());

        var categories = spaces.MapGroup("/{spaceId:guid}/categories").WithTags("Categories");
        categories.MapGet("/", (ClassificationService service, Guid spaceId) => service.GetCategories(spaceId).ToHttpResult());
        categories.MapPost("/", (ClassificationService service, Guid spaceId, CreateNamedItemRequest request) =>
            service.CreateCategory(spaceId, request).ToCreatedHttpResult(category => $"/api/spaces/{spaceId}/categories/{category.Id}"));
        categories.MapPatch("/{categoryId:guid}", (ClassificationService service, Guid spaceId, Guid categoryId, UpdateNamedItemRequest request) =>
            service.UpdateCategory(spaceId, categoryId, request).ToHttpResult());
        categories.MapDelete("/{categoryId:guid}", (ClassificationService service, Guid spaceId, Guid categoryId) =>
            service.RemoveCategory(spaceId, categoryId).ToNoContentResult());

        var plan = spaces.MapGroup("/{spaceId:guid}/plan").WithTags("Planning");
        plan.MapGet("/", (PlanningService service, Guid spaceId, DateTimeOffset? from, DateTimeOffset? to) =>
            service.GetSchedule(spaceId, from, to).ToHttpResult());
        plan.MapPatch("/{scheduledIdeaId:guid}", (PlanningService service, Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request) =>
            service.UpdateSchedule(spaceId, scheduledIdeaId, request).ToHttpResult());

        var history = spaces.MapGroup("/{spaceId:guid}/history").WithTags("History");
        history.MapGet("/", (HistoryService service, Guid spaceId, Guid? ideaId) => service.GetHistory(spaceId, ideaId).ToHttpResult());
        history.MapPost("/", (HistoryService service, Guid spaceId, CreateHistoryEntryRequest request) =>
            service.CreateHistoryEntry(spaceId, request).ToCreatedHttpResult(entry => $"/api/spaces/{spaceId}/history/{entry.Id}"));
        history.MapPatch("/{entryId:guid}", (HistoryService service, Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request) =>
            service.UpdateHistoryEntry(spaceId, entryId, request).ToHttpResult());

        return app;
    }
}
