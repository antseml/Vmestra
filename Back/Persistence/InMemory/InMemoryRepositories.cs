using Back.Api;
using Back.Application.Abstractions;
using Back.Domain;

namespace Back.Persistence.InMemory;

public sealed class InMemoryUserRepository(InMemoryVmestraDatabase database) : IUserRepository
{
    public IReadOnlyCollection<User> GetUsers()
    {
        lock (database.Gate) return database.Users.ToArray();
    }

    public User? GetUser(Guid userId)
    {
        lock (database.Gate) return database.Users.SingleOrDefault(user => user.Id == userId);
    }

    public User? GetUserByEmail(string normalizedEmail)
    {
        lock (database.Gate) return database.Users.SingleOrDefault(user => user.Email is not null && string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase));
    }

    public User CreateUser(string email, string displayName, string passwordHash)
    {
        lock (database.Gate)
        {
            var now = DateTimeOffset.UtcNow;
            var user = new User(Guid.NewGuid(), displayName, email, passwordHash, now, now);
            database.Users.Add(user);
            return user;
        }
    }

    public User EnsureDemoUser()
    {
        lock (database.Gate)
        {
            var user = database.Users.FirstOrDefault();
            if (user is not null) return user;

            var now = DateTimeOffset.UtcNow;
            user = new User(Guid.NewGuid(), "Demo User", null, null, now, now);
            database.Users.Add(user);
            return user;
        }
    }
}

public sealed class InMemorySpaceRepository(InMemoryVmestraDatabase database) : ISpaceRepository
{
    public bool Exists(Guid spaceId)
    {
        lock (database.Gate) return database.Spaces.Any(space => space.Id == spaceId);
    }

    public IReadOnlyCollection<Space> GetSpaces(Guid? userId)
    {
        lock (database.Gate)
        {
            if (userId is null) return database.Spaces.ToArray();

            var spaceIds = database.Members.Where(member => member.UserId == userId).Select(member => member.SpaceId).ToHashSet();
            return database.Spaces.Where(space => spaceIds.Contains(space.Id)).ToArray();
        }
    }

    public Space? GetSpace(Guid spaceId)
    {
        lock (database.Gate) return database.Spaces.SingleOrDefault(space => space.Id == spaceId);
    }

    public Space CreateSpace(CreateSpaceRequest request, Guid createdByUserId)
    {
        lock (database.Gate)
        {
            var now = DateTimeOffset.UtcNow;
            var space = new Space(Guid.NewGuid(), request.Kind, request.Name.Trim(), SpaceState.Active, createdByUserId, now, now);
            database.Spaces.Add(space);
            database.Members.Add(new SpaceMember(Guid.NewGuid(), space.Id, createdByUserId, SpaceMemberRole.Admin, null, now));
            return space;
        }
    }

    public Space EnsurePersonalSpace(Guid userId)
    {
        lock (database.Gate)
        {
            var existingSpaceIds = database.Members.Where(member => member.UserId == userId).Select(member => member.SpaceId).ToHashSet();
            var existing = database.Spaces.FirstOrDefault(space => existingSpaceIds.Contains(space.Id) && space.Kind == SpaceKind.Personal);
            if (existing is not null) return existing;

            var now = DateTimeOffset.UtcNow;
            var space = new Space(Guid.NewGuid(), SpaceKind.Personal, "Личное пространство", SpaceState.Active, userId, now, now);
            database.Spaces.Add(space);
            database.Members.Add(new SpaceMember(Guid.NewGuid(), space.Id, userId, SpaceMemberRole.Admin, null, now));
            return space;
        }
    }

