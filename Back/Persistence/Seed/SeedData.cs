using Back.Domain;

namespace Back.Persistence.Seed;

public sealed record VmestraSeedSnapshot(
    IReadOnlyCollection<User> Users,
    IReadOnlyCollection<Space> Spaces,
    IReadOnlyCollection<SpaceMember> Members,
    IReadOnlyCollection<Folder> Folders,
    IReadOnlyCollection<Tag> Tags,
    IReadOnlyCollection<Category> Categories,
    IReadOnlyCollection<Idea> Ideas,
    IReadOnlyCollection<HistoryEntry> History);

public static class SeedData
{
    public static readonly Guid DemoUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid PersonalSpaceId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid GroupSpaceId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid InboxFolderId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    public static readonly Guid FoodTagId = Guid.Parse("55555555-5555-5555-5555-555555555555");
    public static readonly Guid LeisureCategoryId = Guid.Parse("66666666-6666-6666-6666-666666666666");
    public static readonly Guid BreakfastIdeaId = Guid.Parse("77777777-7777-7777-7777-777777777777");

    public static VmestraSeedSnapshot Create()
    {
        var now = DateTimeOffset.UtcNow;
        var user = new User(DemoUserId, "Demo User", "demo@vmestra.local", null, now, now);
        var personalSpace = new Space(PersonalSpaceId, SpaceKind.Personal, "Личное пространство", SpaceState.Active, user.Id, now, now);
        var groupSpace = new Space(GroupSpaceId, SpaceKind.Group, "Идеи на выходные", SpaceState.Active, user.Id, now, now);
        var inboxFolder = new Folder(InboxFolderId, personalSpace.Id, "Входящие", 0, now, now);
        var foodTag = new Tag(FoodTagId, personalSpace.Id, "еда", TagSource.User, now);
        var leisureCategory = new Category(LeisureCategoryId, personalSpace.Id, "Досуг", now);
        var idea = new Idea(BreakfastIdeaId, personalSpace.Id, user.Id, "Попробовать новое место для завтрака", null, null, inboxFolder.Id, leisureCategory.Id, [foodTag.Id], IdeaState.Inbox, false, now, now);

        return new VmestraSeedSnapshot(
            [user],
            [personalSpace, groupSpace],
            [
                new SpaceMember(Guid.NewGuid(), personalSpace.Id, user.Id, SpaceMemberRole.Admin, null, now),
                new SpaceMember(Guid.NewGuid(), groupSpace.Id, user.Id, SpaceMemberRole.Admin, "Наши выходные", now)
            ],
            [inboxFolder],
            [foodTag],
            [leisureCategory],
            [idea],
            [new HistoryEntry(Guid.NewGuid(), personalSpace.Id, idea.Id, user.Id, "Идея добавлена", null, null, now, now, now)]);
    }
}
