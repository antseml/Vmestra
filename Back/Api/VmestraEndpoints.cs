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
        auth.MapGet("/me", (AuthService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal) =>
        {
            return currentUser.GetUserId(principal) is { } userId
                ? service.GetCurrentUser(userId).ToHttpResult()
                : Results.Unauthorized();
        }).RequireAuthorization();

        app.MapGet("/api/users", (UserService service) => service.GetUsers().ToHttpResult())
            .WithTags("Users");

        var spaces = app.MapGroup("/api/spaces").WithTags("Spaces");
        spaces.MapGet("/", (SpaceService service, Guid? userId) => service.GetSpaces(userId).ToHttpResult());
        spaces.MapGet("/my", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetMySpaces(userId).ToHttpResult() : Results.Unauthorized())
            .RequireAuthorization();

        var protectedSpaces = spaces.MapGroup("").RequireAuthorization();
        protectedSpaces.MapPost("/", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, CreateSpaceRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.CreateSpace(userId, request).ToCreatedHttpResult(space => $"/api/spaces/{space.Id}")
                : Results.Unauthorized());
        protectedSpaces.MapGet("/{spaceId:guid}", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetSpace(userId, spaceId).ToHttpResult() : Results.Unauthorized());
        protectedSpaces.MapPatch("/{spaceId:guid}", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, UpdateSpaceRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateSpace(userId, spaceId, request).ToHttpResult() : Results.Unauthorized());
        protectedSpaces.MapPost("/{spaceId:guid}/archive", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId) =>
            currentUser.GetUserId(principal) is { } userId ? service.ArchiveSpace(userId, spaceId).ToHttpResult() : Results.Unauthorized());

        var members = protectedSpaces.MapGroup("/{spaceId:guid}/members").WithTags("Space members");
        members.MapGet("/", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetMembers(userId, spaceId).ToHttpResult() : Results.Unauthorized());
        members.MapPost("/", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, AddSpaceMemberRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.AddMember(userId, spaceId, request).ToCreatedHttpResult(member => $"/api/spaces/{spaceId}/members/{member.Id}")
                : Results.Unauthorized());
        members.MapPatch("/{memberId:guid}", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateMember(userId, spaceId, memberId, request).ToHttpResult() : Results.Unauthorized());
        members.MapDelete("/{memberId:guid}", (SpaceService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid memberId) =>
            currentUser.GetUserId(principal) is { } userId ? service.RemoveMember(userId, spaceId, memberId).ToNoContentResult() : Results.Unauthorized());

        var ideas = protectedSpaces.MapGroup("/{spaceId:guid}/ideas").WithTags("Ideas");
        ideas.MapGet("/", (IdeaService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived = false) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetIdeas(userId, spaceId, folderId, tagId, categoryId, state, includeArchived).ToHttpResult() : Results.Unauthorized());
        ideas.MapPost("/", (IdeaService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, CreateIdeaRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.CreateIdea(userId, spaceId, request).ToCreatedHttpResult(idea => $"/api/spaces/{spaceId}/ideas/{idea.Id}")
                : Results.Unauthorized());
        ideas.MapGet("/{ideaId:guid}", (IdeaService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid ideaId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetIdea(userId, spaceId, ideaId).ToHttpResult() : Results.Unauthorized());
        ideas.MapPatch("/{ideaId:guid}", (IdeaService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid ideaId, UpdateIdeaRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateIdea(userId, spaceId, ideaId, request).ToHttpResult() : Results.Unauthorized());

        ideas.MapGet("/{ideaId:guid}/comments", (CommentService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid ideaId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetComments(userId, spaceId, ideaId).ToHttpResult() : Results.Unauthorized());
        ideas.MapPost("/{ideaId:guid}/comments", (CommentService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid ideaId, CreateCommentRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.AddComment(userId, spaceId, ideaId, request).ToCreatedHttpResult(comment => $"/api/spaces/{spaceId}/ideas/{ideaId}/comments/{comment.Id}")
                : Results.Unauthorized());

        ideas.MapPost("/{ideaId:guid}/plans", (PlanningService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid ideaId, ScheduleIdeaRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.ScheduleIdea(userId, spaceId, ideaId, request).ToCreatedHttpResult(plan => $"/api/spaces/{spaceId}/plan/{plan.Id}")
                : Results.Unauthorized());

        var folders = protectedSpaces.MapGroup("/{spaceId:guid}/folders").WithTags("Folders");
        folders.MapGet("/", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetFolders(userId, spaceId).ToHttpResult() : Results.Unauthorized());
        folders.MapPost("/", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, CreateNamedItemRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.CreateFolder(userId, spaceId, request).ToCreatedHttpResult(folder => $"/api/spaces/{spaceId}/folders/{folder.Id}")
                : Results.Unauthorized());
        folders.MapPatch("/{folderId:guid}", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid folderId, UpdateNamedItemRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateFolder(userId, spaceId, folderId, request).ToHttpResult() : Results.Unauthorized());
        folders.MapDelete("/{folderId:guid}", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid folderId) =>
            currentUser.GetUserId(principal) is { } userId ? service.RemoveFolder(userId, spaceId, folderId).ToNoContentResult() : Results.Unauthorized());

        var tags = protectedSpaces.MapGroup("/{spaceId:guid}/tags").WithTags("Tags");
        tags.MapGet("/", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetTags(userId, spaceId).ToHttpResult() : Results.Unauthorized());
        tags.MapPost("/", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, CreateTagRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.CreateTag(userId, spaceId, request).ToCreatedHttpResult(tag => $"/api/spaces/{spaceId}/tags/{tag.Id}")
                : Results.Unauthorized());
        tags.MapPatch("/{tagId:guid}", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid tagId, UpdateTagRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateTag(userId, spaceId, tagId, request).ToHttpResult() : Results.Unauthorized());
        tags.MapDelete("/{tagId:guid}", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid tagId) =>
            currentUser.GetUserId(principal) is { } userId ? service.RemoveTag(userId, spaceId, tagId).ToNoContentResult() : Results.Unauthorized());

        var categories = protectedSpaces.MapGroup("/{spaceId:guid}/categories").WithTags("Categories");
        categories.MapGet("/", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetCategories(userId, spaceId).ToHttpResult() : Results.Unauthorized());
        categories.MapPost("/", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, CreateNamedItemRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.CreateCategory(userId, spaceId, request).ToCreatedHttpResult(category => $"/api/spaces/{spaceId}/categories/{category.Id}")
                : Results.Unauthorized());
        categories.MapPatch("/{categoryId:guid}", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid categoryId, UpdateNamedItemRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateCategory(userId, spaceId, categoryId, request).ToHttpResult() : Results.Unauthorized());
        categories.MapDelete("/{categoryId:guid}", (ClassificationService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid categoryId) =>
            currentUser.GetUserId(principal) is { } userId ? service.RemoveCategory(userId, spaceId, categoryId).ToNoContentResult() : Results.Unauthorized());

        var plan = protectedSpaces.MapGroup("/{spaceId:guid}/plan").WithTags("Planning");
        plan.MapGet("/", (PlanningService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, DateTimeOffset? from, DateTimeOffset? to) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetSchedule(userId, spaceId, from, to).ToHttpResult() : Results.Unauthorized());
        plan.MapPatch("/{scheduledIdeaId:guid}", (PlanningService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateSchedule(userId, spaceId, scheduledIdeaId, request).ToHttpResult() : Results.Unauthorized());

        var history = protectedSpaces.MapGroup("/{spaceId:guid}/history").WithTags("History");
        history.MapGet("/", (HistoryService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid? ideaId) =>
            currentUser.GetUserId(principal) is { } userId ? service.GetHistory(userId, spaceId, ideaId).ToHttpResult() : Results.Unauthorized());
        history.MapPost("/", (HistoryService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, CreateHistoryEntryRequest request) =>
            currentUser.GetUserId(principal) is { } userId
                ? service.CreateHistoryEntry(userId, spaceId, request).ToCreatedHttpResult(entry => $"/api/spaces/{spaceId}/history/{entry.Id}")
                : Results.Unauthorized());
        history.MapPatch("/{entryId:guid}", (HistoryService service, CurrentUserAccessor currentUser, ClaimsPrincipal principal, Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request) =>
            currentUser.GetUserId(principal) is { } userId ? service.UpdateHistoryEntry(userId, spaceId, entryId, request).ToHttpResult() : Results.Unauthorized());

        return app;
    }
}
