import logging
from fastapi import APIRouter, HTTPException
from src.schemas.common import VDBResponse, VDBConfigFile, VDBResponseItem
from src.config import settings
import os
import yaml
from typing import List, Dict, Any
router = APIRouter()

logger = logging.getLogger(__name__)


def load_vdb_config_from_file() -> VDBConfigFile:
    """
    Loads and parses the VDB configuration from the YAML file.

    Returns:
        VDBConfigFile: A Pydantic model representing the loaded configuration.

    Raises:
        HTTPException: If the file is not found, cannot be parsed, or is invalid.
    """
    config_path = settings.APP_VDB_CONF
    logger.info(f"Attempting to load VDB configuration from: {config_path}")

    if not os.path.exists(config_path):
        logger.error(f"VDB configuration file not found at: {config_path}")
        raise HTTPException(
            status_code=500,
            detail=f"Server configuration error: VDB config file not found at {config_path}"
        )
    if not os.path.isfile(config_path):
        logger.error(f"VDB configuration path is not a file: {config_path}")
        raise HTTPException(
            status_code=500,
            detail=f"Server configuration error: VDB config path is not a file at {config_path}"
        )

    try:
        with open(config_path, 'r') as f:
            raw_config = yaml.safe_load(f)
            # Validate the loaded YAML against the Pydantic model
            vdb_config = VDBConfigFile.model_validate(raw_config)
            logger.info("Successfully loaded and validated VDB configuration.")
            return vdb_config
    except yaml.YAMLError as e:
        logger.error(f"Error parsing vdb_conf.yaml: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Server configuration error: Invalid YAML format in {config_path}. Details: {e}"
        )
    except Exception as e:
        logger.error(f"Unexpected error loading VDB config: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Server configuration error: Failed to load VDB config from {config_path}. Details: {e}"
        )


def transform_vdb_strings_to_response_items(string_list: List[str]) -> List[VDBResponseItem]:
    """
    Transforms a list of VDB names (strings) into a list of VDBResponseItem models.

    Args:
        string_list: A list of strings, where each string is a VDB name.

    Returns:
        A list of VDBResponseItem models, each with 'value' and 'label' set to the VDB name.
    """
    return [VDBResponseItem(value=item, label=item) for item in string_list]


@router.get("/vdbs", response_model=VDBResponse, tags=["VQL Forge"])
async def get_vdb_list() -> VDBResponse:
    """
    Retrieves a list of VDBs from the configuration file.
    """
    try:
        # Load and validate the config using the Pydantic model
        vdb_config = load_vdb_config_from_file()

        # Transform the list of strings from the config into the desired response format
        transformed_vdbs = transform_vdb_strings_to_response_items(vdb_config.vdbs)

        return VDBResponse(results=transformed_vdbs)
    except HTTPException as http_exc:
        # Re-raise HTTPExceptions as they are already formatted for FastAPI
        raise http_exc
    except Exception as e:
        logger.error(f"Unhandled error in get_vdb_list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching VDB list.")


@router.get("/vdbs", response_model=VDBResponse, tags=["VQL Forge"])
async def get_vdb_list() -> VDBResponse:
    """
    Retrieves a list of VDBs from the configuration file.
    """
    try:
        # Load and validate the config using the Pydantic model
        vdb_config = load_vdb_config_from_file()

        # Transform the list of strings from the config into the desired response format
        transformed_vdbs = transform_vdb_strings_to_response_items(vdb_config.vdbs)

        return VDBResponse(results=transformed_vdbs)
    except HTTPException as http_exc:
        # Re-raise HTTPExceptions as they are already formatted for FastAPI
        raise http_exc
    except Exception as e:
        logger.error(f"Unhandled error in get_vdb_list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching VDB list.")
