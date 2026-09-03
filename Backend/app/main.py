"""ASGI application entry point."""

from app.factory import create_app

app = create_app()

__all__ = ("app", "create_app")
