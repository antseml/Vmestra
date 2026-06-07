using Back.Api;
using Back.Domain;

namespace Back.Application.Mapping;

public static class VmestraMapper
{
    public static UserResponse ToResponse(this User value) => new(value.Id, value.DisplayName, value.Email, value.CreatedAt);

    public static CurrentUserResponse ToCurrentUserResponse(this User value) => new(value.Id, value.DisplayName, value.Email ?? string.Empty, value.CreatedAt, value.UpdatedAt);

    public static SpaceResponse ToResponse(this Space value) => new(value.Id, value.Kind, value.Name, value.State, value.CreatedByUserId, value.CreatedAt, value.UpdatedAt);

    public static SpaceMemberResponse ToResponse(this SpaceMember value) => new(value.Id, value.SpaceId, value.UserId, value.Role, value.PersonalSpaceName, value.JoinedAt);

    public static FolderResponse ToResponse(this Folder value) => new(value.Id, value.SpaceId, value.Name, value.SortOrder, value.CreatedAt, value.UpdatedAt);

    public static TagResponse ToResponse(this Tag value) => new(value.Id, value.SpaceId, value.Name, value.Source, value.CreatedAt);

    public static CategoryResponse ToResponse(this Category value) => new(value.Id, value.SpaceId, value.Name, value.CreatedAt);

    public static IdeaResponse ToResponse(this Idea value) => new(
        value.Id,
        value.SpaceId,
        value.CreatedByUserId,
        value.Text,
        value.Title,
        value.Description,
        value.FolderId,
        value.CategoryId,
        value.TagIds,
        value.State,
        value.IsRecurring,
        value.CreatedAt,
        value.UpdatedAt);

    public static ScheduledIdeaResponse ToResponse(this ScheduledIdea value) => new(
        value.Id,
        value.SpaceId,
        value.IdeaId,
        value.CreatedByUserId,
        value.StartsAt,
        value.EndsAt,
        value.ParticipantUserIds,
        value.State,
        value.Note,
        value.CreatedAt,
        value.UpdatedAt);

    public static HistoryEntryResponse ToResponse(this HistoryEntry value) => new(
        value.Id,
        value.SpaceId,
        value.IdeaId,
        value.CreatedByUserId,
        value.Title,
        value.PublicNote,
        value.PrivateNote,
        value.HappenedAt,
        value.CreatedAt,
        value.UpdatedAt);

    public static CommentResponse ToResponse(this Comment value) => new(value.Id, value.SpaceId, value.IdeaId, value.CreatedByUserId, value.Text, value.CreatedAt, value.UpdatedAt);
}
