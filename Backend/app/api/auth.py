"""Account endpoints. Browser cookies are managed by the Next.js server."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.auth import bearer_token, require_user
from app.conversations import ADMIN_EMAIL

router = APIRouter(prefix="/auth", tags=["auth"])
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, to_lower=True, max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    ),
]


class SignIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class SignUp(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    email: Email
    password: str = Field(min_length=8, max_length=128)


class Refresh(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: str = Field(min_length=1, max_length=4096)


@router.post("/sign-in")
def sign_in(payload: SignIn, request: Request):
    email = payload.email.strip().lower()
    auth = request.app.state.auth
    return auth.session(
        auth.call(
            "POST",
            "token?grant_type=password",
            payload={
                "email": ADMIN_EMAIL if email == "admin" else email,
                "password": payload.password,
            },
        )
    )


@router.post("/sign-up", status_code=201)
def sign_up(payload: SignUp, request: Request):
    if payload.email == ADMIN_EMAIL:
        raise HTTPException(400, "This email address is not available for sign-up.")
    auth = request.app.state.auth
    return auth.session(
        auth.call(
            "POST",
            "signup",
            payload={
                "email": payload.email,
                "password": payload.password,
                "data": {"name": payload.name},
            },
        )
    )


@router.post("/refresh")
def refresh(payload: Refresh, request: Request):
    auth = request.app.state.auth
    return auth.session(
        auth.call(
            "POST",
            "token?grant_type=refresh_token",
            payload={
                "refresh_token": payload.refresh_token,
            },
        )
    )


@router.get("/me")
def me(user: dict = Depends(require_user)):  # noqa: B008
    return {"user": user}


@router.post("/sign-out")
def sign_out(request: Request):
    request.app.state.auth.call("POST", "logout?scope=local", token=bearer_token(request))
    return {"ok": True}
