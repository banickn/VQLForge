#backend/Dockerfile
FROM python:3.12-slim as builder

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1


# Install git first for cloning
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

ARG SQLGLOT_VQL_REPO_URL="https://github.com/banickn/sqlglot.git"
ARG SQLGLOT_VQL_BRANCH="main" 

WORKDIR /app_source
# Clone the sqlglot submodule
RUN git clone --depth 1 --branch ${SQLGLOT_VQL_BRANCH} ${SQLGLOT_VQL_REPO_URL} ./sqlglot-vql \
    && rm -rf ./sqlglot-vql/.git 
    # Remove .git folder to keep image smaller and clean

# Copy other application files needed for build
# These COPY instructions assume they are relative to the context of the Dockerfile (backend/)
COPY ./pyproject.toml ./uv.lock* ./
COPY ./README.md ./
COPY ./src ./src/

# -------------------
# --- Final image ---

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Install uv package manager
RUN pip install --no-cache-dir uv

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy dependency definition files and your submodule source code
# The submodule needs to be at /app/sqlglot-vql for the path dependency to work
# Copy from the builder stage
COPY --from=builder --chown=appuser:appgroup /app_source/pyproject.toml /app_source/uv.lock* ./
COPY --from=builder --chown=appuser:appgroup /app_source/README.md ./
COPY --from=builder --chown=appuser:appgroup /app_source/sqlglot-vql ./sqlglot-vql/
COPY --from=builder --chown=appuser:appgroup /app_source/src ./src/

# Install all project dependencies, including sqlglot-vql from the local path
# uv will read pyproject.toml, see the file:// reference, and build/install sqlglot-vql
# from the ./sqlglot-vql/ directory copied above.
RUN uv pip install --system --no-cache-dir .

# Switch to non-root user
USER appuser

EXPOSE 5000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000"]