"""Search can be checked independently of the local model's readiness."""

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from app.web import WebSearchResult

router = APIRouter(prefix="/web", tags=["web"])


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    query: str = Field(min_length=1, max_length=400)


@router.post("/search", response_model=WebSearchResult)
def search(payload: SearchRequest, request: Request) -> WebSearchResult:
    return request.app.state.web_search.search(payload.query)
