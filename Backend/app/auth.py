"""Supabase Auth with request-scoped identities; no shared SDK auth session."""

import httpx
from fastapi import HTTPException, Request

from app.config import Settings
from app.conversations import ADMIN_EMAIL, StorageUnavailableError
from app.supabase import get_supabase_client


class AuthService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def call(self, method: str, path: str, *, payload=None, token=None, admin=False):
        key = (
            self.settings.supabase_secret_key
            if admin
            else self.settings.supabase_publishable_key or self.settings.supabase_secret_key
        )
        if not self.settings.supabase_url or not key:
            raise HTTPException(503, "The account service is not configured.")
        headers = {"apikey": key}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            response = httpx.request(
                method,
                f"{self.settings.supabase_url.rstrip('/')}/auth/v1/{path}",
                headers=headers,
                json=payload,
                timeout=15,
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                503, "Could not reach the account service. Please try again."
            ) from exc
        if response.is_error:
            try:
                code = response.json().get("error_code", "")
            except ValueError:
                code = ""
            if response.status_code == 429:
                raise HTTPException(429, "Too many attempts. Please wait a moment and try again.")
            if response.status_code >= 500:
                raise HTTPException(
                    503, "The account service is temporarily unavailable. Please try again."
                )
            if code == "email_not_confirmed":
                raise HTTPException(403, "Please verify your email before signing in.")
            if path.startswith("signup"):
                raise HTTPException(
                    400, "Sign-up failed. Check your email and password, or try signing in."
                )
            raise HTTPException(401, "Incorrect email or password, or your session has expired.")
        return response.json() if response.content else {}

    def profile(self, auth_user: dict) -> dict:
        if not auth_user.get("email") or not auth_user.get("email_confirmed_at"):
            raise HTTPException(403, "Please verify your email before signing in.")
        if not self.settings.supabase_secret_key:
            raise HTTPException(503, "Account storage is not configured.")
        email = auth_user["email"].lower()
        role = "admin" if auth_user.get("app_metadata", {}).get("role") == "admin" else "user"
        try:
            client = get_supabase_client(self.settings)
            # Preserve the original Admin's conversation ownership during migration.
            query = client.table("users").select("id,name,email")
            query = (
                query.eq("email", ADMIN_EMAIL)
                if email == ADMIN_EMAIL and role == "admin"
                else query.eq("id", auth_user["id"])
            )
            rows = query.limit(1).execute().data
            if not rows:
                name = str(auth_user.get("user_metadata", {}).get("name") or email.split("@")[0])
                rows = (
                    client.table("users")
                    .upsert(
                        {"id": auth_user["id"], "email": email, "name": name[:100]},
                        on_conflict="id",
                    )
                    .execute()
                    .data
                )
            return {**rows[0], "role": role}
        except Exception as exc:
            raise StorageUnavailableError from exc

    def session(self, data: dict) -> dict:
        if not data.get("access_token"):
            return {"requires_confirmation": True}
        return {
            "user": self.profile(data["user"]),
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_in": data["expires_in"],
        }


def bearer_token(request: Request) -> str:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Please sign in to continue.")
    return token


def require_user(request: Request) -> dict:
    auth = request.app.state.auth
    return auth.profile(auth.call("GET", "user", token=bearer_token(request)))
