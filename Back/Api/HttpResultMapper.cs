using Back.Application.Common;

namespace Back.Api;

public static class HttpResultMapper
{
    public static IResult ToHttpResult<T>(this AppResult<T> result)
    {
        if (result.IsSuccess)
        {
            return Results.Ok(result.Value);
        }

        return result.Error.Type switch
        {
            AppErrorType.Validation => Results.BadRequest(new ErrorResponse(result.Error.Message)),
            AppErrorType.NotFound => Results.NotFound(new ErrorResponse(result.Error.Message)),
            AppErrorType.Conflict => Results.Conflict(new ErrorResponse(result.Error.Message)),
            AppErrorType.Unauthorized => Results.Json(new ErrorResponse(result.Error.Message), statusCode: StatusCodes.Status401Unauthorized),
            AppErrorType.Forbidden => Results.Forbid(),
            _ => Results.Problem(result.Error.Message)
        };
    }

    public static IResult ToCreatedHttpResult<T>(this AppResult<T> result, Func<T, string> location)
    {
        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Created(location(result.Value), result.Value);
        }

        return result.ToHttpResult();
    }

    public static IResult ToNoContentResult(this AppResult<bool> result)
    {
        if (result.IsSuccess)
        {
            return Results.NoContent();
        }

        return result.ToHttpResult();
    }
}

public sealed record ErrorResponse(string Message);
