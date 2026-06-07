using Back.Domain;
using Back.Persistence.Postgres.Entities;
using Microsoft.EntityFrameworkCore;

namespace Back.Persistence.Postgres;

public sealed class VmestraDbContext(DbContextOptions<VmestraDbContext> options) : DbContext(options)
{
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<SpaceEntity> Spaces => Set<SpaceEntity>();
    public DbSet<SpaceMemberEntity> SpaceMembers => Set<SpaceMemberEntity>();
    public DbSet<FolderEntity> Folders => Set<FolderEntity>();
    public DbSet<TagEntity> Tags => Set<TagEntity>();
    public DbSet<CategoryEntity> Categories => Set<CategoryEntity>();
    public DbSet<IdeaEntity> Ideas => Set<IdeaEntity>();
    public DbSet<IdeaTagEntity> IdeaTags => Set<IdeaTagEntity>();
    public DbSet<ScheduledIdeaEntity> ScheduledIdeas => Set<ScheduledIdeaEntity>();
    public DbSet<ScheduledIdeaParticipantEntity> ScheduledIdeaParticipants => Set<ScheduledIdeaParticipantEntity>();
    public DbSet<HistoryEntryEntity> HistoryEntries => Set<HistoryEntryEntity>();
    public DbSet<CommentEntity> Comments => Set<CommentEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        ConfigureUsers(modelBuilder);
        ConfigureSpaces(modelBuilder);
        ConfigureSpaceMembers(modelBuilder);
        ConfigureFolders(modelBuilder);
        ConfigureTags(modelBuilder);
        ConfigureCategories(modelBuilder);
        ConfigureIdeas(modelBuilder);
        ConfigureIdeaTags(modelBuilder);
        ConfigureScheduledIdeas(modelBuilder);
        ConfigureScheduledIdeaParticipants(modelBuilder);
        ConfigureHistoryEntries(modelBuilder);
        ConfigureComments(modelBuilder);
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<UserEntity>();
        entity.ToTable("users");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.DisplayName).HasColumnName("display_name").HasMaxLength(160).IsRequired();
        entity.Property(value => value.Email).HasColumnName("email").HasMaxLength(320);
        entity.Property(value => value.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(1000);
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
    }

    private static void ConfigureSpaces(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<SpaceEntity>();
        entity.ToTable("spaces");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.Kind).HasColumnName("type").HasConversion<string>().HasMaxLength(32);
        entity.Property(value => value.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        entity.Property(value => value.Description).HasColumnName("description").HasMaxLength(2000);
        entity.Property(value => value.State).HasColumnName("state").HasConversion<string>().HasMaxLength(32);
        entity.Property(value => value.CreatedByUserId).HasColumnName("created_by_user_id");
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.Property(value => value.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(value => value.CreatedByUserId);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureSpaceMembers(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<SpaceMemberEntity>();
        entity.ToTable("space_members");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.UserId).HasColumnName("user_id");
        entity.Property(value => value.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(32);
        entity.Property(value => value.PersonalSpaceName).HasColumnName("personal_space_name").HasMaxLength(200);
        entity.Property(value => value.JoinedAt).HasColumnName("joined_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => value.UserId);
        entity.HasIndex(value => new { value.SpaceId, value.UserId }).IsUnique();
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.UserId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureFolders(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<FolderEntity>();
        entity.ToTable("folders");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        entity.Property(value => value.SortOrder).HasColumnName("sort_order");
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.Property(value => value.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => new { value.SpaceId, value.Name }).IsUnique();
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureTags(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TagEntity>();
        entity.ToTable("tags");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        entity.Property(value => value.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(32);
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => new { value.SpaceId, value.Name }).IsUnique();
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureCategories(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CategoryEntity>();
        entity.ToTable("categories");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => new { value.SpaceId, value.Name }).IsUnique();
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureIdeas(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<IdeaEntity>();
        entity.ToTable("ideas");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.CreatedByUserId).HasColumnName("created_by_user_id");
        entity.Property(value => value.Text).HasColumnName("text").HasMaxLength(4000).IsRequired();
        entity.Property(value => value.Title).HasColumnName("title").HasMaxLength(300);
        entity.Property(value => value.Description).HasColumnName("description").HasMaxLength(4000);
        entity.Property(value => value.FolderId).HasColumnName("folder_id");
        entity.Property(value => value.CategoryId).HasColumnName("category_id");
        entity.Property(value => value.State).HasColumnName("state").HasConversion<string>().HasMaxLength(32);
        entity.Property(value => value.IsRecurring).HasColumnName("is_recurring");
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.Property(value => value.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => value.FolderId);
        entity.HasIndex(value => value.CategoryId);
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<FolderEntity>().WithMany().HasForeignKey(value => value.FolderId).OnDelete(DeleteBehavior.SetNull);
        entity.HasOne<CategoryEntity>().WithMany().HasForeignKey(value => value.CategoryId).OnDelete(DeleteBehavior.SetNull);
    }

    private static void ConfigureIdeaTags(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<IdeaTagEntity>();
        entity.ToTable("idea_tags");
        entity.HasKey(value => new { value.IdeaId, value.TagId });
        entity.Property(value => value.IdeaId).HasColumnName("idea_id");
        entity.Property(value => value.TagId).HasColumnName("tag_id");
        entity.HasIndex(value => value.TagId);
        entity.HasOne<IdeaEntity>().WithMany(value => value.IdeaTags).HasForeignKey(value => value.IdeaId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<TagEntity>().WithMany().HasForeignKey(value => value.TagId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureScheduledIdeas(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ScheduledIdeaEntity>();
        entity.ToTable("scheduled_ideas");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.IdeaId).HasColumnName("idea_id");
        entity.Property(value => value.CreatedByUserId).HasColumnName("created_by_user_id");
        entity.Property(value => value.StartsAt).HasColumnName("starts_at");
        entity.Property(value => value.EndsAt).HasColumnName("ends_at");
        entity.Property(value => value.State).HasColumnName("state").HasConversion<string>().HasMaxLength(32);
        entity.Property(value => value.Note).HasColumnName("note").HasMaxLength(2000);
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.Property(value => value.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => value.IdeaId);
        entity.HasIndex(value => value.StartsAt);
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<IdeaEntity>().WithMany().HasForeignKey(value => value.IdeaId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureScheduledIdeaParticipants(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ScheduledIdeaParticipantEntity>();
        entity.ToTable("scheduled_idea_participants");
        entity.HasKey(value => new { value.ScheduledIdeaId, value.UserId });
        entity.Property(value => value.ScheduledIdeaId).HasColumnName("scheduled_idea_id");
        entity.Property(value => value.UserId).HasColumnName("user_id");
        entity.HasIndex(value => value.UserId);
        entity.HasOne<ScheduledIdeaEntity>().WithMany(value => value.Participants).HasForeignKey(value => value.ScheduledIdeaId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.UserId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureHistoryEntries(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<HistoryEntryEntity>();
        entity.ToTable("history_entries");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.IdeaId).HasColumnName("idea_id");
        entity.Property(value => value.CreatedByUserId).HasColumnName("created_by_user_id");
        entity.Property(value => value.Title).HasColumnName("title").HasMaxLength(300).IsRequired();
        entity.Property(value => value.PublicNote).HasColumnName("public_note").HasMaxLength(4000);
        entity.Property(value => value.PrivateNote).HasColumnName("private_note").HasMaxLength(4000);
        entity.Property(value => value.Rating).HasColumnName("rating");
        entity.Property(value => value.HappenedAt).HasColumnName("happened_at");
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.Property(value => value.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => value.IdeaId);
        entity.HasIndex(value => value.HappenedAt);
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<IdeaEntity>().WithMany().HasForeignKey(value => value.IdeaId).OnDelete(DeleteBehavior.SetNull);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureComments(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CommentEntity>();
        entity.ToTable("comments");
        entity.HasKey(value => value.Id);
        entity.Property(value => value.Id).HasColumnName("id");
        entity.Property(value => value.SpaceId).HasColumnName("space_id");
        entity.Property(value => value.IdeaId).HasColumnName("idea_id");
        entity.Property(value => value.CreatedByUserId).HasColumnName("author_user_id");
        entity.Property(value => value.Text).HasColumnName("body").HasMaxLength(4000).IsRequired();
        entity.Property(value => value.CreatedAt).HasColumnName("created_at");
        entity.Property(value => value.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(value => value.SpaceId);
        entity.HasIndex(value => value.IdeaId);
        entity.HasOne<SpaceEntity>().WithMany().HasForeignKey(value => value.SpaceId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<IdeaEntity>().WithMany().HasForeignKey(value => value.IdeaId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<UserEntity>().WithMany().HasForeignKey(value => value.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
