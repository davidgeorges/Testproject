FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src
COPY . .
RUN dotnet restore SubscriptionApp.sln --locked-mode \
    && dotnet publish backend/SubscriptionApp.Api/SubscriptionApp.Api.csproj -c Release --no-restore -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app
RUN apk add --no-cache icu-libs
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    DOTNET_EnableDiagnostics=0
COPY --from=build /app .
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "SubscriptionApp.Api.dll"]
