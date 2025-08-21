const API_BASE_URL = ''; // This should ideally come from environment variables

export const fetchVdbs = async () => {
    const response = await fetch(`${API_BASE_URL}/api/vdbs`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch VDBs: ${response.status} ${response.statusText} - ${text}`);
    }
    return response.json();
};

export const translateSql = async (sql, dialect, vdb) => {
    const requestBody = {
        sql: sql,
        dialect: dialect,
        vdb: vdb
    };

    const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        let errorDetails = `Translation Request Failed: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetails = errorData.detail || errorData.message || JSON.stringify(errorData);
            if (errorDetails && !errorDetails.toLowerCase().includes(response.status.toString())) {
                errorDetails = `(${response.status}) ${errorDetails}`;
            }
        } catch (parseError) {
            try {
                const textError = await response.text();
                if (textError) errorDetails = `(${response.status}) ${textError}`;
            } catch (readError) { /* ignore */ }
        }
        throw new Error(errorDetails);
    }

    return response.json();
};

export const validateSql = async (sql, vql) => {
    const validateRequestBody = {
        sql: sql,
        vql: vql
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
             // Re-throwing with data for specific handling in component
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