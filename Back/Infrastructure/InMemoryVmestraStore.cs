using Back.Api;
using Back.Domain;

namespace Back.Infrastructure;

public sealed class InMemoryVmestraStore
{
    private readonly object _gate = new();
    private readonly List<User> _users = [];
    private readonly List<Space> _spaces = [];
    private readonly List<SpaceMember> _members = [];
    private readonly List<Folder> _folders = [];
    private readonly List<Tag> _tags = [];
    private readonly List<Category> _categories = [];
    private readonly List<Idea> _ideas = [];
    private readonly List<ScheduledIdea> _scheduledIdeas = [];
    private readonly List<HistoryEntry> _history = [];
    private readonly List<Comment> _comments = [];

    public InMemoryVmestraStore()
    {
        var now = DateTimeOffset.UtcNow;
        var user = new User(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Demo User", "demo@vmestra.local", now);
        var personalSpace = new Space(Guid.Parse("22222222-2222-2222-2222-222222222222"), SpaceKind.Personal, "Личное пространство", SpaceState.Active, user.Id, now, now);
        var groupSpace = new Space(Guid.Parse("33333333-3333-3333-3333-333333333333"), SpaceKind.Group, "Идеи на выходные", SpaceState.Active, user.Id, now, now);
        var inboxFolder = new Folder(Guid.Parse("44444444-4444-4444-4444-444444444444"), personalSpace.Id, "Входящие", 0, now, now);
        var foodTag = new Tag(Guid.Parse("55555555-5555-5555-5555-555555555555"), personalSpace.Id, "еда", TagSource.User, now);
        var leisureCategory = new Category(Guid.Parse("66666666-6666-6666-6666-666666666666"), personalSpace.Id, "Досуг", now);
        var idea = new Idea(Guid.Parse("77777777-7777-7777-7777-777777777777"), personalSpace.Id, user.Id, "Попробовать новое место для завтрака", null, null, inboxFolder.Id, leisureCategory.Id, [foodTag.Id], IdeaState.Inbox, false, now, now);

        _users.Add(user);
        _spaces.AddRange([personalSpace, groupSpace]);
        _members.AddRange([
            new SpaceMember(Guid.NewGuid(), personalSpace.Id, user.Id, SpaceMemberRole.Admin, null, now),
            new SpaceMember(Guid.NewGuid(), groupSpace.Id, user.Id, SpaceMemberRole.Admin, "Наши выходные", now)
        ]);
        _folders.Add(inboxFolder);
        _tags.Add(foodTag);
        _categories.Add(leisureCategory);
        _ideas.Add(idea);
        _history.Add(new HistoryEntry(Guid.NewGuid(), personalSpace.Id, idea.Id, user.Id, "Идея добавлена", null, null, now, now, now));
    }

    public IReadOnlyCollection<User> GetUsers()
    {
        lock (_gate) return _users.ToArray();
    }

    public IReadOnlyCollection<Space> GetSpaces(Guid? userId)
    {
        lock (_gate)
        {
            if (userId is null)
            {
                return _spaces.ToArray();
            }

            var spaceIds = _members.Where(member => member.UserId == userId).Select(member => member.SpaceId).ToHashSet();
            return _spaces.Where(space => spaceIds.Contains(space.Id)).ToArray();
        }
    }

    public Space? GetSpace(Guid spaceId)
    {
        lock (_gate) return _spaces.SingleOrDefault(space => space.Id == spaceId);
    }

    public Space CreateSpace(CreateSpaceRequest request)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            var creatorId = request.CreatedByUserId ?? EnsureDemoUser().Id;
            var space = new Space(Guid.NewGuid(), request.Kind, request.Name.Trim(), SpaceState.Active, creatorId, now, now);
            _spaces.Add(space);
            _members.Add(new SpaceMember(Guid.NewGuid(), space.Id, creatorId, SpaceMemberRole.Admin, null, now));
            return space;
        }
    }

    public Space? UpdateSpace(Guid spaceId, UpdateSpaceRequest request)
    {
        lock (_gate)
        {
            var index = _spaces.FindIndex(space => space.Id == spaceId);
            if (index < 0) return null;

            var current = _spaces[index];
            var updated = current with
            {
                Name = string.IsNullOrWhiteSpace(request.Name) ? current.Name : request.Name.Trim(),
                State = request.State ?? current.State,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _spaces[index] = updated;
            return updated;
        }
    }

    public IReadOnlyCollection<SpaceMember> GetMembers(Guid spaceId)
    {
        lock (_gate) return SpaceExists(spaceId) ? _members.Where(member => member.SpaceId == spaceId).ToArray() : [];
    }

    public SpaceMember? AddMember(Guid spaceId, AddSpaceMemberRequest request)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return null;
            if (_members.Any(member => member.SpaceId == spaceId && member.UserId == request.UserId))
            {
                return null;
            }

            var member = new SpaceMember(Guid.NewGuid(), spaceId, request.UserId, request.Role, request.PersonalSpaceName, DateTimeOffset.UtcNow);
            _members.Add(member);
            return member;
        }
    }

    public SpaceMember? UpdateMember(Guid spaceId, Guid memberId, UpdateSpaceMemberRequest request)
    {
        lock (_gate)
        {
            var index = _members.FindIndex(member => member.SpaceId == spaceId && member.Id == memberId);
            if (index < 0) return null;

            var current = _members[index];
            var updated = current with
            {
                Role = request.Role ?? current.Role,
                PersonalSpaceName = request.PersonalSpaceName ?? current.PersonalSpaceName
            };
            _members[index] = updated;
            return updated;
        }
    }

    public bool RemoveMember(Guid spaceId, Guid memberId)
    {
        lock (_gate) return _members.RemoveAll(member => member.SpaceId == spaceId && member.Id == memberId) > 0;
    }

    public IReadOnlyCollection<Idea> GetIdeas(Guid spaceId, Guid? folderId, Guid? tagId, Guid? categoryId, IdeaState? state, bool includeArchived)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return [];

            var query = _ideas.Where(idea => idea.SpaceId == spaceId);
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
        lock (_gate) return _ideas.SingleOrDefault(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
    }

    public Idea? CreateIdea(Guid spaceId, CreateIdeaRequest request)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return null;
            var now = DateTimeOffset.UtcNow;
            var idea = new Idea(
                Guid.NewGuid(),
                spaceId,
                request.CreatedByUserId ?? EnsureDemoUser().Id,
                request.Text.Trim(),
                BlankToNull(request.Title),
                BlankToNull(request.Description),
                request.FolderId,
                request.CategoryId,
                (request.TagIds ?? []).Distinct().ToArray(),
                IdeaState.Inbox,
                request.IsRecurring,
                now,
                now);

            _ideas.Add(idea);
            _history.Add(new HistoryEntry(Guid.NewGuid(), spaceId, idea.Id, idea.CreatedByUserId, "Идея добавлена", null, null, now, now, now));
            return idea;
        }
    }

    public Idea? UpdateIdea(Guid spaceId, Guid ideaId, UpdateIdeaRequest request)
    {
        lock (_gate)
        {
            var index = _ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
            if (index < 0) return null;

            var current = _ideas[index];
            var updated = current with
            {
                Text = string.IsNullOrWhiteSpace(request.Text) ? current.Text : request.Text.Trim(),
                Title = request.Title is null ? current.Title : BlankToNull(request.Title),
                Description = request.Description is null ? current.Description : BlankToNull(request.Description),
                FolderId = request.FolderId ?? current.FolderId,
                CategoryId = request.CategoryId ?? current.CategoryId,
                TagIds = request.TagIds is null ? current.TagIds : request.TagIds.Distinct().ToArray(),
                State = request.State ?? current.State,
                IsRecurring = request.IsRecurring ?? current.IsRecurring,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _ideas[index] = updated;
            _history.Add(new HistoryEntry(Guid.NewGuid(), spaceId, ideaId, updated.CreatedByUserId, "Идея обновлена", null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow));
            return updated;
        }
    }

    public IReadOnlyCollection<Folder> GetFolders(Guid spaceId)
    {
        lock (_gate) return SpaceExists(spaceId) ? _folders.Where(folder => folder.SpaceId == spaceId).OrderBy(folder => folder.SortOrder).ToArray() : [];
    }

    public Folder? CreateFolder(Guid spaceId, CreateNamedItemRequest request)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return null;
            var now = DateTimeOffset.UtcNow;
            var folder = new Folder(Guid.NewGuid(), spaceId, request.Name.Trim(), _folders.Count(folder => folder.SpaceId == spaceId), now, now);
            _folders.Add(folder);
            return folder;
        }
    }

    public Folder? UpdateFolder(Guid spaceId, Guid folderId, UpdateNamedItemRequest request)
    {
        lock (_gate)
        {
            var index = _folders.FindIndex(folder => folder.SpaceId == spaceId && folder.Id == folderId);
            if (index < 0) return null;
            var current = _folders[index];
            var updated = current with { Name = string.IsNullOrWhiteSpace(request.Name) ? current.Name : request.Name.Trim(), UpdatedAt = DateTimeOffset.UtcNow };
            _folders[index] = updated;
            return updated;
        }
    }

    public bool RemoveFolder(Guid spaceId, Guid folderId)
    {
        lock (_gate)
        {
            foreach (var ideaIndex in _ideas.Select((idea, index) => (idea, index)).Where(pair => pair.idea.SpaceId == spaceId && pair.idea.FolderId == folderId).Select(pair => pair.index))
            {
                _ideas[ideaIndex] = _ideas[ideaIndex] with { FolderId = null, UpdatedAt = DateTimeOffset.UtcNow };
            }

            return _folders.RemoveAll(folder => folder.SpaceId == spaceId && folder.Id == folderId) > 0;
        }
    }

    public IReadOnlyCollection<Tag> GetTags(Guid spaceId)
    {
        lock (_gate) return SpaceExists(spaceId) ? _tags.Where(tag => tag.SpaceId == spaceId).OrderBy(tag => tag.Name).ToArray() : [];
    }

    public Tag? CreateTag(Guid spaceId, CreateTagRequest request)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return null;
            var tag = new Tag(Guid.NewGuid(), spaceId, request.Name.Trim(), request.Source, DateTimeOffset.UtcNow);
            _tags.Add(tag);
            return tag;
        }
    }

    public bool RemoveTag(Guid spaceId, Guid tagId)
    {
        lock (_gate)
        {
            for (var i = 0; i < _ideas.Count; i++)
            {
                var idea = _ideas[i];
                if (idea.SpaceId == spaceId && idea.TagIds.Contains(tagId))
                {
                    _ideas[i] = idea with { TagIds = idea.TagIds.Where(id => id != tagId).ToArray(), UpdatedAt = DateTimeOffset.UtcNow };
                }
            }

            return _tags.RemoveAll(tag => tag.SpaceId == spaceId && tag.Id == tagId) > 0;
        }
    }

    public IReadOnlyCollection<Category> GetCategories(Guid spaceId)
    {
        lock (_gate) return SpaceExists(spaceId) ? _categories.Where(category => category.SpaceId == spaceId).OrderBy(category => category.Name).ToArray() : [];
    }

    public Category? CreateCategory(Guid spaceId, CreateNamedItemRequest request)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return null;
            var category = new Category(Guid.NewGuid(), spaceId, request.Name.Trim(), DateTimeOffset.UtcNow);
            _categories.Add(category);
            return category;
        }
    }

    public bool RemoveCategory(Guid spaceId, Guid categoryId)
    {
        lock (_gate)
        {
            for (var i = 0; i < _ideas.Count; i++)
            {
                var idea = _ideas[i];
                if (idea.SpaceId == spaceId && idea.CategoryId == categoryId)
                {
                    _ideas[i] = idea with { CategoryId = null, UpdatedAt = DateTimeOffset.UtcNow };
                }
            }

            return _categories.RemoveAll(category => category.SpaceId == spaceId && category.Id == categoryId) > 0;
        }
    }

    public IReadOnlyCollection<ScheduledIdea> GetSchedule(Guid spaceId, DateTimeOffset? from, DateTimeOffset? to)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return [];
            var query = _scheduledIdeas.Where(item => item.SpaceId == spaceId);
            if (from is not null) query = query.Where(item => item.StartsAt >= from);
            if (to is not null) query = query.Where(item => item.StartsAt <= to);
            return query.OrderBy(item => item.StartsAt).ToArray();
        }
    }

    public ScheduledIdea? ScheduleIdea(Guid spaceId, Guid ideaId, ScheduleIdeaRequest request)
    {
        lock (_gate)
        {
            var ideaIndex = _ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
            if (ideaIndex < 0) return null;

            var now = DateTimeOffset.UtcNow;
            var scheduled = new ScheduledIdea(
                Guid.NewGuid(),
                spaceId,
                ideaId,
                request.CreatedByUserId ?? _ideas[ideaIndex].CreatedByUserId,
                request.StartsAt,
                request.EndsAt,
                (request.ParticipantUserIds ?? []).Distinct().ToArray(),
                ScheduledIdeaState.Planned,
                BlankToNull(request.Note),
                now,
                now);

            _scheduledIdeas.Add(scheduled);
            _ideas[ideaIndex] = _ideas[ideaIndex] with { State = IdeaState.Planned, UpdatedAt = now };
            _history.Add(new HistoryEntry(Guid.NewGuid(), spaceId, ideaId, scheduled.CreatedByUserId, "Идея запланирована", null, null, request.StartsAt, now, now));
            return scheduled;
        }
    }

    public ScheduledIdea? UpdateSchedule(Guid spaceId, Guid scheduledIdeaId, UpdateScheduledIdeaRequest request)
    {
        lock (_gate)
        {
            var index = _scheduledIdeas.FindIndex(item => item.SpaceId == spaceId && item.Id == scheduledIdeaId);
            if (index < 0) return null;

            var current = _scheduledIdeas[index];
            var updated = current with
            {
                StartsAt = request.StartsAt ?? current.StartsAt,
                EndsAt = request.EndsAt ?? current.EndsAt,
                ParticipantUserIds = request.ParticipantUserIds is null ? current.ParticipantUserIds : request.ParticipantUserIds.Distinct().ToArray(),
                State = request.State ?? current.State,
                Note = request.Note ?? current.Note,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _scheduledIdeas[index] = updated;

            if (updated.State is ScheduledIdeaState.Canceled or ScheduledIdeaState.Moved)
            {
                SetIdeaStateIfNoActiveSchedule(spaceId, updated.IdeaId, IdeaState.Active);
            }
            else if (updated.State is ScheduledIdeaState.Experienced)
            {
                SetIdeaState(spaceId, updated.IdeaId, IdeaState.Experienced);
            }

            return updated;
        }
    }

    public IReadOnlyCollection<HistoryEntry> GetHistory(Guid spaceId, Guid? ideaId)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return [];
            var query = _history.Where(entry => entry.SpaceId == spaceId);
            if (ideaId is not null) query = query.Where(entry => entry.IdeaId == ideaId);
            return query.OrderByDescending(entry => entry.HappenedAt).ToArray();
        }
    }

    public HistoryEntry? CreateHistoryEntry(Guid spaceId, CreateHistoryEntryRequest request)
    {
        lock (_gate)
        {
            if (!SpaceExists(spaceId)) return null;
            if (request.IdeaId is not null && !_ideas.Any(idea => idea.SpaceId == spaceId && idea.Id == request.IdeaId))
            {
                return null;
            }

            var now = DateTimeOffset.UtcNow;
            var entry = new HistoryEntry(
                Guid.NewGuid(),
                spaceId,
                request.IdeaId,
                request.CreatedByUserId ?? EnsureDemoUser().Id,
                request.Title.Trim(),
                BlankToNull(request.PublicNote),
                BlankToNull(request.PrivateNote),
                request.HappenedAt ?? now,
                now,
                now);

            _history.Add(entry);
            if (entry.IdeaId is not null)
            {
                SetIdeaState(spaceId, entry.IdeaId.Value, IdeaState.Experienced);
            }

            return entry;
        }
    }

    public HistoryEntry? UpdateHistoryEntry(Guid spaceId, Guid entryId, UpdateHistoryEntryRequest request)
    {
        lock (_gate)
        {
            var index = _history.FindIndex(entry => entry.SpaceId == spaceId && entry.Id == entryId);
            if (index < 0) return null;
            var current = _history[index];
            var updated = current with
            {
                Title = string.IsNullOrWhiteSpace(request.Title) ? current.Title : request.Title.Trim(),
                PublicNote = request.PublicNote ?? current.PublicNote,
                PrivateNote = request.PrivateNote ?? current.PrivateNote,
                HappenedAt = request.HappenedAt ?? current.HappenedAt,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _history[index] = updated;
            return updated;
        }
    }

    public IReadOnlyCollection<Comment> GetComments(Guid spaceId, Guid ideaId)
    {
        lock (_gate) return _comments.Where(comment => comment.SpaceId == spaceId && comment.IdeaId == ideaId).OrderBy(comment => comment.CreatedAt).ToArray();
    }

    public Comment? AddComment(Guid spaceId, Guid ideaId, CreateCommentRequest request)
    {
        lock (_gate)
        {
            if (!_ideas.Any(idea => idea.SpaceId == spaceId && idea.Id == ideaId)) return null;
            var now = DateTimeOffset.UtcNow;
            var comment = new Comment(Guid.NewGuid(), spaceId, ideaId, request.CreatedByUserId ?? EnsureDemoUser().Id, request.Text.Trim(), now, now);
            _comments.Add(comment);
            return comment;
        }
    }

    private User EnsureDemoUser()
    {
        var user = _users.FirstOrDefault();
        if (user is not null) return user;

        user = new User(Guid.NewGuid(), "Demo User", null, DateTimeOffset.UtcNow);
        _users.Add(user);
        return user;
    }

    private bool SpaceExists(Guid spaceId) => _spaces.Any(space => space.Id == spaceId);

    private void SetIdeaState(Guid spaceId, Guid ideaId, IdeaState state)
    {
        var index = _ideas.FindIndex(idea => idea.SpaceId == spaceId && idea.Id == ideaId);
        if (index >= 0)
        {
            _ideas[index] = _ideas[index] with { State = state, UpdatedAt = DateTimeOffset.UtcNow };
        }
    }

    private void SetIdeaStateIfNoActiveSchedule(Guid spaceId, Guid ideaId, IdeaState state)
    {
        var hasPlanned = _scheduledIdeas.Any(item => item.SpaceId == spaceId && item.IdeaId == ideaId && item.State == ScheduledIdeaState.Planned);
        if (!hasPlanned)
        {
            SetIdeaState(spaceId, ideaId, state);
        }
    }

    private static string? BlankToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
