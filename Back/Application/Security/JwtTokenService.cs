using Back.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace Back.Application.Security;

public sealed record IssuedToken(string AccessToken, DateTimeOffset ExpiresAt);

public sealed class JwtTokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions options = options.Value;

    public IssuedToken Issue(User user)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(options.AccessTokenDays <= 0 ? 7 : options.AccessTokenDays);
        var claims = new Dictionary<string, object>
        {
            [ClaimTypes.NameIdentifier] = user.Id.ToString(),
            [ClaimTypes.Email] = user.Email ?? string.Empty,
            [ClaimTypes.Name] = user.DisplayName
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            Claims = claims,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(GetSecurityKey(options.Secret), SecurityAlgorithms.HmacSha256)
        };

        var handler = new JsonWebTokenHandler();
        return new IssuedToken(handler.CreateToken(descriptor), expiresAt);
    }

    public static SymmetricSecurityKey GetSecurityKey(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
        {
            throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes.");
        }

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }
}
