"""Supabase client dependency for FastAPI handlers."""

from functools import lru_cache

from fastapi import Depends, HTTPException, status
from supabase import Client, create_client

from app.config import Settings, get_settings


@lru_cache
def _create_supabase_client(url: str, key: str) -> Client:
    return create_client(url, key)


def get_supabase_client(settings: Settings | None = None) -> Client:
    """Create one Supabase client for the process from runtime configuration."""
    app_settings = settings if settings is not None else get_settings()
    if not app_settings.supabase_url or not app_settings.supabase_key:
        raise RuntimeError("Supabase is not configured")

    return _create_supabase_client(app_settings.supabase_url, app_settings.supabase_key)


def require_supabase_client(
    settings: Settings = Depends(get_settings),  # noqa: B008
) -> Client:
    """FastAPI dependency that returns a configured Supabase client."""
    try:
        return get_supabase_client(settings)
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        ) from error
