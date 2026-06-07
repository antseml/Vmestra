using Back.Domain;
using Back.Persistence.Postgres.Entities;

namespace Back.Persistence.Postgres;

public static class PostgresMappers
{
    public static User ToDomain(this UserEntity value) => new(value.Id, value.DisplayName, value.Email, value.CreatedAt);

    public static Space ToDomain(this SpaceEntity value) => new(value.Id, value.Kind, value.Name, value.State, value.CreatedByUserId, value.CreatedAt, value.UpdatedAt);

    public static SpaceMember ToDomain(this SpaceMemberEntity value) => new(value.Id, value.SpaceId, value.UserId, value.Role, value.PersonalSpaceName, value.JoinedAt);

    public static Folder ToDomain(this FolderEntity value) => new(value.Id, value.SpaceId, value.Name, value.SortOrder, value.CreatedAt, value.UpdatedAt);

    public static Tag ToDomain(this TagEntity value) => new(value.Id, value.SpaceId, value.Name, value.Source, value.CreatedAt);

    public static Category ToDomain(this CategoryEntity value) => new(value.Id, value.SpaceId, value.Name, value.CreatedAt);

    public static Idea ToDomain(this IdeaEntity value) => new(
        value.Id,
        value.SpaceId,
        value.CreatedByUserId,
        value.Text,
        value.Title,
        value.Description,
        value.FolderId,
        value.CategoryId,
        value.IdeaTags.Select(tag => tag.TagId).ToArray(),
        value.State,
        value.IsRecurring,
        value.CreatedAt,
        value.UpdatedAt);

    public static ScheduledIdea ToDomain(this ScheduledIdeaEntity value) => new(
        value.Id,
        value.SpaceId,
        value.IdeaId,
        value.CreatedByUserId,
        value.StartsAt,
        value.EndsAt,
        value.Participants.Select(participant => participant.UserId).ToArray(),
        value.State,
        value.Note,
        value.CreatedAt,
        value.UpdatedAt);

    public static HistoryEntry ToDomain(this HistoryEntryEntity value) => new(
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

    public static Comment ToDomain(this CommentEntity value) => new(value.Id, value.SpaceId, value.IdeaId, value.CreatedByUserId, value.Text, value.CreatedAt, value.UpdatedAt);
}
