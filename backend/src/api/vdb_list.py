"""
API endpoint for retrieving the list of available Virtual Databases (VDBs).

This module reads a static configuration file to provide clients with a
list of VDBs they can use in other parts of the application.
"""

import logging
import os
from functools import lru_cache
from typing import List

import yaml
from fastapi import APIRouter, Depends, HTTPException

# Assuming these schemas are defined in the specified paths
from src.config import settings
from src.schemas.common import VDBConfigFile, VDBResponse, VDBResponseItem

logger: logging.Logger = logging.getLogger(__name__)
router: APIRouter = APIRouter()


@lru_cache(maxsize=1)
def get_vdb_config() -> VDBConfigFile:
    """Load, parse, and validate the VDB configuration from its YAML file.

    This function is designed to be used as a cached FastAPI dependency.
    The `@lru_cache(maxsize=1)` decorator ensures that the file is read from
    disk and processed only once, on the first request. All subsequent
    requests will receive the cached configuration object instantly.

    Raises:
        HTTPException: A 500 error if the config file is not found, cannot be
                       parsed, or fails Pydantic validation.

    Returns:
        A validated VDBConfigFile object.
    """
    config_path: str = settings.APP_VDB_CONF
    logger.info(f"Attempting to load VDB configuration from: {config_path}")

    if not os.path.exists(config_path):
        logger.error(f"VDB configuration file not found at: {config_path}")
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: VDB config file not found."
        )

    try:
        with open(config_path, 'r') as f:
            raw_config = yaml.safe_load(f)
            # Validate the loaded YAML against the Pydantic model
            vdb_config = VDBConfigFile.model_validate(raw_config)
            logger.info("Successfully loaded and cached VDB configuration.")
            return vdb_config
    except yaml.YAMLError as e:
        logger.error(f"Error parsing vdb_conf.yaml: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: Invalid YAML format in VDB config file."
        )
    except Exception as e:
        # This can catch Pydantic validation errors or other unexpected issues.
        logger.error(f"Unexpected error loading VDB config: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: Failed to load or validate VDB config."
        )


def transform_vdb_strings_to_response_items(
    string_list: List[str],
) -> List[VDBResponseItem]:
    """Transform a list of VDB names into a list of VDBResponseItem models.

    Args:
        string_list: A list of strings, where each string is a VDB name.

    Returns:
        A list of VDBResponseItem models, each with 'value' and 'label'
        set to the VDB name.
    """
    return [VDBResponseItem(value=item, label=item) for item in string_list]


@router.get("/vdbs", response_model=VDBResponse, tags=["VQL Forge"])
async def get_vdb_list(
    config: VDBConfigFile = Depends(get_vdb_config),
) -> VDBResponse:
    """Retrieve a list of available VDBs from the server configuration.

    This endpoint reads from a static configuration file on the server. The
    configuration is cached after the first request for high performance.

    Args:
        config: The VDB configuration, injected as a dependency.

    Returns:
        A VDBResponse object containing the list of available VDBs.
    """
    # The dependency 'get_vdb_config' handles all loading, validation, and errors.
    # The endpoint's logic is now simple, clean, and fast.
    transformed_vdbs: List[VDBResponseItem] = transform_vdb_strings_to_response_items(
        config.vdbs
    )
    return VDBResponse(results=transformed_vdbs)
