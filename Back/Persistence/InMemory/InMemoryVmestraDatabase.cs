using Back.Domain;
using Back.Persistence.Seed;

namespace Back.Persistence.InMemory;

public sealed class InMemoryVmestraDatabase
{
    public object Gate { get; } = new();
    public List<User> Users { get; } = [];
    public List<Space> Spaces { get; } = [];
    public List<SpaceMember> Members { get; } = [];
    public List<Folder> Folders { get; } = [];
    public List<Tag> Tags { get; } = [];
    public List<Category> Categories { get; } = [];
    public List<Idea> Ideas { get; } = [];
    public List<ScheduledIdea> ScheduledIdeas { get; } = [];
    public List<HistoryEntry> History { get; } = [];
    public List<Comment> Comments { get; } = [];

    public InMemoryVmestraDatabase()
    {
        var seed = SeedData.Create();
        Users.AddRange(seed.Users);
        Spaces.AddRange(seed.Spaces);
        Members.AddRange(seed.Members);
        Folders.AddRange(seed.Folders);
        Tags.AddRange(seed.Tags);
        Categories.AddRange(seed.Categories);
        Ideas.AddRange(seed.Ideas);
        History.AddRange(seed.History);
    }
}
