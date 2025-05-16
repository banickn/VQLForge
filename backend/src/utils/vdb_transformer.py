import logging
from sqlglot import exp

logger = logging.getLogger(__name__)


def transform_vdb_table_qualification(node: exp.Expression, vdb_name: str) -> exp.Expression:
    """
    Recursively prefixes unqualified tables in a SQL expression with a VDB name.
    """
    if isinstance(node, exp.Table):
        is_qualified = bool(
            node.db or node.catalog or node.args.get("db") or node.args.get("catalog")
        )
        if not is_qualified and isinstance(node.this, exp.Identifier):
            logger.debug(f"Transforming table: {node.sql()} -> Adding db: {vdb_name}")
            new_node = node.copy()
            new_node.set("db", exp.Identifier(this=vdb_name, quoted=False))
            return new_node
    return node
