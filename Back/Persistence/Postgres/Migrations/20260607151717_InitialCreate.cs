using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Back.Persistence.Postgres.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "users",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    avatar_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "spaces",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    state = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_spaces", x => x.id);
                    table.ForeignKey(
                        name: "FK_spaces_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_categories_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "folders",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_folders", x => x.id);
                    table.ForeignKey(
                        name: "FK_folders_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "space_members",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    personal_space_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    joined_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_space_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_space_members_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_space_members_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.id);
                    table.ForeignKey(
                        name: "FK_tags_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ideas",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    folder_id = table.Column<Guid>(type: "uuid", nullable: true),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    state = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    is_recurring = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ideas", x => x.id);
                    table.ForeignKey(
                        name: "FK_ideas_categories_category_id",
                        column: x => x.category_id,
                        principalSchema: "public",
                        principalTable: "categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ideas_folders_folder_id",
                        column: x => x.folder_id,
                        principalSchema: "public",
                        principalTable: "folders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ideas_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ideas_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "comments",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idea_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_comments", x => x.id);
                    table.ForeignKey(
                        name: "FK_comments_ideas_idea_id",
                        column: x => x.idea_id,
                        principalSchema: "public",
                        principalTable: "ideas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_comments_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_comments_users_author_user_id",
                        column: x => x.author_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "history_entries",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idea_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    public_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    private_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    rating = table.Column<int>(type: "integer", nullable: true),
                    happened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_history_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_history_entries_ideas_idea_id",
                        column: x => x.idea_id,
                        principalSchema: "public",
                        principalTable: "ideas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_history_entries_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_history_entries_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "idea_tags",
                schema: "public",
                columns: table => new
                {
                    idea_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idea_tags", x => new { x.idea_id, x.tag_id });
                    table.ForeignKey(
                        name: "FK_idea_tags_ideas_idea_id",
                        column: x => x.idea_id,
                        principalSchema: "public",
                        principalTable: "ideas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_idea_tags_tags_tag_id",
                        column: x => x.tag_id,
                        principalSchema: "public",
                        principalTable: "tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scheduled_ideas",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idea_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    starts_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ends_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    state = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_ideas", x => x.id);
                    table.ForeignKey(
                        name: "FK_scheduled_ideas_ideas_idea_id",
                        column: x => x.idea_id,
                        principalSchema: "public",
                        principalTable: "ideas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_scheduled_ideas_spaces_space_id",
                        column: x => x.space_id,
                        principalSchema: "public",
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_scheduled_ideas_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "scheduled_idea_participants",
                schema: "public",
                columns: table => new
                {
                    scheduled_idea_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_idea_participants", x => new { x.scheduled_idea_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_scheduled_idea_participants_scheduled_ideas_scheduled_idea_~",
                        column: x => x.scheduled_idea_id,
                        principalSchema: "public",
                        principalTable: "scheduled_ideas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_scheduled_idea_participants_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_space_id",
                schema: "public",
                table: "categories",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_categories_space_id_name",
                schema: "public",
                table: "categories",
                columns: new[] { "space_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_comments_author_user_id",
                schema: "public",
                table: "comments",
                column: "author_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_comments_idea_id",
                schema: "public",
                table: "comments",
                column: "idea_id");

            migrationBuilder.CreateIndex(
                name: "IX_comments_space_id",
                schema: "public",
                table: "comments",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_folders_space_id",
                schema: "public",
                table: "folders",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_folders_space_id_name",
                schema: "public",
                table: "folders",
                columns: new[] { "space_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_history_entries_created_by_user_id",
                schema: "public",
                table: "history_entries",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_history_entries_happened_at",
                schema: "public",
                table: "history_entries",
                column: "happened_at");

            migrationBuilder.CreateIndex(
                name: "IX_history_entries_idea_id",
                schema: "public",
                table: "history_entries",
                column: "idea_id");

            migrationBuilder.CreateIndex(
                name: "IX_history_entries_space_id",
                schema: "public",
                table: "history_entries",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_idea_tags_tag_id",
                schema: "public",
                table: "idea_tags",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_ideas_category_id",
                schema: "public",
                table: "ideas",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_ideas_created_by_user_id",
                schema: "public",
                table: "ideas",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_ideas_folder_id",
                schema: "public",
                table: "ideas",
                column: "folder_id");

            migrationBuilder.CreateIndex(
                name: "IX_ideas_space_id",
                schema: "public",
                table: "ideas",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_idea_participants_user_id",
                schema: "public",
                table: "scheduled_idea_participants",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_ideas_created_by_user_id",
                schema: "public",
                table: "scheduled_ideas",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_ideas_idea_id",
                schema: "public",
                table: "scheduled_ideas",
                column: "idea_id");

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_ideas_space_id",
                schema: "public",
                table: "scheduled_ideas",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_ideas_starts_at",
                schema: "public",
                table: "scheduled_ideas",
                column: "starts_at");

            migrationBuilder.CreateIndex(
                name: "IX_space_members_space_id",
                schema: "public",
                table: "space_members",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_space_members_space_id_user_id",
                schema: "public",
                table: "space_members",
                columns: new[] { "space_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_space_members_user_id",
                schema: "public",
                table: "space_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_spaces_created_by_user_id",
                schema: "public",
                table: "spaces",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_tags_space_id",
                schema: "public",
                table: "tags",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "IX_tags_space_id_name",
                schema: "public",
                table: "tags",
                columns: new[] { "space_id", "name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "comments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "history_entries",
                schema: "public");

            migrationBuilder.DropTable(
                name: "idea_tags",
                schema: "public");

            migrationBuilder.DropTable(
                name: "scheduled_idea_participants",
                schema: "public");

            migrationBuilder.DropTable(
                name: "space_members",
                schema: "public");

            migrationBuilder.DropTable(
                name: "tags",
                schema: "public");

            migrationBuilder.DropTable(
                name: "scheduled_ideas",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ideas",
                schema: "public");

            migrationBuilder.DropTable(
                name: "categories",
                schema: "public");

            migrationBuilder.DropTable(
                name: "folders",
                schema: "public");

            migrationBuilder.DropTable(
                name: "spaces",
                schema: "public");

            migrationBuilder.DropTable(
                name: "users",
                schema: "public");
        }
    }
}
