import logging
import sqlalchemy as db
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from sqlalchemy.engine import Engine  # For type hinting

from src.config import settings  # Import the settings

logger = logging.getLogger(__name__)
engine: Engine | None = None


def init_db_engine() -> Engine | None:
    global engine
    if settings.DATABASE_URL is None:
        logger.fatal("DATABASE_URL is not configured.")
        return None
    try:
        engine = db.create_engine(settings.DATABASE_URL)
        with engine.connect() as connection:
            logger.info("Successfully connected to Denodo.")
        return engine
    except ImportError as e:
        logger.fatal(f"Could not import Denodo driver. Make sure it's installed. ImportError: {e}")
        engine = None
        return None
    except SQLAlchemyError as e:
        logger.fatal(f"Could not connect to Denodo database: {e}")
        engine = None
        return None


# Initialize the engine when this module is imported
# You might want to delay this if you have conditional DB usage
engine = init_db_engine()


def get_engine() -> Engine:
    if engine is None:
        # This situation should ideally be handled at app startup
        raise ConnectionError("Database engine is not initialized.")
    return engine
