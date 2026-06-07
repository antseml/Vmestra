using Back.Persistence.Postgres;
using Back.Persistence.Postgres.Entities;
using Microsoft.EntityFrameworkCore;

namespace Back.Persistence.Seed;

public sealed class VmestraSeeder(VmestraDbContext db)
{
    public void SeedPostgres()
    {
        db.Database.Migrate();
        var seed = SeedData.Create();

        if (!db.Users.Any(user => user.Id == SeedData.DemoUserId))
        {
            db.Users.AddRange(seed.Users.Select(user => new UserEntity
            {
                Id = user.Id,
                DisplayName = user.DisplayName,
                Email = user.Email,
                CreatedAt = user.CreatedAt
            }));
        }

        foreach (var space in seed.Spaces.Where(space => !db.Spaces.Any(existing => existing.Id == space.Id)))
        {
            db.Spaces.Add(new SpaceEntity
            {
                Id = space.Id,
                Kind = space.Kind,
                Name = space.Name,
                State = space.State,
                CreatedByUserId = space.CreatedByUserId,
                CreatedAt = space.CreatedAt,
                UpdatedAt = space.UpdatedAt
            });
        }

        foreach (var member in seed.Members.Where(member => !db.SpaceMembers.Any(existing => existing.SpaceId == member.SpaceId && existing.UserId == member.UserId)))
        {
            db.SpaceMembers.Add(new SpaceMemberEntity
            {
                Id = member.Id,
                SpaceId = member.SpaceId,
                UserId = member.UserId,
                Role = member.Role,
                PersonalSpaceName = member.PersonalSpaceName,
                JoinedAt = member.JoinedAt
            });
        }

        foreach (var folder in seed.Folders.Where(folder => !db.Folders.Any(existing => existing.Id == folder.Id)))
        {
            db.Folders.Add(new FolderEntity
            {
                Id = folder.Id,
                SpaceId = folder.SpaceId,
                Name = folder.Name,
                SortOrder = folder.SortOrder,
                CreatedAt = folder.CreatedAt,
                UpdatedAt = folder.UpdatedAt
            });
        }

        foreach (var tag in seed.Tags.Where(tag => !db.Tags.Any(existing => existing.Id == tag.Id)))
        {
            db.Tags.Add(new TagEntity
            {
                Id = tag.Id,
                SpaceId = tag.SpaceId,
                Name = tag.Name,
                Source = tag.Source,
                CreatedAt = tag.CreatedAt
            });
        }

        foreach (var category in seed.Categories.Where(category => !db.Categories.Any(existing => existing.Id == category.Id)))
        {
            db.Categories.Add(new CategoryEntity
            {
                Id = category.Id,
                SpaceId = category.SpaceId,
                Name = category.Name,
                CreatedAt = category.CreatedAt
            });
        }

        foreach (var idea in seed.Ideas.Where(idea => !db.Ideas.Any(existing => existing.Id == idea.Id)))
        {
            db.Ideas.Add(new IdeaEntity
            {
                Id = idea.Id,
                SpaceId = idea.SpaceId,
                CreatedByUserId = idea.CreatedByUserId,
                Text = idea.Text,
                Title = idea.Title,
                Description = idea.Description,
                FolderId = idea.FolderId,
                CategoryId = idea.CategoryId,
                State = idea.State,
                IsRecurring = idea.IsRecurring,
                CreatedAt = idea.CreatedAt,
                UpdatedAt = idea.UpdatedAt,
                IdeaTags = idea.TagIds.Select(tagId => new IdeaTagEntity { IdeaId = idea.Id, TagId = tagId }).ToList()
            });
        }

        foreach (var entry in seed.History.Where(entry => !db.HistoryEntries.Any(existing => existing.Id == entry.Id)))
        {
            db.HistoryEntries.Add(new HistoryEntryEntity
            {
                Id = entry.Id,
                SpaceId = entry.SpaceId,
                IdeaId = entry.IdeaId,
                CreatedByUserId = entry.CreatedByUserId,
                Title = entry.Title,
                PublicNote = entry.PublicNote,
                PrivateNote = entry.PrivateNote,
                HappenedAt = entry.HappenedAt,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            });
        }

        db.SaveChanges();
    }
}