    public Space? UpdateSpace(Guid spaceId, UpdateSpaceRequest request)
    {
        lock (database.Gate)
        {
            var index = database.Spaces.FindIndex(space => space.Id == spaceId);
            if (index < 0) return null;

            var current = database.Spaces[index];
            var updated = current with
            {
                Name = string.IsNullOrWhiteSpace(request.Name) ? current.Name : request.Name.Trim(),
                State = request.State ?? current.State,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            database.Spaces[index] = updated;
            return updated;
        }
    }

    public IReadOnlyCollection<SpaceMember> GetMembers(Guid spaceId)
    {
        lock (database.Gate) return database.Members.Where(member => member.SpaceId == spaceId).ToArray();
    }

    public SpaceMember? GetMember(Guid spaceId, Guid userId)
    {
        lock (database.Gate) return database.Members.SingleOrDefault(member => member.SpaceId == spaceId && member.UserId == userId);
    }

    public SpaceMember? AddMember(Guid spaceId, AddSpaceMemberRequest request)
    {
        lock (database.Gate)
        {
            if (!database.Spaces.Any(space => space.Id == spaceId)) return null;
            if (database.Members.Any(member => member.SpaceId == spaceId && member.UserId == request.UserId)) return null;

            var member = new SpaceMember(Guid.NewGuid(), spaceId, request.UserId, request.Role, request.PersonalSpaceName, DateTimeOffset.UtcNow);
            database.Members.Add(member);
            return member;
        }
    }

    public SpaceMember? UpdateMember(Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request)
    {
        lock (database.Gate)
        {
            var index = database.Members.FindIndex(member => member.SpaceId == spaceId && member.Id == memberId);
            if (index < 0) return null;

            var current = database.Members[index];
            var updated = current with
            {
                Role = request.Role ?? current.Role,
                PersonalSpaceName = request.PersonalSpaceName ?? current.PersonalSpaceName
            };
            database.Members[index] = updated;
            return updated;
        }
    }

    public bool RemoveMember(Guid spaceId, Guid memberId)
    {
        lock (database.Gate) return database.Members.RemoveAll(member => member.SpaceId == spaceId && member.Id == memberId) > 0;
    }
}

public sealed class InMemoryIdeaRepository(InMemoryVmestraDatabase database, IHistoryRepository history) : IIdeaRepository
{
    public IReadOnlyCollection<Idea> GetIdeas(Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived)
    {
        lock (database.Gate)
        {
            var query = database.Ideas.Where(idea => idea.SpaceId == spaceId);
            if (folderId is not null) query = query.Where(idea => idea.FolderId == folderId);
            if (tagId is not null) query = query.Where(idea => idea.TagIds.Contains(tagId.Value));
            if (categoryId is not null) query = query.Where(idea => idea.CategoryId == categoryId);
            if (state is not null) query = query.Where(idea => idea.State == state);
            if (!includeArchived) query = query.Where(idea => idea.State != IdeaState.Archived);
            return query.OrderByDescending(idea => idea.UpdatedAt).ToArray();
        }
    }

    public Idea? GetIdea(Guid spaceId, Guid ideaId)
    {
        lock (database.Gate) return database.Ideas.SingleOrDefault(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
    }

    public Idea? CreateIdea(Guid spaceId, CreateIdeaRequest request, Guid createdByUserId)
    {
        lock (database.Gate)
        {
            if (!database.Spaces.Any(space => space.Id == spaceId)) return null;
            var tagIds = (request.TagIds ?? []).Distinct().ToArray();
            if (!ValidateIdeaRelations(spaceId, request.FolderId, request.CategoryId, tagIds)) return null;
            var now = DateTimeOffset.UtcNow;
            var idea = new Idea(
                Guid.NewGuid(),
                spaceId,
                createdByUserId,
                request.Text.Trim(),
                BlankToNull(request.Title),
                BlankToNull(request.Description),
                request.FolderId,
                request.CategoryId,
                tagIds,
                IdeaState.Inbox,
                request.IsRecurring,
                now,
                now);

            database.Ideas.Add(idea);
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(idea.Id, idea.CreatedByUserId, "Идея добавлена", null, null, now), idea.CreatedByUserId);
            return idea;
        }
    }

