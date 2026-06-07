using System.Security.Claims;

namespace Back.Api;

public sealed class CurrentUserAccessor
{
    public Guid? GetUserId(ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var userId) ? userId : null;
    }
}
