namespace Back.Application.Security;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "Vmestra.Back";
    public string Audience { get; set; } = "Vmestra.Front";
    public string Secret { get; set; } = string.Empty;
    public int AccessTokenDays { get; set; } = 7;
}
