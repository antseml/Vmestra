using Back.Api;
using Back.Domain;

namespace Back.Application.Abstractions;

public interface IUserRepository
{
    IReadOnlyCollection<User> GetUsers();
    User? GetUser(Guid userId);
    User? GetUserByEmail(string normalizedEmail);
    User CreateUser(string email, string displayName, string passwordHash);
    User EnsureDemoUser();
}

public interface ISpaceRepository
{
    bool Exists(Guid spaceId);
    IReadOnlyCollection<Space> GetSpaces(Guid? userId);
    Space? GetSpace(Guid spaceId);
    Space CreateSpace(CreateSpaceRequest request, Guid createdByUserId);
    Space EnsurePersonalSpace(Guid userId);
    Space? UpdateSpace(Guid spaceId, UpdateSpaceRequest request);
    IReadOnlyCollection<SpaceMember> GetMembers(Guid spaceId);
    SpaceMember? GetMember(Guid spaceId, Guid userId);
    SpaceMember? AddMember(Guid spaceId, AddSpaceMemberRequest request);
    SpaceMember? UpdateMember(Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request);
    bool RemoveMember(Guid spaceId, Guid memberId);
}

public interface IIdeaRepository
{
    IReadOnlyCollection<Idea> GetIdeas(Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived);
    Idea? GetIdea(Guid spaceId, Guid ideaId);
    Idea? CreateIdea(Guid spaceId, CreateIdeaRequest request, Guid createdByUserId);
    Idea? UpdateIdea(Guid spaceId, Guid ideaId, UpdateIdeaRequest request, Guid updatedByUserId);
    Idea? ArchiveIdea(Guid spaceId, Guid ideaId, Guid archivedByUserId);
    Idea? RestoreIdea(Guid spaceId, Guid ideaId, Guid restoredByUserId);
    void SetIdeaState(Guid spaceId, Guid ideaId, IdeaState state);
}

public interface IClassificationRepository
{
    IReadOnlyCollection<Folder> GetFolders(Guid spaceId);
    Folder? CreateFolder(Guid spaceId, CreateNamedItemRequest request);
    Folder? UpdateFolder(Guid spaceId, Guid folderId, UpdateNamedItemRequest request);
    bool RemoveFolder(Guid spaceId, Guid folderId);
    IReadOnlyCollection<Tag> GetTags(Guid spaceId);
    Tag? CreateTag(Guid spaceId, CreateTagRequest request);
    Tag? UpdateTag(Guid spaceId, Guid tagId, UpdateTagRequest request);
    bool RemoveTag(Guid spaceId, Guid tagId);
    IReadOnlyCollection<Category> GetCategories(Guid spaceId);
    Category? CreateCategory(Guid spaceId, CreateNamedItemRequest request);
    Category? UpdateCategory(Guid spaceId, Guid categoryId, UpdateNamedItemRequest request);
    bool RemoveCategory(Guid spaceId, Guid categoryId);
}

public interface IPlanningRepository
{
    IReadOnlyCollection<ScheduledIdea> GetSchedule(Guid spaceId, DateTimeOffset? from, DateTimeOffset? to);
    ScheduledIdea? ScheduleIdea(Guid spaceId, Guid ideaId, ScheduleIdeaRequest request, Guid createdByUserId);
    ScheduledIdea? UpdateSchedule(Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request, Guid updatedByUserId);
    bool HasActiveFuturePlan(Guid spaceId, Guid ideaId, DateTimeOffset now);
}

public interface IHistoryRepository
{
    IReadOnlyCollection<HistoryEntry> GetHistory(Guid spaceId, Guid? ideaId);
    HistoryEntry? CreateHistoryEntry(Guid spaceId, CreateHistoryEntryRequest request, Guid createdByUserId);
    HistoryEntry? UpdateHistoryEntry(Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request);
}

public interface ICommentRepository
{
    IReadOnlyCollection<Comment> GetComments(Guid spaceId, Guid ideaId);
    Comment? AddComment(Guid spaceId, Guid ideaId, CreateCommentRequest request, Guid createdByUserId);
}