    public Idea? UpdateIdea(Guid spaceId, Guid ideaId, UpdateIdeaRequest request, Guid updatedByUserId)
    {
        lock (database.Gate)
        {
            var index = database.Ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
            if (index < 0) return null;

            var current = database.Ideas[index];
            var tagIds = request.TagIds?.Distinct().ToArray();
            if (!ValidateIdeaRelations(spaceId, request.FolderId ?? current.FolderId, request.CategoryId ?? current.CategoryId, tagIds ?? current.TagIds.ToArray())) return null;
            var updated = current with
            {
                Text = string.IsNullOrWhiteSpace(request.Text) ? current.Text : request.Text.Trim(),
                Title = request.Title is null ? current.Title : BlankToNull(request.Title),
                Description = request.Description is null ? current.Description : BlankToNull(request.Description),
                FolderId = request.FolderId ?? current.FolderId,
                CategoryId = request.CategoryId ?? current.CategoryId,
                TagIds = tagIds is null ? current.TagIds : tagIds,
                State = request.State ?? current.State,
                IsRecurring = request.IsRecurring ?? current.IsRecurring,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            database.Ideas[index] = updated;
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, updatedByUserId, "Идея обновлена", null, null, DateTimeOffset.UtcNow), updatedByUserId);
            return updated;
        }
    }

    public Idea? ArchiveIdea(Guid spaceId, Guid ideaId, Guid archivedByUserId)
    {
        lock (database.Gate)
        {
            var index = database.Ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
            if (index < 0) return null;
            var updated = database.Ideas[index] with { State = IdeaState.Archived, UpdatedAt = DateTimeOffset.UtcNow };
            database.Ideas[index] = updated;
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, archivedByUserId, "Идея архивирована", null, null, DateTimeOffset.UtcNow), archivedByUserId);
            return updated;
        }
    }

    public Idea? RestoreIdea(Guid spaceId, Guid ideaId, Guid restoredByUserId)
    {
        lock (database.Gate)
        {
            var index = database.Ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
            if (index < 0) return null;
            var updated = database.Ideas[index] with { State = IdeaState.Active, UpdatedAt = DateTimeOffset.UtcNow };
            database.Ideas[index] = updated;
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, restoredByUserId, "Идея возвращена", null, null, DateTimeOffset.UtcNow), restoredByUserId);
            return updated;
        }
    }

    public void SetIdeaState(Guid spaceId, Guid ideaId, IdeaState state)
    {
        lock (database.Gate)
        {
            var index = database.Ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
            if (index >= 0)
            {
                database.Ideas[index] = database.Ideas[index] with { State = state, UpdatedAt = DateTimeOffset.UtcNow };
            }
        }
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private bool ValidateIdeaRelations(Guid spaceId, Guid? folderId, Guid? categoryId, IReadOnlyCollection<Guid> tagIds)
    {
        if (folderId is not null && !database.Folders.Any(folder => folder.SpaceId == spaceId && folder.Id == folderId)) return false;
        if (categoryId is not null && !database.Categories.Any(category => category.SpaceId == spaceId && category.Id == categoryId)) return false;
        return tagIds.All(tagId => database.Tags.Any(tag => tag.SpaceId == spaceId && tag.Id == tagId));
    }
}

public sealed class InMemoryClassificationRepository(InMemoryVmestraDatabase database) : IClassificationRepository
{
    public IReadOnlyCollection<Folder> GetFolders(Guid spaceId)
    {
        lock (database.Gate) return database.Folders.Where(folder => folder.SpaceId == spaceId).OrderBy(folder => folder.SortOrder).ToArray();
    }

    public Folder? CreateFolder(Guid spaceId, CreateNamedItemRequest request)
    {
        lock (database.Gate)
        {
            if (!database.Spaces.Any(space => space.Id == spaceId)) return null;
            var now = DateTimeOffset.UtcNow;
            var folder = new Folder(Guid.NewGuid(), spaceId, request.Name.Trim(), database.Folders.Count(folder => folder.SpaceId == spaceId), now, now);
            database.Folders.Add(folder);
            return folder;
        }
    }

    public Folder? UpdateFolder(Guid spaceId, Guid folderId, UpdateNamedItemRequest request)
    {
        lock (database.Gate)
        {
            var index = database.Folders.FindIndex(folder => folder.SpaceId == spaceId && folder.Id == folderId);
            if (index < 0) return null;
            var current = database.Folders[index];
            var updated = current with { Name = string.IsNullOrWhiteSpace(request.Name) ? current.Name : request.Name.Trim(), UpdatedAt = DateTimeOffset.UtcNow };
            database.Folders[index] = updated;
            return updated;
        }
    }

