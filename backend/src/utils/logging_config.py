# src/utils/logging_config.py
import logging
import logging.config
import os
import sys

import structlog
from structlog.types import Processor

# Determine log format from environment variable, defaulting to 'console' for dev
LOG_FORMAT = os.environ.get("LOG_FORMAT", "console").lower()


def setup_logging():
    """
    Configures logging for the application.
    Uses structlog for structured logging, outputting JSON in production
    and human-readable console logs in development.
    """
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
    ]

    if LOG_FORMAT == "json":
        # Production JSON logging
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # Development console logging
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": structlog.stdlib.ProcessorFormatter,
                "processors": processors,
                "foreign_pre_chain": [structlog.stdlib.add_log_level],
            },
        },
        "handlers": {
            "default": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "loggers": {
            "": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": True,
            },
            "uvicorn.error": {
                "level": "INFO",
            },
            "uvicorn.access": {
                "handlers": [],
                "propagate": False,  # Do not propagate uvicorn access logs in this format
            },
        }
    })

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
