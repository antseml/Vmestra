using Back.Domain;

namespace Back.Api;

public sealed record CreateSpaceRequest(
    string Name,
    SpaceKind Kind = SpaceKind.Group,
    Guid? CreatedByUserId = null);

public sealed record UpdateSpaceRequest(
    string? Name,
    SpaceState? State);

public sealed record AddSpaceMemberRequest(
    Guid UserId,
    SpaceMemberRole Role = SpaceMemberRole.Member,
    string? PersonalSpaceName = null);

public sealed record UpdateSpaceMemberRequest(
    SpaceMemberRole? Role,
    string? PersonalSpaceName);

public sealed record CreateIdeaRequest(
    string Text,
    Guid? CreatedByUserId = null,
    string? Title = null,
    string? Description = null,
    Guid? FolderId = null,
    Guid? CategoryId = null,
    IReadOnlyCollection<Guid>? TagIds = null,
    bool IsRecurring = false);

public sealed record UpdateIdeaRequest(
    string? Text,
    string? Title,
    string? Description,
    Guid? FolderId,
    Guid? CategoryId,
    IReadOnlyCollection<Guid>? TagIds,
    IdeaState? State,
    bool? IsRecurring);

public sealed record CreateNamedItemRequest(string Name);

public sealed record CreateTagRequest(
    string Name,
    TagSource Source = TagSource.User);

public sealed record UpdateTagRequest(
    string? Name,
    TagSource? Source);

public sealed record UpdateNamedItemRequest(string? Name);

public sealed record ScheduleIdeaRequest(
    Guid? CreatedByUserId,
    DateTimeOffset StartsAt,
    DateTimeOffset? EndsAt,
    IReadOnlyCollection<Guid>? ParticipantUserIds,
    string? Note);

public sealed record UpdateScheduledIdeaRequest(
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt,
    IReadOnlyCollection<Guid>? ParticipantUserIds,
    ScheduledIdeaState? State,
    string? Note);

public sealed record CreateHistoryEntryRequest(
    Guid? IdeaId,
    Guid? CreatedByUserId,
    string Title,
    string? PublicNote,
    string? PrivateNote,
    DateTimeOffset? HappenedAt);

public sealed record UpdateHistoryEntryRequest(
    string? Title,
    string? PublicNote,
    string? PrivateNote,
    DateTimeOffset? HappenedAt);

public sealed record CreateCommentRequest(
    Guid? CreatedByUserId,
    string Text);

public sealed record RegisterRequest(
    string Email,
    string Password,
    string DisplayName);

public sealed record LoginRequest(
    string Email,
    string Password);
