using Back.Domain;

namespace Back.Persistence.Postgres.Entities;

public sealed class UserEntity
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class SpaceEntity
{
    public Guid Id { get; set; }
    public SpaceKind Kind { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SpaceState State { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class SpaceMemberEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public Guid UserId { get; set; }
    public SpaceMemberRole Role { get; set; }
    public string? PersonalSpaceName { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
}

public sealed class FolderEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class TagEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public TagSource Source { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CategoryEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class IdeaEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public Guid? FolderId { get; set; }
    public Guid? CategoryId { get; set; }
    public IdeaState State { get; set; }
    public bool IsRecurring { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<IdeaTagEntity> IdeaTags { get; set; } = [];
}

public sealed class IdeaTagEntity
{
    public Guid IdeaId { get; set; }
    public Guid TagId { get; set; }
}

public sealed class ScheduledIdeaEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public Guid IdeaId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public ScheduledIdeaState State { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<ScheduledIdeaParticipantEntity> Participants { get; set; } = [];
}

public sealed class ScheduledIdeaParticipantEntity
{
    public Guid ScheduledIdeaId { get; set; }
    public Guid UserId { get; set; }
}

public sealed class HistoryEntryEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public Guid? IdeaId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? PublicNote { get; set; }
    public string? PrivateNote { get; set; }
    public int? Rating { get; set; }
    public DateTimeOffset HappenedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class CommentEntity
{
    public Guid Id { get; set; }
    public Guid SpaceId { get; set; }
    public Guid IdeaId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
