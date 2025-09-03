const API_BASE_URL = ''; // This should ideally come from environment variables

export const fetchVdbs = async () => {
    const response = await fetch(`${API_BASE_URL}/api/vdbs`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch VDBs: ${response.status} ${response.statusText} - ${text}`);
    }
    return response.json();
};

export const translateSql = async (requestBody) => {
    const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        let errorDetails = `Translation Request Failed: ${response.status}`;
        try {
            const errorData = await response.json();
            // Prioritize FastAPI's 'detail' field, which is common for errors
            errorDetails = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch (parseError) {
            // Fallback if the error response isn't valid JSON
            try {
                const textError = await response.text();
                if (textError) errorDetails = textError;
            } catch (readError) {
                errorDetails = response.statusText; // Last resort
            }
        }
        // Always throw an Error object with a clear, readable string message
        throw new Error(`(${response.status}) ${errorDetails}`);
    }

    return response.json();
};

export const validateSql = async (sql, vql, vdb, dialect) => {
    const validateRequestBody = {
        sql: sql,
        vql: vql,
        vdb: vdb,
        dialect: dialect
    };

    const validateResponse = await fetch(`${API_BASE_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(validateRequestBody)
    });

    let validationData;
    try {
        validationData = await validateResponse.json();
    } catch (jsonError) {
        const textError = await validateResponse.text();
        throw new Error(`(${validateResponse.status}) Server returned non-JSON response: ${textError || validateResponse.statusText}`);
    }

    if (!validateResponse.ok) {
        if (validationData?.error_analysis) {
            const error = new Error("Validation failed with AI analysis");
            error.data = validationData.error_analysis;
            error.status = 'error_ai';
            throw error;
        } else {
            const errorMessage = validationData?.message || validationData?.detail || `Validation Request Failed: ${validateResponse.status}`;
            throw new Error(errorMessage);
        }
    } else {
        return validationData;
    }
};

export const forgeSql = async (requestBody, { onMessage, onError, onClose }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/forge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        if (!response.body) {
            throw new Error("Response body is missing");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!part) continue;

                let event = 'message'; // Default event type
                let data = '';

                const eventMatch = part.match(/^event: (.*)$/m);
                if (eventMatch) {
                    event = eventMatch[1];
                }

                const dataMatch = part.match(/^data: (.*)$/m);
                if (dataMatch) {
                    data = dataMatch[1];
                }

                try {
                    const parsedData = JSON.parse(data);
                    onMessage({ event, data: parsedData });
                } catch (e) {
                    console.error("Failed to parse SSE data:", data, e);
                    onError(new Error("Failed to parse incoming data stream."));
                }
            }
            buffer = parts[parts.length - 1];
        }

    } catch (err) {
        console.error("Error during agentic forge stream:", err);
        onError(err);
    } finally {
        onClose();
    }
};

export const logAcceptedQuery = async (logData) => {
    const response = await fetch(`${API_BASE_URL}/api/log/accepted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(logData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to log accepted query: ${errorText}`);
    }

    return response.json();
};