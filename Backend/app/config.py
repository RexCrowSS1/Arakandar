"""Runtime configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="BANDAR_PASAR_",
        case_sensitive=False,
        extra="ignore",
    )

    debug: bool = False
    cors_origins: list[str] = Field(default_factory=list)
    supabase_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_URL", "BANDAR_PASAR_SUPABASE_URL"),
    )
    supabase_publishable_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "SUPABASE_PUBLISHABLE_KEY",
            "BANDAR_PASAR_SUPABASE_PUBLISHABLE_KEY",
        ),
    )
    supabase_secret_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_SECRET_KEY", "BANDAR_PASAR_SUPABASE_SECRET_KEY"),
    )
    supabase_jwks_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_JWKS_URL", "BANDAR_PASAR_SUPABASE_JWKS_URL"),
    )

    @property
    def supabase_key(self) -> str | None:
        """Use the server key for backend operations, with a publishable fallback."""
        return self.supabase_secret_key or self.supabase_publishable_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