    public bool RemoveFolder(Guid spaceId, Guid folderId)
    {
        lock (database.Gate)
        {
            foreach (var ideaIndex in database.Ideas.Select((idea, index) => (idea, index)).Where(pair => pair.idea.SpaceId == spaceId && pair.idea.FolderId == folderId).Select(pair => pair.index))
            {
                database.Ideas[ideaIndex] = database.Ideas[ideaIndex] with { FolderId = null, UpdatedAt = DateTimeOffset.UtcNow };
            }
            return database.Folders.RemoveAll(folder => folder.SpaceId == spaceId && folder.Id == folderId) > 0;
        }
    }

    public IReadOnlyCollection<Tag> GetTags(Guid spaceId)
    {
        lock (database.Gate) return database.Tags.Where(tag => tag.SpaceId == spaceId).OrderBy(tag => tag.Name).ToArray();
    }

    public Tag? CreateTag(Guid spaceId, CreateTagRequest request)
    {
        lock (database.Gate)
        {
            if (!database.Spaces.Any(space => space.Id == spaceId)) return null;
            var tag = new Tag(Guid.NewGuid(), spaceId, request.Name.Trim(), request.Source, DateTimeOffset.UtcNow);
            database.Tags.Add(tag);
            return tag;
        }
    }

    public Tag? UpdateTag(Guid spaceId, Guid tagId, UpdateTagRequest request)
    {
        lock (database.Gate)
        {
            var index = database.Tags.FindIndex(tag => tag.SpaceId == spaceId && tag.Id == tagId);
            if (index < 0) return null;
            var current = database.Tags[index];
            var updated = current with
            {
                Name = string.IsNullOrWhiteSpace(request.Name) ? current.Name : request.Name.Trim(),
                Source = request.Source ?? current.Source
            };
            database.Tags[index] = updated;
            return updated;
        }
    }

    public bool RemoveTag(Guid spaceId, Guid tagId)
    {
        lock (database.Gate)
        {
            for (var i = 0; i < database.Ideas.Count; i++)
            {
                var idea = database.Ideas[i];
                if (idea.SpaceId == spaceId && idea.TagIds.Contains(tagId))
                {
                    database.Ideas[i] = idea with { TagIds = idea.TagIds.Where(id => id != tagId).ToArray(), UpdatedAt = DateTimeOffset.UtcNow };
                }
            }
            return database.Tags.RemoveAll(tag => tag.SpaceId == spaceId && tag.Id == tagId) > 0;
        }
    }

    public IReadOnlyCollection<Category> GetCategories(Guid spaceId)
    {
        lock (database.Gate) return database.Categories.Where(category => category.SpaceId == spaceId).OrderBy(category => category.Name).ToArray();
    }

    public Category? CreateCategory(Guid spaceId, CreateNamedItemRequest request)
    {
        lock (database.Gate)
        {
            if (!database.Spaces.Any(space => space.Id == spaceId)) return null;
            var category = new Category(Guid.NewGuid(), spaceId, request.Name.Trim(), DateTimeOffset.UtcNow);
            database.Categories.Add(category);
            return category;
        }
    }

    public Category? UpdateCategory(Guid spaceId, Guid categoryId, UpdateNamedItemRequest request)
    {
        lock (database.Gate)
        {
            var index = database.Categories.FindIndex(category => category.SpaceId == spaceId && category.Id == categoryId);
            if (index < 0) return null;
            var current = database.Categories[index];
            var updated = current with { Name = string.IsNullOrWhiteSpace(request.Name) ? current.Name : request.Name.Trim() };
            database.Categories[index] = updated;
            return updated;
        }
    }

    public bool RemoveCategory(Guid spaceId, Guid categoryId)
    {
        lock (database.Gate)
        {
            for (var i = 0; i < database.Ideas.Count; i++)
            {
                var idea = database.Ideas[i];
                if (idea.SpaceId == spaceId && idea.CategoryId == categoryId)
                {
                    database.Ideas[i] = idea with { CategoryId = null, UpdatedAt = DateTimeOffset.UtcNow };
                }
            }
            return database.Categories.RemoveAll(category => category.SpaceId == spaceId && category.Id == categoryId) > 0;
        }
    }
}

