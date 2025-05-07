#backend/Dockerfile
FROM python:3.12-slim

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install uv package manager
RUN pip install --no-cache-dir uv

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy dependency definition files and your submodule source code
# The submodule needs to be at /app/sqlglot-vql for the path dependency to work
COPY --chown=appuser:appgroup ./pyproject.toml ./uv.lock* ./
COPY --chown=appuser:appgroup ./sqlglot-vql ./sqlglot-vql/
# Copy the rest of your application files
COPY --chown=appuser:appgroup ./README.md ./main.py ./

# Install all project dependencies, including sqlglot-vql from the local path
# uv will read pyproject.toml, see the file:// reference, and build/install sqlglot-vql
# from the ./sqlglot-vql/ directory copied above.
RUN uv pip install --system --no-cache-dir .

# Switch to non-root user
USER appuser

EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]