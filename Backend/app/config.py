"""Runtime configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, model_validator
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
    ai_enabled: bool = True
    ai_model_id: str = "Timothyemmanuel/Arakandar"
    ai_model_revision: str = "1b7b0adc10b5da17f94e0f14af08399d0e67744d"
    ai_cache_dir: Path = BACKEND_DIR / ".cache" / "huggingface"
    ai_device: Literal["auto", "cuda", "mps", "cpu"] = "auto"
    ai_max_new_tokens: int = Field(default=256, ge=1, le=1024)
    ai_context_tokens: int = Field(default=4096, ge=1024, le=16384)
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

    @model_validator(mode="after")
    def validate_token_budget(self):
        if self.ai_context_tokens <= self.ai_max_new_tokens:
            raise ValueError("AI context tokens must exceed the response token budget")
        return self

    @property
    def supabase_key(self) -> str | None:
        """Use the server key for backend operations, with a publishable fallback."""
        return self.supabase_secret_key or self.supabase_publishable_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
