using Back.Domain;

namespace Back.Api;

public sealed record UserResponse(Guid Id, string DisplayName, string? Email, DateTimeOffset CreatedAt);

public sealed record SpaceResponse(Guid Id, SpaceKind Kind, string Name, SpaceState State, Guid CreatedByUserId, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record SpaceMemberResponse(Guid Id, Guid SpaceId, Guid UserId, SpaceMemberRole Role, string? PersonalSpaceName, DateTimeOffset JoinedAt);

public sealed record FolderResponse(Guid Id, Guid SpaceId, string Name, int SortOrder, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record TagResponse(Guid Id, Guid SpaceId, string Name, TagSource Source, DateTimeOffset CreatedAt);

public sealed record CategoryResponse(Guid Id, Guid SpaceId, string Name, DateTimeOffset CreatedAt);

public sealed record IdeaResponse(
    Guid Id,
    Guid SpaceId,
    Guid CreatedByUserId,
    string Text,
    string? Title,
    string? Description,
    Guid? FolderId,
    Guid? CategoryId,
    IReadOnlyCollection<Guid> TagIds,
    IdeaState State,
    bool IsRecurring,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ScheduledIdeaResponse(
    Guid Id,
    Guid SpaceId,
    Guid IdeaId,
    Guid CreatedByUserId,
    DateTimeOffset StartsAt,
    DateTimeOffset? EndsAt,
    IReadOnlyCollection<Guid> ParticipantUserIds,
    ScheduledIdeaState State,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record HistoryEntryResponse(
    Guid Id,
    Guid SpaceId,
    Guid? IdeaId,
    Guid CreatedByUserId,
    string Title,
    string? PublicNote,
    string? PrivateNote,
    DateTimeOffset HappenedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CommentResponse(Guid Id, Guid SpaceId, Guid IdeaId, Guid CreatedByUserId, string Text, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
