using Back.Api;
using Back.Application.Abstractions;
using Back.Application.Common;
using Back.Application.Mapping;
using Back.Domain;

namespace Back.Application.Services;

public sealed class UserService(IUserRepository users)
{
    public AppResult<IReadOnlyCollection<UserResponse>> GetUsers() => AppResult<IReadOnlyCollection<UserResponse>>.Ok(users.GetUsers().Select(user => user.ToResponse()).ToArray());
}

public sealed class SpaceService(ISpaceRepository spaces)
{
    public AppResult<IReadOnlyCollection<SpaceResponse>> GetSpaces(Guid? userId) => AppResult<IReadOnlyCollection<SpaceResponse>>.Ok(spaces.GetSpaces(userId).Select(space => space.ToResponse()).ToArray());

    public AppResult<SpaceResponse> GetSpace(Guid spaceId) => spaces.GetSpace(spaceId) is { } space ? AppResult<SpaceResponse>.Ok(space.ToResponse()) : AppResult<SpaceResponse>.NotFound();

    public AppResult<SpaceResponse> CreateSpace(CreateSpaceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<SpaceResponse>.Validation("Space name is required.");
        return AppResult<SpaceResponse>.Ok(spaces.CreateSpace(request).ToResponse());
    }

    public AppResult<SpaceResponse> UpdateSpace(Guid spaceId, UpdateSpaceRequest request) => spaces.UpdateSpace(spaceId, request) is { } space ? AppResult<SpaceResponse>.Ok(space.ToResponse()) : AppResult<SpaceResponse>.NotFound();

    public AppResult<SpaceResponse> ArchiveSpace(Guid spaceId) => UpdateSpace(spaceId, new UpdateSpaceRequest(null, SpaceState.Archived));

    public AppResult<IReadOnlyCollection<SpaceMemberResponse>> GetMembers(Guid spaceId)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<SpaceMemberResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<SpaceMemberResponse>>.Ok(spaces.GetMembers(spaceId).Select(member => member.ToResponse()).ToArray());
    }

    public AppResult<SpaceMemberResponse> AddMember(Guid spaceId, AddSpaceMemberRequest request) => spaces.AddMember(spaceId, request) is { } member ? AppResult<SpaceMemberResponse>.Ok(member.ToResponse()) : AppResult<SpaceMemberResponse>.NotFound();

    public AppResult<SpaceMemberResponse> UpdateMember(Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request) => spaces.UpdateMember(spaceId, memberId, request) is { } member ? AppResult<SpaceMemberResponse>.Ok(member.ToResponse()) : AppResult<SpaceMemberResponse>.NotFound();

    public AppResult<bool> RemoveMember(Guid spaceId, Guid memberId) => spaces.RemoveMember(spaceId, memberId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();
}

public sealed class IdeaService(ISpaceRepository spaces, IIdeaRepository ideas)
{
    public AppResult<IReadOnlyCollection<IdeaResponse>> GetIdeas(Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<IdeaResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<IdeaResponse>>.Ok(ideas.GetIdeas(spaceId, folderId, tagId, categoryId, state, includeArchived).Select(idea => idea.ToResponse()).ToArray());
    }

    public AppResult<IdeaResponse> GetIdea(Guid spaceId, Guid ideaId) => ideas.GetIdea(spaceId, ideaId) is { } idea ? AppResult<IdeaResponse>.Ok(idea.ToResponse()) : AppResult<IdeaResponse>.NotFound();

    public AppResult<IdeaResponse> CreateIdea(Guid spaceId, CreateIdeaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text)) return AppResult<IdeaResponse>.Validation("Idea text is required.");
        return ideas.CreateIdea(spaceId, request) is { } idea ? AppResult<IdeaResponse>.Ok(idea.ToResponse()) : AppResult<IdeaResponse>.NotFound();
    }

    public AppResult<IdeaResponse> UpdateIdea(Guid spaceId, Guid ideaId, UpdateIdeaRequest request) => ideas.UpdateIdea(spaceId, ideaId, request) is { } idea ? AppResult<IdeaResponse>.Ok(idea.ToResponse()) : AppResult<IdeaResponse>.NotFound();
}

