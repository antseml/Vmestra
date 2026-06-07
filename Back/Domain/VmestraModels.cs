namespace Back.Domain;

public enum SpaceKind
{
    Personal,
    Group
}

public enum SpaceState
{
    Active,
    Archived
}

public enum SpaceMemberRole
{
    Admin,
    Member
}

public enum IdeaState
{
    Inbox,
    Active,
    Planned,
    Experienced,
    Archived
}

public enum TagSource
{
    User,
    System
}

public enum ScheduledIdeaState
{
    Planned,
    Moved,
    Canceled,
    Experienced
}

public sealed record User(
    Guid Id,
    string DisplayName,
    string? Email,
    string? PasswordHash,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record Space(
    Guid Id,
    SpaceKind Kind,
    string Name,
    SpaceState State,
    Guid CreatedByUserId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record SpaceMember(
    Guid Id,
    Guid SpaceId,
    Guid UserId,
    SpaceMemberRole Role,
    string? PersonalSpaceName,
    DateTimeOffset JoinedAt);

public sealed record Folder(
    Guid Id,
    Guid SpaceId,
    string Name,
    int SortOrder,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record Tag(
    Guid Id,
    Guid SpaceId,
    string Name,
    TagSource Source,
    DateTimeOffset CreatedAt);

public sealed record Category(
    Guid Id,
    Guid SpaceId,
    string Name,
    DateTimeOffset CreatedAt);

public sealed record Idea(
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

public sealed record ScheduledIdea(
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

public sealed record HistoryEntry(
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

public sealed record Comment(
    Guid Id,
    Guid SpaceId,
    Guid IdeaId,
    Guid CreatedByUserId,
    string Text,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