public sealed class InMemoryPlanningRepository(InMemoryVmestraDatabase database, IHistoryRepository history) : IPlanningRepository
{
    public IReadOnlyCollection<ScheduledIdea> GetSchedule(Guid spaceId, DateTimeOffset? from, DateTimeOffset? to)
    {
        lock (database.Gate)
        {
            var query = database.ScheduledIdeas.Where(item => item.SpaceId == spaceId);
            if (from is not null) query = query.Where(item => item.StartsAt >= from);
            if (to is not null) query = query.Where(item => item.StartsAt <= to);
            return query.OrderBy(item => item.StartsAt).ToArray();
        }
    }

    public ScheduledIdea? ScheduleIdea(Guid spaceId, Guid ideaId, ScheduleIdeaRequest request, Guid createdByUserId)
    {
        lock (database.Gate)
        {
            var idea = database.Ideas.SingleOrDefault(value => value.SpaceId == spaceId && value.Id == ideaId);
            if (idea is null) return null;
            var participantIds = (request.ParticipantUserIds ?? []).Distinct().ToArray();
            if (!ValidateParticipants(spaceId, participantIds)) return null;

            var now = DateTimeOffset.UtcNow;
            var scheduled = new ScheduledIdea(Guid.NewGuid(), spaceId, ideaId, createdByUserId, request.StartsAt, request.EndsAt, participantIds, ScheduledIdeaState.Planned, BlankToNull(request.Note), now, now);
            database.ScheduledIdeas.Add(scheduled);
            SetIdeaState(spaceId, ideaId, IdeaState.Planned, now);
            history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(ideaId, scheduled.CreatedByUserId, "Идея запланирована", null, null, request.StartsAt), scheduled.CreatedByUserId);
            return scheduled;
        }
    }

    public ScheduledIdea? UpdateSchedule(Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request, Guid updatedByUserId)
    {
        lock (database.Gate)
        {
            var index = database.ScheduledIdeas.FindIndex(item => item.SpaceId == spaceId && item.Id == scheduledIdeaId);
            if (index < 0) return null;
            var participantIds = request.ParticipantUserIds?.Distinct().ToArray();
            if (participantIds is not null && !ValidateParticipants(spaceId, participantIds)) return null;

            var now = DateTimeOffset.UtcNow;
            var current = database.ScheduledIdeas[index];
            var nextState = request.State == ScheduledIdeaState.Moved && request.StartsAt is not null && request.StartsAt.Value > now
                ? ScheduledIdeaState.Planned
                : request.State ?? current.State;
            var updated = current with
            {
                StartsAt = request.StartsAt ?? current.StartsAt,
                EndsAt = request.EndsAt ?? current.EndsAt,
                ParticipantUserIds = participantIds is null ? current.ParticipantUserIds : participantIds,
                State = nextState,
                Note = request.Note ?? current.Note,
                UpdatedAt = now
            };

            database.ScheduledIdeas[index] = updated;

            if (updated.State is ScheduledIdeaState.Canceled)
            {
                SetIdeaStateByFuturePlans(spaceId, updated.IdeaId, now);
                history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(updated.IdeaId, updatedByUserId, "Идея отменена", null, null, now), updatedByUserId);
            }
            else if (request.State is ScheduledIdeaState.Moved)
            {
                if (request.StartsAt is not null && request.StartsAt.Value > now)
                {
                    SetIdeaState(spaceId, updated.IdeaId, IdeaState.Planned, now);
                }
                else
                {
                    SetIdeaStateByFuturePlans(spaceId, updated.IdeaId, now);
                }

                history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(updated.IdeaId, updatedByUserId, "Идея перенесена", null, null, updated.StartsAt), updatedByUserId);
            }
            else if (updated.State is ScheduledIdeaState.Experienced)
            {
                SetIdeaState(spaceId, updated.IdeaId, IdeaState.Experienced, now);
                history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(updated.IdeaId, updatedByUserId, "Идея состоялась", null, null, now), updatedByUserId);
            }
            else if (updated.State is ScheduledIdeaState.Planned && updated.StartsAt > now)
            {
                SetIdeaState(spaceId, updated.IdeaId, IdeaState.Planned, now);
                if (request.StartsAt is not null || request.EndsAt is not null || request.ParticipantUserIds is not null || request.Note is not null)
                {
                    history.CreateHistoryEntry(spaceId, new CreateHistoryEntryRequest(updated.IdeaId, updatedByUserId, "Идея перенесена", null, null, updated.StartsAt), updatedByUserId);
                }
            }

            return updated;
        }
    }

    public bool HasActiveFuturePlan(Guid spaceId, Guid ideaId, DateTimeOffset now)
    {
        lock (database.Gate) return database.ScheduledIdeas.Any(item => item.SpaceId == spaceId && item.IdeaId == ideaId && item.State == ScheduledIdeaState.Planned && item.StartsAt > now);
    }

    private void SetIdeaStateByFuturePlans(Guid spaceId, Guid ideaId, DateTimeOffset now) => SetIdeaState(spaceId, ideaId, HasActiveFuturePlan(spaceId, ideaId, now) ? IdeaState.Planned : IdeaState.Active, now);

    private void SetIdeaState(Guid spaceId, Guid ideaId, IdeaState state, DateTimeOffset now)
    {
        var ideaIndex = database.Ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
        if (ideaIndex >= 0)
        {
            database.Ideas[ideaIndex] = database.Ideas[ideaIndex] with { State = state, UpdatedAt = now };
        }
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private bool ValidateParticipants(Guid spaceId, IEnumerable<Guid> userIds) => userIds.All(userId => database.Members.Any(member => member.SpaceId == spaceId && member.UserId == userId));
}

