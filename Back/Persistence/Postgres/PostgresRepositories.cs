using Back.Api;
using Back.Application.Abstractions;
using Back.Domain;
using Back.Persistence.Postgres.Entities;
using Microsoft.EntityFrameworkCore;

namespace Back.Persistence.Postgres;

public sealed class PostgresUserRepository(VmestraDbContext db) : IUserRepository
{
    public IReadOnlyCollection<User> GetUsers() => db.Users.AsNoTracking().OrderBy(user => user.CreatedAt).Select(user => user.ToDomain()).ToArray();

    public User? GetUser(Guid userId) => db.Users.AsNoTracking().SingleOrDefault(user => user.Id == userId)?.ToDomain();

    public User? GetUserByEmail(string normalizedEmail) => db.Users.AsNoTracking().SingleOrDefault(user => user.Email == normalizedEmail)?.ToDomain();

    public User CreateUser(string email, string displayName, string passwordHash)
    {
        var now = DateTimeOffset.UtcNow;
        var user = new UserEntity { Id = Guid.NewGuid(), DisplayName = displayName, Email = email, PasswordHash = passwordHash, CreatedAt = now, UpdatedAt = now };
        db.Users.Add(user);
        db.SaveChanges();
        return user.ToDomain();
    }

    public User EnsureDemoUser()
    {
        var user = db.Users.OrderBy(value => value.CreatedAt).FirstOrDefault();
        if (user is not null) return user.ToDomain();

        var now = DateTimeOffset.UtcNow;
        user = new UserEntity { Id = Guid.NewGuid(), DisplayName = "Demo User", CreatedAt = now, UpdatedAt = now };
        db.Users.Add(user);
        db.SaveChanges();
        return user.ToDomain();
    }
}

public sealed class PostgresSpaceRepository(VmestraDbContext db) : ISpaceRepository
{
    public bool Exists(Guid spaceId) => db.Spaces.Any(space => space.Id == spaceId);

    public IReadOnlyCollection<Space> GetSpaces(Guid? userId)
    {
        var query = db.Spaces.AsNoTracking();
        if (userId is not null)
        {
            query = query.Where(space => db.SpaceMembers.Any(member => member.SpaceId == space.Id && member.UserId == userId));
        }
        return query.OrderBy(space => space.CreatedAt).Select(space => space.ToDomain()).ToArray();
    }

    public Space? GetSpace(Guid spaceId) => db.Spaces.AsNoTracking().SingleOrDefault(space => space.Id == spaceId)?.ToDomain();

    public Space CreateSpace(CreateSpaceRequest request, Guid createdByUserId)
    {
        var now = DateTimeOffset.UtcNow;
        var space = new SpaceEntity { Id = Guid.NewGuid(), Kind = request.Kind, Name = request.Name.Trim(), State = SpaceState.Active, CreatedByUserId = createdByUserId, CreatedAt = now, UpdatedAt = now };
        db.Spaces.Add(space);
        db.SpaceMembers.Add(new SpaceMemberEntity { Id = Guid.NewGuid(), SpaceId = space.Id, UserId = createdByUserId, Role = SpaceMemberRole.Admin, JoinedAt = now });
        db.SaveChanges();
        return space.ToDomain();
    }

    public Space EnsurePersonalSpace(Guid userId)
    {
        var existing = db.Spaces
            .AsNoTracking()
            .Where(space => space.Kind == SpaceKind.Personal && db.SpaceMembers.Any(member => member.SpaceId == space.Id && member.UserId == userId))
            .OrderBy(space => space.CreatedAt)
            .FirstOrDefault();
        if (existing is not null) return existing.ToDomain();

        var now = DateTimeOffset.UtcNow;
        var space = new SpaceEntity { Id = Guid.NewGuid(), Kind = SpaceKind.Personal, Name = "Личное пространство", State = SpaceState.Active, CreatedByUserId = userId, CreatedAt = now, UpdatedAt = now };
        db.Spaces.Add(space);
        db.SpaceMembers.Add(new SpaceMemberEntity { Id = Guid.NewGuid(), SpaceId = space.Id, UserId = userId, Role = SpaceMemberRole.Admin, JoinedAt = now });
        db.SaveChanges();
        return space.ToDomain();
    }

    public Space? UpdateSpace(Guid spaceId, UpdateSpaceRequest request)
    {
        var space = db.Spaces.SingleOrDefault(value => value.Id == spaceId);
        if (space is null) return null;
        if (!string.IsNullOrWhiteSpace(request.Name)) space.Name = request.Name.Trim();
        if (request.State is not null) space.State = request.State.Value;
        space.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return space.ToDomain();
    }

