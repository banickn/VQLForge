from fastapi import APIRouter
from src.api import health, translate, validate

api_router = APIRouter()
api_router.include_router(health.router)  # /health
api_router.include_router(translate.router)  # /translate
api_router.include_router(validate.router)  # /validate
