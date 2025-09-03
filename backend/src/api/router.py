from fastapi import APIRouter
from src.api import health, translate, validate, vdb_list, forge, log_recorder

api_router = APIRouter()
api_router.include_router(health.router)  # /health
api_router.include_router(translate.router)  # /translate
api_router.include_router(validate.router)  # /validate
api_router.include_router(vdb_list.router)  # /vdbs
api_router.include_router(forge.router)  # /forge
api_router.include_router(log_recorder.router)  # /log
