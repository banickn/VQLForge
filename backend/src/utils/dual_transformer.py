import logging
from sqlglot import exp, parse_one

logger = logging.getLogger(__name__)


def transform_dual_function(node: exp.Expression) -> exp.Expression:
    """
    Recursively prefixes transforms Oracle dual to Denodo dual().
    """
    if isinstance(node, exp.Table) and node.name == "dual":
        logger.info(f"Transforming table: {node.sql()}")

        return parse_one("dual()")
    return node
