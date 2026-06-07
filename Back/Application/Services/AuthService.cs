using Back.Api;
using Back.Application.Abstractions;
using Back.Application.Common;
using Back.Application.Mapping;
using Back.Application.Security;
using System.Net.Mail;

namespace Back.Application.Services;

public sealed class AuthService(IUserRepository users, ISpaceRepository spaces, PasswordHasher passwordHasher, JwtTokenService tokens)
{
    public AppResult<AuthResponse> Register(RegisterRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (email is null) return AppResult<AuthResponse>.Validation("Valid email is required.");
        if (string.IsNullOrWhiteSpace(request.DisplayName)) return AppResult<AuthResponse>.Validation("Display name is required.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8) return AppResult<AuthResponse>.Validation("Password must be at least 8 characters.");
        if (users.GetUserByEmail(email) is not null) return AppResult<AuthResponse>.Conflict("User with this email already exists.");

        var user = users.CreateUser(email, request.DisplayName.Trim(), passwordHasher.Hash(request.Password));
        spaces.EnsurePersonalSpace(user.Id);
        var token = tokens.Issue(user);
        return AppResult<AuthResponse>.Ok(new AuthResponse(token.AccessToken, token.ExpiresAt, user.ToCurrentUserResponse()));
    }

    public AppResult<AuthResponse> Login(LoginRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (email is null) return AppResult<AuthResponse>.Validation("Valid email is required.");
        if (string.IsNullOrWhiteSpace(request.Password)) return AppResult<AuthResponse>.Validation("Password is required.");

        var user = users.GetUserByEmail(email);
        if (user is null) return AppResult<AuthResponse>.NotFound("User not found.");
        if (user.PasswordHash is null || !passwordHasher.Verify(request.Password, user.PasswordHash)) return AppResult<AuthResponse>.Unauthorized("Invalid password.");

        var token = tokens.Issue(user);
        return AppResult<AuthResponse>.Ok(new AuthResponse(token.AccessToken, token.ExpiresAt, user.ToCurrentUserResponse()));
    }

    public AppResult<CurrentUserResponse> GetCurrentUser(Guid userId) => users.GetUser(userId) is { } user && user.Email is not null
        ? AppResult<CurrentUserResponse>.Ok(user.ToCurrentUserResponse())
        : AppResult<CurrentUserResponse>.Unauthorized();

    private static string? NormalizeEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var normalized = email.Trim().ToLowerInvariant();
        try
        {
            var address = new MailAddress(normalized);
            return string.Equals(address.Address, normalized, StringComparison.OrdinalIgnoreCase) ? normalized : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