public sealed class InMemoryHistoryRepository(InMemoryVmestraDatabase database) : IHistoryRepository
{
    public IReadOnlyCollection<HistoryEntry> GetHistory(Guid spaceId, Guid? ideaId)
    {
        lock (database.Gate)
        {
            var query = database.History.Where(entry => entry.SpaceId == spaceId);
            if (ideaId is not null) query = query.Where(entry => entry.IdeaId == ideaId);
            return query.OrderByDescending(entry => entry.HappenedAt).ToArray();
        }
    }

    public HistoryEntry? CreateHistoryEntry(Guid spaceId, CreateHistoryEntryRequest request, Guid createdByUserId)
    {
        lock (database.Gate)
        {
            if (!database.Spaces.Any(space => space.Id == spaceId)) return null;
            if (request.IdeaId is not null && !database.Ideas.Any(idea => idea.SpaceId == spaceId && idea.Id == request.IdeaId)) return null;

            var now = DateTimeOffset.UtcNow;
            var entry = new HistoryEntry(Guid.NewGuid(), spaceId, request.IdeaId, createdByUserId, request.Title.Trim(), BlankToNull(request.PublicNote), BlankToNull(request.PrivateNote), request.HappenedAt ?? now, now, now);
            database.History.Add(entry);
            return entry;
        }
    }

    public HistoryEntry? UpdateHistoryEntry(Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request)
    {
        lock (database.Gate)
        {
            var index = database.History.FindIndex(entry => entry.SpaceId == spaceId && entry.Id == entryId);
            if (index < 0) return null;
            var current = database.History[index];
            var updated = current with
            {
                Title = string.IsNullOrWhiteSpace(request.Title) ? current.Title : request.Title.Trim(),
                PublicNote = request.PublicNote ?? current.PublicNote,
                PrivateNote = request.PrivateNote ?? current.PrivateNote,
                HappenedAt = request.HappenedAt ?? current.HappenedAt,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            database.History[index] = updated;
            return updated;
        }
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class InMemoryCommentRepository(InMemoryVmestraDatabase database) : ICommentRepository
{
    public IReadOnlyCollection<Comment> GetComments(Guid spaceId, Guid ideaId)
    {
        lock (database.Gate) return database.Comments.Where(comment => comment.SpaceId == spaceId && comment.IdeaId == ideaId).OrderBy(comment => comment.CreatedAt).ToArray();
    }

    public Comment? AddComment(Guid spaceId, Guid ideaId, CreateCommentRequest request, Guid createdByUserId)
    {
        lock (database.Gate)
        {
            if (!database.Ideas.Any(idea => idea.SpaceId == spaceId && idea.Id == ideaId)) return null;
            var now = DateTimeOffset.UtcNow;
            var comment = new Comment(Guid.NewGuid(), spaceId, ideaId, createdByUserId, request.Text.Trim(), now, now);
            database.Comments.Add(comment);
            return comment;
        }
    }
}