public sealed class ClassificationService(ISpaceRepository spaces, IClassificationRepository classification)
{
    public AppResult<IReadOnlyCollection<FolderResponse>> GetFolders(Guid spaceId)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<FolderResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<FolderResponse>>.Ok(classification.GetFolders(spaceId).Select(folder => folder.ToResponse()).ToArray());
    }

    public AppResult<FolderResponse> CreateFolder(Guid spaceId, CreateNamedItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<FolderResponse>.Validation("Folder name is required.");
        return classification.CreateFolder(spaceId, request) is { } folder ? AppResult<FolderResponse>.Ok(folder.ToResponse()) : AppResult<FolderResponse>.NotFound();
    }

    public AppResult<FolderResponse> UpdateFolder(Guid spaceId, Guid folderId, UpdateNamedItemRequest request) => classification.UpdateFolder(spaceId, folderId, request) is { } folder ? AppResult<FolderResponse>.Ok(folder.ToResponse()) : AppResult<FolderResponse>.NotFound();

    public AppResult<bool> RemoveFolder(Guid spaceId, Guid folderId) => classification.RemoveFolder(spaceId, folderId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();

    public AppResult<IReadOnlyCollection<TagResponse>> GetTags(Guid spaceId)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<TagResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<TagResponse>>.Ok(classification.GetTags(spaceId).Select(tag => tag.ToResponse()).ToArray());
    }

    public AppResult<TagResponse> CreateTag(Guid spaceId, CreateTagRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<TagResponse>.Validation("Tag name is required.");
        return classification.CreateTag(spaceId, request) is { } tag ? AppResult<TagResponse>.Ok(tag.ToResponse()) : AppResult<TagResponse>.NotFound();
    }

    public AppResult<TagResponse> UpdateTag(Guid spaceId, Guid tagId, UpdateTagRequest request) => classification.UpdateTag(spaceId, tagId, request) is { } tag ? AppResult<TagResponse>.Ok(tag.ToResponse()) : AppResult<TagResponse>.NotFound();

    public AppResult<bool> RemoveTag(Guid spaceId, Guid tagId) => classification.RemoveTag(spaceId, tagId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();

    public AppResult<IReadOnlyCollection<CategoryResponse>> GetCategories(Guid spaceId)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<CategoryResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<CategoryResponse>>.Ok(classification.GetCategories(spaceId).Select(category => category.ToResponse()).ToArray());
    }

    public AppResult<CategoryResponse> CreateCategory(Guid spaceId, CreateNamedItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<CategoryResponse>.Validation("Category name is required.");
        return classification.CreateCategory(spaceId, request) is { } category ? AppResult<CategoryResponse>.Ok(category.ToResponse()) : AppResult<CategoryResponse>.NotFound();
    }

    public AppResult<CategoryResponse> UpdateCategory(Guid spaceId, Guid categoryId, UpdateNamedItemRequest request) => classification.UpdateCategory(spaceId, categoryId, request) is { } category ? AppResult<CategoryResponse>.Ok(category.ToResponse()) : AppResult<CategoryResponse>.NotFound();

    public AppResult<bool> RemoveCategory(Guid spaceId, Guid categoryId) => classification.RemoveCategory(spaceId, categoryId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();
}

public sealed class PlanningService(ISpaceRepository spaces, IPlanningRepository planning)
{
    public AppResult<IReadOnlyCollection<ScheduledIdeaResponse>> GetSchedule(Guid spaceId, DateTimeOffset? from, DateTimeOffset? to)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<ScheduledIdeaResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<ScheduledIdeaResponse>>.Ok(planning.GetSchedule(spaceId, from, to).Select(item => item.ToResponse()).ToArray());
    }

    public AppResult<ScheduledIdeaResponse> ScheduleIdea(Guid spaceId, Guid ideaId, ScheduleIdeaRequest request)
    {
        if (request.StartsAt == default) return AppResult<ScheduledIdeaResponse>.Validation("Plan startsAt is required.");
        return planning.ScheduleIdea(spaceId, ideaId, request) is { } item ? AppResult<ScheduledIdeaResponse>.Ok(item.ToResponse()) : AppResult<ScheduledIdeaResponse>.NotFound();
    }

    public AppResult<ScheduledIdeaResponse> UpdateSchedule(Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request) => planning.UpdateSchedule(spaceId, scheduledIdeaId, request) is { } item ? AppResult<ScheduledIdeaResponse>.Ok(item.ToResponse()) : AppResult<ScheduledIdeaResponse>.NotFound();
}

public sealed class HistoryService(ISpaceRepository spaces, IHistoryRepository history, IIdeaRepository ideas)
{
    public AppResult<IReadOnlyCollection<HistoryEntryResponse>> GetHistory(Guid spaceId, Guid? ideaId)
    {
        if (!spaces.Exists(spaceId)) return AppResult<IReadOnlyCollection<HistoryEntryResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<HistoryEntryResponse>>.Ok(history.GetHistory(spaceId, ideaId).Select(entry => entry.ToResponse()).ToArray());
    }

    public AppResult<HistoryEntryResponse> CreateHistoryEntry(Guid spaceId, CreateHistoryEntryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title)) return AppResult<HistoryEntryResponse>.Validation("History title is required.");
        var entry = history.CreateHistoryEntry(spaceId, request);
        if (entry is null) return AppResult<HistoryEntryResponse>.NotFound();
        if (entry.IdeaId is not null)
        {
            ideas.SetIdeaState(spaceId, entry.IdeaId.Value, IdeaState.Experienced);
        }

        return AppResult<HistoryEntryResponse>.Ok(entry.ToResponse());
    }

    public AppResult<HistoryEntryResponse> UpdateHistoryEntry(Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request) => history.UpdateHistoryEntry(spaceId, entryId, request) is { } entry ? AppResult<HistoryEntryResponse>.Ok(entry.ToResponse()) : AppResult<HistoryEntryResponse>.NotFound();
}

public sealed class CommentService(IIdeaRepository ideas, ICommentRepository comments)
{
    public AppResult<IReadOnlyCollection<CommentResponse>> GetComments(Guid spaceId, Guid ideaId)
    {
        if (ideas.GetIdea(spaceId, ideaId) is null) return AppResult<IReadOnlyCollection<CommentResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<CommentResponse>>.Ok(comments.GetComments(spaceId, ideaId).Select(comment => comment.ToResponse()).ToArray());
    }

    public AppResult<CommentResponse> AddComment(Guid spaceId, Guid ideaId, CreateCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text)) return AppResult<CommentResponse>.Validation("Comment text is required.");
        return comments.AddComment(spaceId, ideaId, request) is { } comment ? AppResult<CommentResponse>.Ok(comment.ToResponse()) : AppResult<CommentResponse>.NotFound();
    }
}
