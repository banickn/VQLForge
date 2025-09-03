"""
API routes for the VQL Forge agentic process.

This module provides a FastAPI endpoint for converting SQL to VQL in an
iterative, agent-like process. It uses Server-Sent Events (SSE) to stream
progress back to the client.
"""

import logging
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from src.schemas.validation import VqlValidationApiResponse
from src.schemas.agent import AgenticModeRequest, AgenticModeResponse, AgentStep
from src.schemas.validation import VqlValidateRequest
from src.services.translation_service import run_translation
from src.services.validation_service import run_validation
from src.utils.ai_analyzer import explain_vql_differences
from src.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


async def format_sse(data: dict, event: str | None = None) -> str:
    """Format a dictionary into a Server-Sent Event (SSE) message string.

    Args:
        data: The dictionary payload to send.
        event: An optional event name for the SSE message.

    Returns:
        A string formatted as a compliant SSE message.
    """
    payload = json.dumps(data)
    if event:
        return f"event: {event}\ndata: {payload}\n\n"
    return f"data: {payload}\n\n"


def format_explanation_as_markdown(explanation: str) -> str:
    """Format the AI explanation into better structured markdown.

    This function enhances a plain text explanation by attempting to structure
    it as markdown. If markdown markers like '##' or '-' are already present,
    it returns the original string to avoid double formatting.

    Args:
        explanation: The raw explanation string from the AI.

    Returns:
        A markdown-formatted explanation string.
    """
    if not explanation:
        return explanation

    # If the explanation is already well-formatted, return as-is
    if any(marker in explanation for marker in ['##', '- ', '* ', '\n- ', '\n* ']):
        return explanation

    # Otherwise, try to structure it better
    lines = explanation.split('\n')
    formatted_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            formatted_lines.append('')
            continue
        else:
            formatted_lines.append(line)

    return '\n'.join(formatted_lines)


@router.post("/forge", tags=["VQL Forge"])
async def agentic_sql_to_vql_forge_stream(request: AgenticModeRequest,) -> StreamingResponse:
    """Handle the agentic SQL-to-VQL process via a streaming response.

    This endpoint uses Server-Sent Events (SSE) to provide real-time updates
    of the agent's progress. The process involves an initial translation,
    followed by a series of validation and correction loops until the VQL is
    valid or the maximum number of attempts is reached.

    Args:
        request: The request containing the SQL query, its dialect, and the VDB.

    Returns:
        A StreamingResponse that sends SSE events to the client.
    """
    async def event_generator():
        process_log: list[AgentStep] = []

        try:
            # Step 1: Initial Translation (occurs once)
            step1 = AgentStep(step_name="Translate", details=f"Translating {request.dialect} to VQL...", success=True)
            process_log.append(step1)
            yield await format_sse(step1.model_dump(), event="step")

            translation_result = await run_translation(request.sql, request.dialect, request.vdb)

            if translation_result.error_analysis:
                step1.success = False
                category = translation_result.error_analysis.error_category or "Translation Error"
                step1.details = f"Initial SQL translation failed: {category}."
                yield await format_sse(step1.model_dump(), event="step")
                final_error_result = AgenticModeResponse(
                    final_vql=None, is_valid=False, process_log=process_log, final_message="Could not translate source SQL.",
                    error_analysis=translation_result.error_analysis
                )
                yield await format_sse(final_error_result.model_dump(), event="result")
                return

            current_vql = translation_result.vql
            step1.details = "Translation successful."
            step1.output = current_vql
            yield await format_sse(step1.model_dump(), event="step")

            # Correction Loop
            for i in range(settings.AGENTIC_MAX_LOOPS):
                loop_count = i + 1

                # Validation Step
                validation_step_name = "Validate" if i == 0 else f"Re-Validate (Step {loop_count})"
                validation_step = AgentStep(step_name=validation_step_name,
                                            details=f"Validating VQL (Step {loop_count})...", success=True)
                process_log.append(validation_step)
                yield await format_sse(validation_step.model_dump(), event="step")

                validation_request: VqlValidateRequest = VqlValidateRequest(
                    sql=request.sql, vql=current_vql, vdb=request.vdb, dialect=request.dialect)
                validation_result: VqlValidationApiResponse = await run_validation(validation_request)

                if validation_result.validated:
                    validation_step.details = "Validation successful."
                    yield await format_sse(validation_step.model_dump(), event="step")

                    # Explain Differences
                    explain_step = AgentStep(
                        step_name="Explain",
                        details="Analyzing differences between source SQL and final VQL...",
                        success=True
                    )
                    process_log.append(explain_step)
                    yield await format_sse(explain_step.model_dump(), event="step")

                    raw_explanation = await explain_vql_differences(
                        source_sql=request.sql,
                        source_dialect=request.dialect,
                        final_vql=current_vql
                    )

                    # Format the explanation with better structure
                    formatted_explanation = format_explanation_as_markdown(raw_explanation)

                    final_explanation = f"## Key Differences Between Source SQL and Final VQL\n\n{formatted_explanation}"

                    explain_step.details = final_explanation
                    yield await format_sse(explain_step.model_dump(), event="step")

                    final_success_result = AgenticModeResponse(
                        final_vql=current_vql, is_valid=True, process_log=process_log,
                        final_message="Agentic process complete. The VQL is valid."
                    )
                    yield await format_sse(final_success_result.model_dump(), event="result")
                    return  # Exit the generator on success

                # If validation fails
                error_analysis = validation_result.error_analysis
                validation_step.success = False
                category = error_analysis.error_category if error_analysis else "Unknown Error"
                validation_step.details = f"Validation failed: {category}."
                yield await format_sse(validation_step.model_dump(), event="step")

                if not error_analysis or not error_analysis.sql_suggestion:
                    final_no_suggestion_result = AgenticModeResponse(
                        final_vql=current_vql, is_valid=False, process_log=process_log,
                        final_message="Validation failed. AI provided an explanation but no automatic correction.",
                        error_analysis=error_analysis
                    )
                    yield await format_sse(final_no_suggestion_result.model_dump(), event="result")
                    return

                # Check if we are on the last loop iteration
                if loop_count >= settings.AGENTIC_MAX_LOOPS:
                    # Don't try to correct on the last iteration, just fail.
                    final_max_loops_result = AgenticModeResponse(
                        final_vql=current_vql, is_valid=False, process_log=process_log,
                        final_message=f"Agentic process failed. Reached maximum correction loops ({settings.AGENTIC_MAX_LOOPS}). The VQL is still invalid.",
                        error_analysis=error_analysis
                    )
                    yield await format_sse(final_max_loops_result.model_dump(), event="result")
                    return

                # AI Analysis & Correction Step
                analysis_step = AgentStep(
                    step_name=f"Analyze (Step {loop_count})",
                    details="AI is analyzing the error to find a correction...",
                    success=True
                )
                process_log.append(analysis_step)
                yield await format_sse(analysis_step.model_dump(), event="step")

                correction_step = AgentStep(
                    step_name=f"Correct (Step {loop_count})",
                    details="AI provided a corrected VQL.",
                    success=True,
                    output=error_analysis.sql_suggestion
                )
                process_log.append(correction_step)
                yield await format_sse(correction_step.model_dump(), event="step")

                current_vql = error_analysis.sql_suggestion

        except Exception as e:
            logger.error(f"Error during agentic stream: {e}", exc_info=True)
            error_payload = {"detail": f"An unexpected error occurred in the agentic process: {e}"}
            yield await format_sse(error_payload, event="error")

    return StreamingResponse(event_generator(), media_type="text/event-stream")