    public IReadOnlyCollection<SpaceMember> GetMembers(Guid spaceId) => db.SpaceMembers.AsNoTracking().Where(member => member.SpaceId == spaceId).Select(member => member.ToDomain()).ToArray();

    public SpaceMember? GetMember(Guid spaceId, Guid userId) => db.SpaceMembers.AsNoTracking().SingleOrDefault(member => member.SpaceId == spaceId && member.UserId == userId)?.ToDomain();

    public SpaceMember? AddMember(Guid spaceId, AddSpaceMemberRequest request)
    {
        if (!Exists(spaceId)) return null;
        if (db.SpaceMembers.Any(member => member.SpaceId == spaceId && member.UserId == request.UserId)) return null;
        var member = new SpaceMemberEntity { Id = Guid.NewGuid(), SpaceId = spaceId, UserId = request.UserId, Role = request.Role, PersonalSpaceName = request.PersonalSpaceName, JoinedAt = DateTimeOffset.UtcNow };
        db.SpaceMembers.Add(member);
        db.SaveChanges();
        return member.ToDomain();
    }

    public SpaceMember? UpdateMember(Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request)
    {
        var member = db.SpaceMembers.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == memberId);
        if (member is null) return null;
        if (request.Role is not null) member.Role = request.Role.Value;
        if (request.PersonalSpaceName is not null) member.PersonalSpaceName = request.PersonalSpaceName;
        db.SaveChanges();
        return member.ToDomain();
    }

    public bool RemoveMember(Guid spaceId, Guid memberId)
    {
        var member = db.SpaceMembers.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == memberId);
        if (member is null) return false;
        db.SpaceMembers.Remove(member);
        db.SaveChanges();
        return true;
    }
}

public sealed class PostgresIdeaRepository(VmestraDbContext db, IHistoryRepository history) : IIdeaRepository
{
    public IReadOnlyCollection<Idea> GetIdeas(Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived)
    {
        var query = db.Ideas.AsNoTracking().Include(idea => idea.IdeaTags).Where(idea => idea.SpaceId == spaceId);
        if (folderId is not null) query = query.Where(idea => idea.FolderId == folderId);
        if (tagId is not null) query = query.Where(idea => idea.IdeaTags.Any(tag => tag.TagId == tagId));
        if (categoryId is not null) query = query.Where(idea => idea.CategoryId == categoryId);
        if (state is not null) query = query.Where(idea => idea.State == state);
        if (!includeArchived) query = query.Where(idea => idea.State != IdeaState.Archived);
        return query.OrderByDescending(idea => idea.UpdatedAt).Select(idea => idea.ToDomain()).ToArray();
    }

    public Idea? GetIdea(Guid spaceId, Guid ideaId) => db.Ideas.AsNoTracking().Include(idea => idea.IdeaTags).SingleOrDefault(idea => idea.SpaceId == spaceId && idea.Id == ideaId)?.ToDomain();

