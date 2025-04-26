# backend/Dockerfile

# Use a lightweight official Python image
FROM python:3.12-slim

# Create a non-root user
RUN useradd --create-home --shell /bin/bash appuser
# Set working directory
WORKDIR /app

# Copy files needed for dependency installation
#COPY pyproject.toml uv.lock* README.md ./

# Install uv package manager
RUN pip install --no-cache-dir uv

# Copy custom sqlglot dependency source
COPY ./sqlglot-vql /tmp/sqlglot_src

# Copy application files using explicit relative paths
COPY --chown=appuser:appuser ./pyproject.toml ./uv.lock* ./README.md ./main.py ./
# Install project dependencies and custom dependency
RUN uv pip install --system --no-cache-dir . /tmp/sqlglot_src

RUN uv pip install --system --no-cache .
# Clean up temporary source
RUN rm -rf /tmp/sqlglot_src

# Copy application code with ownership set to appuser
COPY --chown=appuser:appuser . .

# Switch to non-root user for subsequent commands
USER appuser

# Expose the application port
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]