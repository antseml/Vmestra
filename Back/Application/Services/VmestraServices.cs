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

    public AppResult<IReadOnlyCollection<SpaceResponse>> GetMySpaces(Guid currentUserId) => AppResult<IReadOnlyCollection<SpaceResponse>>.Ok(spaces.GetSpaces(currentUserId).Select(space => space.ToResponse()).ToArray());

    public AppResult<SpaceResponse> GetSpace(Guid currentUserId, Guid spaceId)
    {
        if (!IsMember(spaceId, currentUserId)) return AppResult<SpaceResponse>.NotFound();
        return spaces.GetSpace(spaceId) is { } space ? AppResult<SpaceResponse>.Ok(space.ToResponse()) : AppResult<SpaceResponse>.NotFound();
    }

    public AppResult<SpaceResponse> CreateSpace(Guid currentUserId, CreateSpaceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<SpaceResponse>.Validation("Space name is required.");
        return AppResult<SpaceResponse>.Ok(spaces.CreateSpace(request, currentUserId).ToResponse());
    }

    public AppResult<SpaceResponse> UpdateSpace(Guid currentUserId, Guid spaceId, UpdateSpaceRequest request)
    {
        var access = RequireAdmin(spaceId, currentUserId);
        if (access is not null) return access;
        return spaces.UpdateSpace(spaceId, request) is { } space ? AppResult<SpaceResponse>.Ok(space.ToResponse()) : AppResult<SpaceResponse>.NotFound();
    }

    public AppResult<SpaceResponse> ArchiveSpace(Guid currentUserId, Guid spaceId) => UpdateSpace(currentUserId, spaceId, new UpdateSpaceRequest(null, SpaceState.Archived));

    public AppResult<IReadOnlyCollection<SpaceMemberResponse>> GetMembers(Guid currentUserId, Guid spaceId)
    {
        if (!IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<SpaceMemberResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<SpaceMemberResponse>>.Ok(spaces.GetMembers(spaceId).Select(member => member.ToResponse()).ToArray());
    }

    public AppResult<SpaceMemberResponse> AddMember(Guid currentUserId, Guid spaceId, AddSpaceMemberRequest request)
    {
        var access = RequireAdmin<SpaceMemberResponse>(spaceId, currentUserId);
        if (access is not null) return access;
        return spaces.AddMember(spaceId, request) is { } member ? AppResult<SpaceMemberResponse>.Ok(member.ToResponse()) : AppResult<SpaceMemberResponse>.NotFound();
    }

    public AppResult<SpaceMemberResponse> UpdateMember(Guid currentUserId, Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request)
    {
        var access = RequireAdmin<SpaceMemberResponse>(spaceId, currentUserId);
        if (access is not null) return access;
        return spaces.UpdateMember(spaceId, memberId, request) is { } member ? AppResult<SpaceMemberResponse>.Ok(member.ToResponse()) : AppResult<SpaceMemberResponse>.NotFound();
    }

    public AppResult<bool> RemoveMember(Guid currentUserId, Guid spaceId, Guid memberId)
    {
        var access = RequireAdmin<bool>(spaceId, currentUserId);
        if (access is not null) return access;
        return spaces.RemoveMember(spaceId, memberId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();
    }

    public bool IsMember(Guid spaceId, Guid userId) => spaces.GetMember(spaceId, userId) is not null;

    public bool IsAdmin(Guid spaceId, Guid userId) => spaces.GetMember(spaceId, userId)?.Role == SpaceMemberRole.Admin;

    private AppResult<SpaceResponse>? RequireAdmin(Guid spaceId, Guid userId) => RequireAdmin<SpaceResponse>(spaceId, userId);

    private AppResult<T>? RequireAdmin<T>(Guid spaceId, Guid userId)
    {
        var member = spaces.GetMember(spaceId, userId);
        if (member is null) return AppResult<T>.NotFound();
        return member.Role == SpaceMemberRole.Admin ? null : AppResult<T>.Forbidden();
    }
}

public sealed class IdeaService(SpaceService spaces, IIdeaRepository ideas)
{
    public AppResult<IReadOnlyCollection<IdeaResponse>> GetIdeas(Guid currentUserId, Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<IdeaResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<IdeaResponse>>.Ok(ideas.GetIdeas(spaceId, folderId, tagId, categoryId, state, includeArchived).Select(idea => idea.ToResponse()).ToArray());
    }

    public AppResult<IdeaResponse> GetIdea(Guid currentUserId, Guid spaceId, Guid ideaId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IdeaResponse>.NotFound();
        return ideas.GetIdea(spaceId, ideaId) is { } idea ? AppResult<IdeaResponse>.Ok(idea.ToResponse()) : AppResult<IdeaResponse>.NotFound();
    }

    public AppResult<IdeaResponse> CreateIdea(Guid currentUserId, Guid spaceId, CreateIdeaRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IdeaResponse>.NotFound();
        if (string.IsNullOrWhiteSpace(request.Text)) return AppResult<IdeaResponse>.Validation("Idea text is required.");
        return ideas.CreateIdea(spaceId, request, currentUserId) is { } idea ? AppResult<IdeaResponse>.Ok(idea.ToResponse()) : AppResult<IdeaResponse>.NotFound();
    }

    public AppResult<IdeaResponse> UpdateIdea(Guid currentUserId, Guid spaceId, Guid ideaId, UpdateIdeaRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IdeaResponse>.NotFound();
        return ideas.UpdateIdea(spaceId, ideaId, request) is { } idea ? AppResult<IdeaResponse>.Ok(idea.ToResponse()) : AppResult<IdeaResponse>.NotFound();
    }
}

public sealed class ClassificationService(SpaceService spaces, IClassificationRepository classification)
{
    public AppResult<IReadOnlyCollection<FolderResponse>> GetFolders(Guid currentUserId, Guid spaceId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<FolderResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<FolderResponse>>.Ok(classification.GetFolders(spaceId).Select(folder => folder.ToResponse()).ToArray());
    }

    public AppResult<FolderResponse> CreateFolder(Guid currentUserId, Guid spaceId, CreateNamedItemRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<FolderResponse>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<FolderResponse>.Forbidden();
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<FolderResponse>.Validation("Folder name is required.");
        return classification.CreateFolder(spaceId, request) is { } folder ? AppResult<FolderResponse>.Ok(folder.ToResponse()) : AppResult<FolderResponse>.NotFound();
    }

    public AppResult<FolderResponse> UpdateFolder(Guid currentUserId, Guid spaceId, Guid folderId, UpdateNamedItemRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<FolderResponse>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<FolderResponse>.Forbidden();
        return classification.UpdateFolder(spaceId, folderId, request) is { } folder ? AppResult<FolderResponse>.Ok(folder.ToResponse()) : AppResult<FolderResponse>.NotFound();
    }

    public AppResult<bool> RemoveFolder(Guid currentUserId, Guid spaceId, Guid folderId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<bool>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<bool>.Forbidden();
        return classification.RemoveFolder(spaceId, folderId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();
    }

    public AppResult<IReadOnlyCollection<TagResponse>> GetTags(Guid currentUserId, Guid spaceId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<TagResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<TagResponse>>.Ok(classification.GetTags(spaceId).Select(tag => tag.ToResponse()).ToArray());
    }

    public AppResult<TagResponse> CreateTag(Guid currentUserId, Guid spaceId, CreateTagRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<TagResponse>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<TagResponse>.Forbidden();
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<TagResponse>.Validation("Tag name is required.");
        return classification.CreateTag(spaceId, request) is { } tag ? AppResult<TagResponse>.Ok(tag.ToResponse()) : AppResult<TagResponse>.NotFound();
    }

    public AppResult<TagResponse> UpdateTag(Guid currentUserId, Guid spaceId, Guid tagId, UpdateTagRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<TagResponse>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<TagResponse>.Forbidden();
        return classification.UpdateTag(spaceId, tagId, request) is { } tag ? AppResult<TagResponse>.Ok(tag.ToResponse()) : AppResult<TagResponse>.NotFound();
    }

    public AppResult<bool> RemoveTag(Guid currentUserId, Guid spaceId, Guid tagId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<bool>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<bool>.Forbidden();
        return classification.RemoveTag(spaceId, tagId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();
    }

    public AppResult<IReadOnlyCollection<CategoryResponse>> GetCategories(Guid currentUserId, Guid spaceId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<CategoryResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<CategoryResponse>>.Ok(classification.GetCategories(spaceId).Select(category => category.ToResponse()).ToArray());
    }

    public AppResult<CategoryResponse> CreateCategory(Guid currentUserId, Guid spaceId, CreateNamedItemRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<CategoryResponse>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<CategoryResponse>.Forbidden();
        if (string.IsNullOrWhiteSpace(request.Name)) return AppResult<CategoryResponse>.Validation("Category name is required.");
        return classification.CreateCategory(spaceId, request) is { } category ? AppResult<CategoryResponse>.Ok(category.ToResponse()) : AppResult<CategoryResponse>.NotFound();
    }

    public AppResult<CategoryResponse> UpdateCategory(Guid currentUserId, Guid spaceId, Guid categoryId, UpdateNamedItemRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<CategoryResponse>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<CategoryResponse>.Forbidden();
        return classification.UpdateCategory(spaceId, categoryId, request) is { } category ? AppResult<CategoryResponse>.Ok(category.ToResponse()) : AppResult<CategoryResponse>.NotFound();
    }

    public AppResult<bool> RemoveCategory(Guid currentUserId, Guid spaceId, Guid categoryId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<bool>.NotFound();
        if (!spaces.IsAdmin(spaceId, currentUserId)) return AppResult<bool>.Forbidden();
        return classification.RemoveCategory(spaceId, categoryId) ? AppResult<bool>.Ok(true) : AppResult<bool>.NotFound();
    }
}

public sealed class PlanningService(SpaceService spaces, IPlanningRepository planning)
{
    public AppResult<IReadOnlyCollection<ScheduledIdeaResponse>> GetSchedule(Guid currentUserId, Guid spaceId, DateTimeOffset? from, DateTimeOffset? to)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<ScheduledIdeaResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<ScheduledIdeaResponse>>.Ok(planning.GetSchedule(spaceId, from, to).Select(item => item.ToResponse()).ToArray());
    }

    public AppResult<ScheduledIdeaResponse> ScheduleIdea(Guid currentUserId, Guid spaceId, Guid ideaId, ScheduleIdeaRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<ScheduledIdeaResponse>.NotFound();
        if (request.StartsAt == default) return AppResult<ScheduledIdeaResponse>.Validation("Plan startsAt is required.");
        return planning.ScheduleIdea(spaceId, ideaId, request, currentUserId) is { } item ? AppResult<ScheduledIdeaResponse>.Ok(item.ToResponse()) : AppResult<ScheduledIdeaResponse>.NotFound();
    }

    public AppResult<ScheduledIdeaResponse> UpdateSchedule(Guid currentUserId, Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<ScheduledIdeaResponse>.NotFound();
        return planning.UpdateSchedule(spaceId, scheduledIdeaId, request) is { } item ? AppResult<ScheduledIdeaResponse>.Ok(item.ToResponse()) : AppResult<ScheduledIdeaResponse>.NotFound();
    }
}

public sealed class HistoryService(SpaceService spaces, IHistoryRepository history, IIdeaRepository ideas)
{
    public AppResult<IReadOnlyCollection<HistoryEntryResponse>> GetHistory(Guid currentUserId, Guid spaceId, Guid? ideaId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<HistoryEntryResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<HistoryEntryResponse>>.Ok(history.GetHistory(spaceId, ideaId).Select(entry => entry.ToResponse()).ToArray());
    }

    public AppResult<HistoryEntryResponse> CreateHistoryEntry(Guid currentUserId, Guid spaceId, CreateHistoryEntryRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<HistoryEntryResponse>.NotFound();
        if (string.IsNullOrWhiteSpace(request.Title)) return AppResult<HistoryEntryResponse>.Validation("History title is required.");
        var entry = history.CreateHistoryEntry(spaceId, request, currentUserId);
        if (entry is null) return AppResult<HistoryEntryResponse>.NotFound();
        if (entry.IdeaId is not null)
        {
            ideas.SetIdeaState(spaceId, entry.IdeaId.Value, IdeaState.Experienced);
        }

        return AppResult<HistoryEntryResponse>.Ok(entry.ToResponse());
    }

    public AppResult<HistoryEntryResponse> UpdateHistoryEntry(Guid currentUserId, Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<HistoryEntryResponse>.NotFound();
        return history.UpdateHistoryEntry(spaceId, entryId, request) is { } entry ? AppResult<HistoryEntryResponse>.Ok(entry.ToResponse()) : AppResult<HistoryEntryResponse>.NotFound();
    }
}

public sealed class CommentService(SpaceService spaces, IIdeaRepository ideas, ICommentRepository comments)
{
    public AppResult<IReadOnlyCollection<CommentResponse>> GetComments(Guid currentUserId, Guid spaceId, Guid ideaId)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<IReadOnlyCollection<CommentResponse>>.NotFound();
        if (ideas.GetIdea(spaceId, ideaId) is null) return AppResult<IReadOnlyCollection<CommentResponse>>.NotFound();
        return AppResult<IReadOnlyCollection<CommentResponse>>.Ok(comments.GetComments(spaceId, ideaId).Select(comment => comment.ToResponse()).ToArray());
    }

    public AppResult<CommentResponse> AddComment(Guid currentUserId, Guid spaceId, Guid ideaId, CreateCommentRequest request)
    {
        if (!spaces.IsMember(spaceId, currentUserId)) return AppResult<CommentResponse>.NotFound();
        if (string.IsNullOrWhiteSpace(request.Text)) return AppResult<CommentResponse>.Validation("Comment text is required.");
        return comments.AddComment(spaceId, ideaId, request, currentUserId) is { } comment ? AppResult<CommentResponse>.Ok(comment.ToResponse()) : AppResult<CommentResponse>.NotFound();
    }
}