    public Idea? CreateIdea(Guid spaceId, CreateIdeaRequest request, Guid createdByUserId)
    {
        if (!db.Spaces.Any(space => space.Id == spaceId)) return null;
        var tagIds = (request.TagIds ?? []).Distinct().ToArray();
        if (!ValidateIdeaRelations(spaceId, request.FolderId, request.CategoryId, tagIds)) return null;

        var now = DateTimeOffset.UtcNow;
        var idea = new IdeaEntity
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            CreatedByUserId = createdByUserId,
            Text = request.Text.Trim(),
            Title = BlankToNull(request.Title),
            Description = BlankToNull(request.Description),
            FolderId = request.FolderId,
            CategoryId = request.CategoryId,
            State = IdeaState.Inbox,
            IsRecurring = request.IsRecurring,
            CreatedAt = now,
            UpdatedAt = now,
            IdeaTags = tagIds.Select(tagId => new IdeaTagEntity { TagId = tagId }).ToList()
        };
        db.Ideas.Add(idea);
        db.SaveChanges();
        history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(idea.Id, idea.CreatedByUserId, "Идея добавлена", null, null, now), idea.CreatedByUserId);
        return GetIdea(spaceId, idea.Id);
    }

    public Idea? UpdateIdea(Guid spaceId, Guid ideaId, UpdateIdeaRequest request, Guid updatedByUserId)
    {
        var idea = db.Ideas.Include(value => value.IdeaTags).SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
        if (idea is null) return null;
        var tagIds = request.TagIds?.Distinct().ToArray();
        if (!ValidateIdeaRelations(spaceId, request.FolderId ?? idea.FolderId, request.CategoryId ?? idea.CategoryId, tagIds ?? idea.IdeaTags.Select(tag => tag.TagId).ToArray())) return null;

        if (!string.IsNullOrWhiteSpace(request.Text)) idea.Text = request.Text.Trim();
        if (request.Title is not null) idea.Title = BlankToNull(request.Title);
        if (request.Description is not null) idea.Description = BlankToNull(request.Description);
        if (request.FolderId is not null) idea.FolderId = request.FolderId;
        if (request.CategoryId is not null) idea.CategoryId = request.CategoryId;
        if (request.State is not null) idea.State = request.State.Value;
        if (request.IsRecurring is not null) idea.IsRecurring = request.IsRecurring.Value;
        if (tagIds is not null)
        {
            idea.IdeaTags.Clear();
            foreach (var tagId in tagIds) idea.IdeaTags.Add(new IdeaTagEntity { IdeaId = idea.Id, TagId = tagId });
        }
        idea.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, updatedByUserId, "Идея обновлена", null, null, DateTimeOffset.UtcNow), updatedByUserId);
        return GetIdea(spaceId, ideaId);
    }

    public Idea? ArchiveIdea(Guid spaceId, Guid ideaId, Guid archivedByUserId)
    {
        var idea = db.Ideas.Include(value => value.IdeaTags).SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
        if (idea is null) return null;
        idea.State = IdeaState.Archived;
        idea.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, archivedByUserId, "Идея архивирована", null, null, DateTimeOffset.UtcNow), archivedByUserId);
        return GetIdea(spaceId, ideaId);
    }

    public Idea? RestoreIdea(Guid spaceId, Guid ideaId, Guid restoredByUserId)
    {
        var idea = db.Ideas.Include(value => value.IdeaTags).SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
        if (idea is null) return null;
        idea.State = IdeaState.Active;
        idea.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, restoredByUserId, "Идея возвращена", null, null, DateTimeOffset.UtcNow), restoredByUserId);
        return GetIdea(spaceId, ideaId);
    }

    public void SetIdeaState(Guid spaceId, Guid ideaId, IdeaState state)
    {
        var idea = db.Ideas.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
        if (idea is null) return;
        idea.State = state;
        idea.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
    }

    private bool ValidateIdeaRelations(Guid spaceId, Guid? folderId, Guid? categoryId, IReadOnlyCollection<Guid> tagIds)
    {
        if (folderId is not null && !db.Folders.Any(folder => folder.SpaceId == spaceId && folder.Id == folderId)) return false;
        if (categoryId is not null && !db.Categories.Any(category => category.SpaceId == spaceId && category.Id == categoryId)) return false;
        return tagIds.All(tagId => db.Tags.Any(tag => tag.SpaceId == spaceId && tag.Id == tagId));
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class PostgresClassificationRepository(VmestraDbContext db) : IClassificationRepository
{
    public IReadOnlyCollection<Folder> GetFolders(Guid spaceId) => db.Folders.AsNoTracking().Where(folder => folder.SpaceId == spaceId).OrderBy(folder => folder.SortOrder).Select(folder => folder.ToDomain()).ToArray();

    public Folder? CreateFolder(Guid spaceId, CreateNamedItemRequest request)
    {
        if (!db.Spaces.Any(space => space.Id == spaceId)) return null;
        var now = DateTimeOffset.UtcNow;
        var folder = new FolderEntity { Id = Guid.NewGuid(), SpaceId = spaceId, Name = request.Name.Trim(), SortOrder = db.Folders.Count(value => value.SpaceId == spaceId), CreatedAt = now, UpdatedAt = now };
        db.Folders.Add(folder);
        db.SaveChanges();
        return folder.ToDomain();
    }

    public Folder? UpdateFolder(Guid spaceId, Guid folderId, UpdateNamedItemRequest request)
    {
        var folder = db.Folders.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == folderId);
        if (folder is null) return null;
        if (!string.IsNullOrWhiteSpace(request.Name)) folder.Name = request.Name.Trim();
        folder.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return folder.ToDomain();
    }

    public bool RemoveFolder(Guid spaceId, Guid folderId)
    {
        var folder = db.Folders.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == folderId);
        if (folder is null) return false;
        foreach (var idea in db.Ideas.Where(idea => idea.SpaceId == spaceId && idea.FolderId == folderId)) idea.FolderId = null;
        db.Folders.Remove(folder);
        db.SaveChanges();
        return true;
    }

    public IReadOnlyCollection<Tag> GetTags(Guid spaceId) => db.Tags.AsNoTracking().Where(tag => tag.SpaceId == spaceId).OrderBy(tag => tag.Name).Select(tag => tag.ToDomain()).ToArray();

    public Tag? CreateTag(Guid spaceId, CreateTagRequest request)
    {
        if (!db.Spaces.Any(space => space.Id == spaceId)) return null;
        var tag = new TagEntity { Id = Guid.NewGuid(), SpaceId = spaceId, Name = request.Name.Trim(), Source = request.Source, CreatedAt = DateTimeOffset.UtcNow };
        db.Tags.Add(tag);
        db.SaveChanges();
        return tag.ToDomain();
    }

    public Tag? UpdateTag(Guid spaceId, Guid tagId, UpdateTagRequest request)
    {
        var tag = db.Tags.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == tagId);
        if (tag is null) return null;
        if (!string.IsNullOrWhiteSpace(request.Name)) tag.Name = request.Name.Trim();
        if (request.Source is not null) tag.Source = request.Source.Value;
        db.SaveChanges();
        return tag.ToDomain();
    }

    public bool RemoveTag(Guid spaceId, Guid tagId)
    {
        var tag = db.Tags.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == tagId);
        if (tag is null) return false;
        db.IdeaTags.RemoveRange(db.IdeaTags.Where(value => value.TagId == tagId && db.Ideas.Any(idea => idea.Id == value.IdeaId && idea.SpaceId == spaceId)));
        db.Tags.Remove(tag);
        db.SaveChanges();
        return true;
    }

    public IReadOnlyCollection<Category> GetCategories(Guid spaceId) => db.Categories.AsNoTracking().Where(category => category.SpaceId == spaceId).OrderBy(category => category.Name).Select(category => category.ToDomain()).ToArray();

    public Category? CreateCategory(Guid spaceId, CreateNamedItemRequest request)
    {
        if (!db.Spaces.Any(space => space.Id == spaceId)) return null;
        var category = new CategoryEntity { Id = Guid.NewGuid(), SpaceId = spaceId, Name = request.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
        db.Categories.Add(category);
        db.SaveChanges();
        return category.ToDomain();
    }

    public Category? UpdateCategory(Guid spaceId, Guid categoryId, UpdateNamedItemRequest request)
    {
        var category = db.Categories.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == categoryId);
        if (category is null) return null;
        if (!string.IsNullOrWhiteSpace(request.Name)) category.Name = request.Name.Trim();
        db.SaveChanges();
        return category.ToDomain();
    }

    public bool RemoveCategory(Guid spaceId, Guid categoryId)
    {
        var category = db.Categories.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == categoryId);
        if (category is null) return false;
        foreach (var idea in db.Ideas.Where(idea => idea.SpaceId == spaceId && idea.CategoryId == categoryId)) idea.CategoryId = null;
        db.Categories.Remove(category);
        db.SaveChanges();
        return true;
    }
}

