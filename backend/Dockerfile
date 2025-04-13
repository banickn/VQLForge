# backend/Dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN useradd --create-home --shell /bin/bash appuser
RUN pip install --no-cache-dir uv # Install uv tool

# Copy files needed for dependency installation AND build metadata/source
# Run as root by default
COPY pyproject.toml uv.lock* README.md main.py ./
COPY sqlglot-vql /tmp/sqlglot_src 
# Copy custom sqlglot source
# If you had a src layout, copy src/ directory too:
# COPY src ./src
RUN uv pip install --system --no-cache . /tmp/sqlglot_src

# Install dependencies and the local project (.) globally using --system
# This runs as root, so it has permission to write to /usr/local/lib/...
RUN uv pip install --system --no-cache .

# Now copy the rest of the application code
# Use '--chown' to ensure the appuser owns the files it will run
COPY --chown=appuser:appuser . .

# Switch to the non-root user *before* running the application
USER appuser

EXPOSE 8000
# CMD/command specified in docker-compose.yml