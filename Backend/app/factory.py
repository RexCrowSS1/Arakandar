"""FastAPI application factory."""

import logging
from contextlib import asynccontextmanager
from threading import Lock

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app import __version__
from app.ai import LocalChatModel
from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router
from app.api.health import router as health_router
from app.api.market import router as market_router
from app.api.web import router as web_router
from app.config import Settings, get_settings
from app.conversations import ConversationStore, StorageUnavailableError
from app.market import MarketData
from app.web import WebSearch


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure the FastAPI application."""
    app_settings = settings if settings is not None else get_settings()
    chat_model = LocalChatModel(app_settings)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        if app_settings.ai_enabled:
            try:
                await run_in_threadpool(chat_model.load)
            except Exception:
                logging.getLogger(__name__).exception(
                    "Arakandar could not load. Install the inference extra and check model access."
                )
        yield

    application = FastAPI(
        title="Bandar Pasar API",
        version=__version__,
        debug=app_settings.debug,
        lifespan=lifespan,
    )
    application.state.chat_model = chat_model
    application.state.web_search = WebSearch(app_settings)
    application.state.market = MarketData(app_settings)
    application.state.conversations = ConversationStore(app_settings)
    application.state.conversation_chat_lock = Lock()
    application.state.active_conversation_id = None

    @application.exception_handler(StorageUnavailableError)
    async def storage_unavailable(request, exc):
        logging.getLogger(__name__).warning(
            "Conversation storage unavailable (%s)", type(exc).__name__
        )
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Supabase tidak dapat diakses. Data belum terkonfirmasi tersimpan; coba lagi."
                )
            },
        )

    if app_settings.cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=app_settings.cors_origins,
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    application.include_router(health_router)
    application.include_router(chat_router)
    application.include_router(web_router)
    application.include_router(conversations_router)
    application.include_router(market_router)

    return application