public sealed class PostgresPlanningRepository(VmestraDbContext db, IHistoryRepository history) : IPlanningRepository
{
    public IReadOnlyCollection<ScheduledIdea> GetSchedule(Guid spaceId, DateTimeOffset? from, DateTimeOffset? to)
    {
        var query = db.ScheduledIdeas.AsNoTracking().Include(item => item.Participants).Where(item => item.SpaceId == spaceId);
        if (from is not null) query = query.Where(item => item.StartsAt >= from);
        if (to is not null) query = query.Where(item => item.StartsAt <= to);
        return query.OrderBy(item => item.StartsAt).Select(item => item.ToDomain()).ToArray();
    }

    public ScheduledIdea? ScheduleIdea(Guid spaceId, Guid ideaId, ScheduleIdeaRequest request, Guid createdByUserId)
    {
        var idea = db.Ideas.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
        if (idea is null) return null;
        var participants = (request.ParticipantUserIds ?? []).Distinct().ToArray();
        if (!ValidateParticipants(spaceId, participants)) return null;

        var now = DateTimeOffset.UtcNow;
        var startsAt = request.StartsAt.ToUniversalTime();
        var endsAt = request.EndsAt?.ToUniversalTime();
        var scheduled = new ScheduledIdeaEntity
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            IdeaId = ideaId,
            CreatedByUserId = createdByUserId,
            StartsAt = startsAt,
            EndsAt = endsAt,
            State = ScheduledIdeaState.Planned,
            Note = BlankToNull(request.Note),
            CreatedAt = now,
            UpdatedAt = now
        };
        db.ScheduledIdeas.Add(scheduled);
        idea.State = IdeaState.Planned;
        idea.UpdatedAt = now;
        db.SaveChanges();
        foreach (var userId in participants)
        {
            db.Set<ScheduledIdeaParticipantEntity>().Add(new ScheduledIdeaParticipantEntity { ScheduledIdeaId = scheduled.Id, UserId = userId });
        }
        db.SaveChanges();
        history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, scheduled.CreatedByUserId, "Идея запланирована", null, null, startsAt), scheduled.CreatedByUserId);
        return GetSchedule(spaceId, null, null).Single(item => item.Id == scheduled.Id);
    }

    public ScheduledIdea? UpdateSchedule(Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request, Guid updatedByUserId)
    {
        var scheduled = db.ScheduledIdeas.Include(item => item.Participants).SingleOrDefault(item => item.SpaceId == spaceId && item.Id == scheduledIdeaId);
        if (scheduled is null) return null;
        if (request.ParticipantUserIds is not null && !ValidateParticipants(spaceId, request.ParticipantUserIds)) return null;

        var now = DateTimeOffset.UtcNow;
        scheduled.StartsAt = request.StartsAt?.ToUniversalTime() ?? scheduled.StartsAt;
        scheduled.EndsAt = request.EndsAt?.ToUniversalTime() ?? scheduled.EndsAt;
        scheduled.State = request.State == ScheduledIdeaState.Moved && request.StartsAt is not null && request.StartsAt.Value > now
            ? ScheduledIdeaState.Planned
            : request.State ?? scheduled.State;
        scheduled.Note = request.Note ?? scheduled.Note;
        scheduled.UpdatedAt = now;
        if (request.ParticipantUserIds is not null)
        {
            scheduled.Participants.Clear();
            foreach (var userId in request.ParticipantUserIds.Distinct()) scheduled.Participants.Add(new ScheduledIdeaParticipantEntity { ScheduledIdeaId = scheduled.Id, UserId = userId });
        }

        if (request.State is ScheduledIdeaState.Moved)
        {
            if (request.StartsAt is not null && request.StartsAt.Value > now)
            {
                SetIdeaState(spaceId, scheduled.IdeaId, IdeaState.Planned, now);
            }
            else
            {
                SetIdeaStateByFuturePlans(spaceId, scheduled.IdeaId, scheduled.Id, scheduled.State, scheduled.StartsAt, now);
            }

            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(scheduled.IdeaId, updatedByUserId, "Идея перенесена", null, null, scheduled.StartsAt), updatedByUserId);
        }
        else if (scheduled.State is ScheduledIdeaState.Canceled)
        {
            SetIdeaStateByFuturePlans(spaceId, scheduled.IdeaId, scheduled.Id, scheduled.State, scheduled.StartsAt, now);
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(scheduled.IdeaId, updatedByUserId, "Идея отменена", null, null, now), updatedByUserId);
        }
        else if (scheduled.State is ScheduledIdeaState.Experienced)
        {
            SetIdeaState(spaceId, scheduled.IdeaId, IdeaState.Experienced, now);
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(scheduled.IdeaId, updatedByUserId, "Идея состоялась", null, null, now), updatedByUserId);
        }
        else if (scheduled.State is ScheduledIdeaState.Planned && scheduled.StartsAt > now)
        {
            SetIdeaState(spaceId, scheduled.IdeaId, IdeaState.Planned, now);
            if (request.StartsAt is not null || request.EndsAt is not null || request.ParticipantUserIds is not null || request.Note is not null)
            {
                history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(scheduled.IdeaId, updatedByUserId, "Идея перенесена", null, null, scheduled.StartsAt), updatedByUserId);
            }
        }

        db.SaveChanges();
        return GetSchedule(spaceId, null, null).Single(item => item.Id == scheduled.Id);
    }

    public bool HasActiveFuturePlan(Guid spaceId, Guid ideaId, DateTimeOffset now) => db.ScheduledIdeas.Any(item => item.SpaceId == spaceId && item.IdeaId == ideaId && item.State == ScheduledIdeaState.Planned && item.StartsAt > now);

    private bool ValidateParticipants(Guid spaceId, IEnumerable<Guid> userIds) => userIds.All(userId => db.SpaceMembers.Any(member => member.SpaceId == spaceId && member.UserId == userId));

    private void SetIdeaStateByFuturePlans(Guid spaceId, Guid ideaId, Guid changedScheduleId, ScheduledIdeaState changedState, DateTimeOffset changedStartsAt, DateTimeOffset now)
    {
        var hasFuturePlan = db.ScheduledIdeas.Any(item =>
            item.SpaceId == spaceId &&
            item.IdeaId == ideaId &&
            item.Id != changedScheduleId &&
            item.State == ScheduledIdeaState.Planned &&
            item.StartsAt > now);

        hasFuturePlan = hasFuturePlan || changedState == ScheduledIdeaState.Planned && changedStartsAt > now;
        SetIdeaState(spaceId, ideaId, hasFuturePlan ? IdeaState.Planned : IdeaState.Active, now);
    }

    private void SetIdeaState(Guid spaceId, Guid ideaId, IdeaState state, DateTimeOffset now)
    {
        var idea = db.Ideas.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
        if (idea is null) return;
        idea.State = state;
        idea.UpdatedAt = now;
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class PostgresHistoryRepository(VmestraDbContext db) : IHistoryRepository
{
    public IReadOnlyCollection<HistoryEntry> GetHistory(Guid spaceId, Guid? ideaId)
    {
        var query = db.HistoryEntries.AsNoTracking().Where(entry => entry.SpaceId == spaceId);
        if (ideaId is not null) query = query.Where(entry => entry.IdeaId == ideaId);
        return query.OrderByDescending(entry => entry.HappenedAt).Select(entry => entry.ToDomain()).ToArray();
    }

    public HistoryEntry? CreateHistoryEntry(Guid spaceId, CreateHistoryEntryRequest request, Guid createdByUserId)
    {
        if (!db.Spaces.Any(space => space.Id == spaceId)) return null;
        if (request.IdeaId is not null && !db.Ideas.Any(idea => idea.SpaceId == spaceId && idea.Id == request.IdeaId)) return null;
        var now = DateTimeOffset.UtcNow;
        var entry = new HistoryEntryEntity { Id = Guid.NewGuid(), SpaceId = spaceId, IdeaId = request.IdeaId, CreatedByUserId = createdByUserId, Title = request.Title.Trim(), PublicNote = BlankToNull(request.PublicNote), PrivateNote = BlankToNull(request.PrivateNote), HappenedAt = request.HappenedAt ?? now, CreatedAt = now, UpdatedAt = now };
        db.HistoryEntries.Add(entry);
        db.SaveChanges();
        return entry.ToDomain();
    }

    public HistoryEntry? UpdateHistoryEntry(Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request)
    {
        var entry = db.HistoryEntries.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == entryId);
        if (entry is null) return null;
        if (!string.IsNullOrWhiteSpace(request.Title)) entry.Title = request.Title.Trim();
        if (request.PublicNote is not null) entry.PublicNote = request.PublicNote;
        if (request.PrivateNote is not null) entry.PrivateNote = request.PrivateNote;
        if (request.HappenedAt is not null) entry.HappenedAt = request.HappenedAt.Value;
        entry.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return entry.ToDomain();
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class PostgresCommentRepository(VmestraDbContext db) : ICommentRepository
{
    public IReadOnlyCollection<Comment> GetComments(Guid spaceId, Guid ideaId) => db.Comments.AsNoTracking().Where(comment => comment.SpaceId == spaceId && comment.IdeaId == ideaId).OrderBy(comment => comment.CreatedAt).Select(comment => comment.ToDomain()).ToArray();

    public Comment? AddComment(Guid spaceId, Guid ideaId, CreateCommentRequest request, Guid createdByUserId)
    {
        if (!db.Ideas.Any(idea => idea.SpaceId == spaceId && idea.Id == ideaId)) return null;
        var now = DateTimeOffset.UtcNow;
        var comment = new CommentEntity { Id = Guid.NewGuid(), SpaceId = spaceId, IdeaId = ideaId, CreatedByUserId = createdByUserId, Text = request.Text.Trim(), CreatedAt = now, UpdatedAt = now };
        db.Comments.Add(comment);
        db.SaveChanges();
        return comment.ToDomain();
    }
}
