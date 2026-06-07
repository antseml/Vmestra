namespace Back.Application.Common;

public enum AppErrorType
{
    None,
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden
}

public sealed record AppError(AppErrorType Type, string Message)
{
    public static readonly AppError None = new(AppErrorType.None, string.Empty);
}

public sealed record AppResult<T>(T? Value, AppError Error)
{
    public bool IsSuccess => Error.Type == AppErrorType.None;

    public static AppResult<T> Ok(T value) => new(value, AppError.None);

    public static AppResult<T> Validation(string message) => new(default, new AppError(AppErrorType.Validation, message));

    public static AppResult<T> NotFound(string message = "Resource not found.") => new(default, new AppError(AppErrorType.NotFound, message));

    public static AppResult<T> Conflict(string message) => new(default, new AppError(AppErrorType.Conflict, message));

    public static AppResult<T> Unauthorized(string message = "Unauthorized.") => new(default, new AppError(AppErrorType.Unauthorized, message));

    public static AppResult<T> Forbidden(string message = "Forbidden.") => new(default, new AppError(AppErrorType.Forbidden, message));
}
