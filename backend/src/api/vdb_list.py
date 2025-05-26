import logging
from fastapi import APIRouter, HTTPException
from src.schemas.common import VDBResponse
from src.config import settings
import os
import yaml
from typing import List, Dict, Any
router = APIRouter()


def load_config_values() -> dict[list[str]]:
    logging.info(f"Loading configuration from {settings.APP_VDB_CONF}")
    with open(settings.APP_VDB_CONF, 'r') as f:
        raw_config = yaml.safe_load(f)  # Use safe_load for security
        return raw_config


def transform_values(string_list: List[str]) -> List[Dict[str, str]]:
    """Transforms a list of strings into a list of {'value': string, 'label': string}."""
    return [{"value": item, "label": item} for item in string_list]


@router.get("/vdbs", response_model=VDBResponse, tags=["VQL Forge"])
async def get_vdb_list() -> VDBResponse:
    """
    Retrieves a list of VDBs from the configuration file.
    """
    if not settings.APP_VDB_CONF:
        logging.error("No VDB CONFIG FILE")
        raise HTTPException(
            status_code=500, detail="VDB service error: config missing."
        )
    logging.info(
        f"Request received for /vdbs. Using config file: {os.path.abspath(settings.APP_VDB_CONF)}")
    config = load_config_values()  # Your config loading function

    if config['vdbs'] is None:
        logging.warning("'vdbs' list empty in configuration. Returning empty list.")
        return VDBResponse(results=[])

    try:
        return VDBResponse(results=transform_values(config['vdbs']))
    except Exception as e:
        logging.error(f"Error creating VDBResponse: {e}. Data was: {config}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing VDB list.")
