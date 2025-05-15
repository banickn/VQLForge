// --- At the top of App.js ---
import React, { useState, useCallback } from 'react';
// ... other MUI imports
import {
    CssBaseline, AppBar, Toolbar, Typography, Container, Box,
    Button, CircularProgress, Card, CardContent, CardHeader, Alert, // Keep Alert for simple errors
    AlertTitle, IconButton, Stack, useTheme, Autocomplete, TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; // Keep for simple alerts
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
// import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Not used currently
import { purple, blueGrey } from '@mui/material/colors';

// --- Import the new component ---
import AiErrorAnalysis from './AiErrorAnalysis';
import AiValidationErrorAnalysis from './AiValidationErrorAnalysis';

// --- Configuration ---
const availableDialects = [{ value: 'athena', label: 'Athena' }, { value: 'bigquery', label: 'BigQuery' }, { value: 'clickhouse', label: 'ClickHouse' }, { value: 'databricks', label: 'Databricks' }, { value: 'doris', label: 'Doris' }, { value: 'drill', label: 'Drill' }, { value: 'druid', label: 'Druid' }, { value: 'duckdb', label: 'DuckDB' }, { value: 'dune', label: 'Dune' }, { value: 'hive', label: 'Hive' }, { value: 'materialize', label: 'Materialize' }, { value: 'mysql', label: 'MySQL' }, { value: 'oracle', label: 'Oracle' }, { value: 'postgres', label: 'PostgreSQL' }, { value: 'presto', label: 'Presto' }, { value: 'prql', label: 'PRQL' }, { value: 'redshift', label: 'Redshift' }, { value: 'risingwave', label: 'RisingWave' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'spark', label: 'Spark SQL' }, { value: 'spark2', label: 'Spark SQL 2' }, { value: 'sqlite', label: 'SQLite' }, { value: 'starrocks', label: 'StarRocks' }, { value: 'tableau', label: 'Tableau' }, { value: 'teradata', label: 'Teradata' }, { value: 'trino', label: 'Trino' }];
const editorExtensions = [sql()];

// --- Placeholder VDB Options ---
const availableVDBs = [
    { value: 'vdb_placeholder_1', label: 'VDB Option 1' },
    { value: 'vdb_placeholder_2', label: 'VDB Option 2' },
    { value: 'vdb_placeholder_3', label: 'VDB Option 3' },
];

function App() {
    const theme = useTheme();
    const API_BASE_URL = '';
    const [sourceDialect, setSourceDialect] = useState(availableDialects[0]);
    const [selectedVDB, setSelectedVDB] = useState(availableVDBs[0]);
    const [sourceSql, setSourceSql] = useState('SELECT\n    c.customer_id,\n    c.name,\n    COUNT(o.order_id) AS total_orders\nFROM\n    customers c\nLEFT JOIN\n    orders o ON c.customer_id = o.customer_id\nWHERE\n    c.signup_date >= \'2023-01-01\'\nGROUP BY\n    c.customer_id, c.name\nHAVING\n    COUNT(o.order_id) > 5\nORDER BY\n    total_orders DESC\nLIMIT 10;');
    const [targetSql, setTargetSql] = useState('-- Target SQL will appear here after conversion...');
    const [isLoading, setIsLoading] = useState(false);
    // --- Modified Error State ---
    // Can hold a string for simple errors or the { explanation, sql_suggestion } object for AI analysis
    const [error, setError] = useState(null); // Initialize to null or empty string
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const initialTargetSqlPlaceholder = '-- Target SQL will appear here after conversion...';

    const clearValidationState = () => { setValidationResult(null); };
    const clearErrorState = () => { setError(null); }; // Helper to clear error

    const onSourceChange = useCallback((value) => {
        setSourceSql(value);
        clearErrorState(); // Clear error on source change
        clearValidationState();
    }, []);

    const handleDialectChange = (event, newValue) => {
        setSourceDialect(newValue);
        clearErrorState();
        clearValidationState();
    };

    const handleVDBChange = (event, newValue) => {
        setSelectedVDB(newValue);
        clearErrorState();
        clearValidationState();
        setTargetSql(initialTargetSqlPlaceholder);
    };

    // --- Handler Functions for AiErrorAnalysis ---
    const handleApplySuggestion = (suggestedSql) => {
        setSourceSql(suggestedSql); // Update the source editor
        setError(null); // Clear the error notification
        setTargetSql(initialTargetSqlPlaceholder); // Optionally reset target
        clearValidationState(); // Clear any previous validation
    };
    const handleUseVqlSuggestion = (suggestedVql) => {
        setTargetSql(suggestedVql); // Update the target VQL editor
        clearValidationState();     // Clear the validation error/analysis message
    };
    const handleDismissError = () => {
        setError(null); // Simply clear the error notification
    };
    // --- End Handler Functions ---

    const handleConvert = async () => {
        setIsLoading(true);
        clearErrorState(); // Clear previous errors explicitly
        clearValidationState();

        if (!sourceDialect || !selectedVDB) {
            setError("Source Dialect and VDB must be selected."); // Set simple string error
            setIsLoading(false);
            return;
        }
        const requestBody = {
            sql: sourceSql,
            dialect: sourceDialect.value,
            vdb: selectedVDB.value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/translate`, { // Ensure /api prefix if needed
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorDetails = `Translation Request Failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.detail || errorData.message || JSON.stringify(errorData);
                    if (!errorDetails.toLowerCase().includes(response.status.toString())) {
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

            const data = await response.json(); // Assuming backend sends TranslateApiResponse structure

            if (data && typeof data.vql === 'string') {
                console.log("Translation successful.");
                setTargetSql(data.vql);
                // Ensure error is explicitly cleared on success
                clearErrorState();

            } else if (data && data.error_analysis && typeof data.error_analysis.explanation === 'string') {
                console.log("Translation failed, received AI analysis.");
                // --- Set error state with the object ---
                setError(data.error_analysis);
                setTargetSql(initialTargetSqlPlaceholder);

            } else if (data && typeof data.message === 'string') {
                console.log("Received general message:", data.message);
                setError(`Translation Info: ${data.message}`); // Set simple string error
                setTargetSql(initialTargetSqlPlaceholder);

            } else {
                console.error("Unexpected success data format:", data);
                throw new Error("Received unexpected success data format from the translation endpoint.");
            }

        } catch (err) {
            console.error("Conversion process failed:", err);
            setError(err.message || 'Unknown conversion error.'); // Set simple string error
            setTargetSql('-- Conversion Error --');
        } finally {
            setIsLoading(false);
        }
    };

    // --- handleValidateQuery (Ensure it checks for object-type errors) ---
    const handleValidateQuery = async () => {
        // Prevent validation if a translation AI error is showing
        if (error && typeof error === 'object' && error !== null && error.explanation) {
            console.log("Validation skipped: Translation analysis error is currently displayed.");
            setValidationResult({ status: 'info', message: 'Resolve the translation error (Apply or Dismiss) before validating.' });
            return;
        }
        // Prevent validation if a validation AI error is showing
        if (validationResult?.status === 'error_ai') {
            console.log("Validation skipped: Validation analysis error is currently displayed.");
            // Optionally, set an info message again, or just do nothing
            // setValidationResult({ status: 'info', message: 'Dismiss the current validation analysis before validating again.' });
            return;
        }

        // Original checks for targetSql content
        if (!targetSql || targetSql === initialTargetSqlPlaceholder || targetSql === '-- Conversion Error --') {
            console.log("Validation skipped: No valid VQL in target editor.");
            setValidationResult({ status: 'info', message: 'Convert the SQL to VQL first or resolve conversion errors.' });
            return;
        }
        // Basic input checks
        if (!sourceSql.trim() || !sourceDialect || !selectedVDB || isLoading || isValidating) {
            return; // Should already be disabled, but double-check
        }

        setIsValidating(true);
        clearValidationState(); // Clear previous validation results
        clearErrorState(); // Clear general translation errors when starting validation

        const vqlToValidate = targetSql;
        const vqlWithoutLineBreaks = vqlToValidate.replace(/[\r\n]+/g, ' ').trim();
        if (!vqlWithoutLineBreaks) {
            setValidationResult({ status: 'error', message: 'Cannot validate empty VQL.' });
            setIsValidating(false);
            return;
        }

        const validateRequestBody = {
            sql: sourceSql, // Send original SQL for context if backend uses it
            vql: vqlWithoutLineBreaks
        };

        try {
            const validateResponse = await fetch(`${API_BASE_URL}/api/validate`, { // Use /validate
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
                // Server indicated failure (e.g., 4xx, 5xx), but might contain AI analysis or message
                if (validationData?.error_analysis) {
                    console.log("Validation failed, received AI analysis.");
                    setValidationResult({ status: 'error_ai', data: validationData.error_analysis });
                } else {
                    const errorMessage = validationData?.message || validationData?.detail || `Validation Request Failed: ${validateResponse.status}`;
                    console.error("Validation failed:", errorMessage);
                    setValidationResult({ status: 'error', message: errorMessage });
                }
            } else {
                // Response is OK (2xx)
                if (validationData.validated) {
                    console.log("Validation successful.");
                    setValidationResult({ status: 'success', message: validationData.message || `VQL syntax check successful!` });
                } else {
                    // Validated === false, check for AI analysis first
                    if (validationData.error_analysis) {
                        console.log("Validation failed (validated=false), received AI analysis.");
                        setValidationResult({ status: 'error_ai', data: validationData.error_analysis });
                    } else {
                        // Validated === false, but no AI analysis provided
                        console.warn("Validation failed (validated=false), no AI analysis provided.");
                        setValidationResult({ status: 'error', message: validationData.message || 'Validation Failed: Denodo rejected the query syntax/plan.' });
                    }
                }
            }

        } catch (err) {
            console.error("Validation process error:", err);
            setValidationResult({
                status: 'error',
                message: `Validation Process Error: ${err.message || 'Unknown error.'}`
            });
        } finally {
            setIsValidating(false);
        }
    };

    // --- Simplified loading state ---
    const anyLoading = isLoading || isValidating;

    // --- Fixed widths and renderEditorCard ---
    const targetEditorFixedWidth = '550px';
    const controlsFixedWidth = '220px';
    const renderEditorCard = (title, borderColor, value, readOnly = false, onChangeHandler = null) => (
        <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} elevation={2}>
            <CardHeader title={title} sx={{ borderBottom: '5px solid', borderColor: borderColor, flexShrink: 0, py: 1.5, px: 2 }} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ flexGrow: 1, p: 0, '&:last-child': { pb: 0 }, overflow: 'hidden', height: '100%' }}>
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <CodeMirror
                        value={value}
                        height="100%"
                        minHeight="55vh" // Maintain min height for consistency
                        extensions={editorExtensions}
                        readOnly={readOnly || anyLoading} // Disable editor if any operation is in progress
                        theme={oneDark}
                        onChange={onChangeHandler}
                        style={{ height: '100%' }}
                    />
                </Box>
            </CardContent>
        </Card>
    );

    // Function to render close button for simple alerts
    const alertCloseButton = (onCloseHandler) => (<IconButton aria-label="close" color="inherit" size="small" onClick={onCloseHandler}><CloseIcon fontSize="inherit" /></IconButton>);


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: `linear-gradient(180deg, ${theme.palette.grey[50]} 0%, ${theme.palette.grey[100]} 100%)` }}>
            <CssBaseline />
            <AppBar position="static" elevation={2} sx={{ background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.dark} 100%)`, flexShrink: 0 }}>
                {/* ... (AppBar content - no changes needed) ... */}
                <Toolbar>
                    <WhatshotIcon sx={{ mr: -2.3, fontSize: '2.5rem', zIndex: 1, transform: 'rotate(-90deg)', color: theme.palette.secondary.dark }} />
                    <DoubleArrowIcon sx={{ mr: 0, fontSize: '2.6rem', zIndex: 2, color: theme.palette.primary.light }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>VQLForge</Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* --- Notifications Area --- */}
                <Stack spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
                    {/* --- Updated Error Handling --- */}
                    {error && typeof error === 'object' && error.explanation && error.sql_suggestion && (
                        // Render the detailed AI analysis component
                        <AiErrorAnalysis
                            errorData={error}
                            onApplySuggestion={handleApplySuggestion}
                            onDismiss={handleDismissError}
                        />
                    )}
                    {error && typeof error === 'string' && (
                        // Render a simple MUI Alert for string errors
                        <Alert
                            severity="error"
                            onClose={clearErrorState} // Use clearErrorState for consistency
                            action={alertCloseButton(clearErrorState)}
                        >
                            <AlertTitle sx={{ fontWeight: 600 }}>Error</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    {/* --- Validation AI Error Analysis --- */}
                    {validationResult?.status === 'error_ai' && validationResult.data && (
                        <AiValidationErrorAnalysis
                            errorData={validationResult.data}
                            onDismiss={clearValidationState}
                            onUseVqlSuggestion={handleUseVqlSuggestion}
                        />
                    )}
                    {/* --- Validation Alerts*/}
                    {validationResult?.status === 'success' && (
                        <Alert severity="success" onClose={clearValidationState} action={alertCloseButton(clearValidationState)}>
                            <AlertTitle sx={{ fontWeight: 600 }}>Validation Successful</AlertTitle>
                            {validationResult.message}
                        </Alert>
                    )}
                    {validationResult?.status === 'info' && (
                        <Alert severity="info" onClose={clearValidationState} action={alertCloseButton(clearValidationState)}>
                            <AlertTitle sx={{ fontWeight: 600 }}>Validation Info</AlertTitle>
                            {validationResult.message}
                        </Alert>
                    )}
                </Stack>

                {/* --- Editors and Controls (Flexbox Layout - Remains the Same) --- */}
                <Box
                    display="flex"
                    flexDirection={{ xs: 'column', md: 'row' }}
                    gap={2.5}
                    alignItems={{ xs: 'center', md: 'stretch' }}
                    sx={{ flexGrow: 1 }}
                >
                    {/* Source SQL Editor */}
                    <Box sx={{ order: { xs: 2, md: 1 }, display: 'flex', width: '100%', [theme.breakpoints.up('md')]: { flexGrow: 1, minWidth: '300px' } }}>
                        {renderEditorCard(`Source (${sourceDialect ? sourceDialect.label : 'Select Dialect'})`, theme.palette.primary.main, sourceSql, false, onSourceChange)}
                    </Box>

                    {/* Controls Column */}
                    <Box sx={{ order: { xs: 1, md: 2 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 2, pt: { xs: 2, md: 0 }, width: { xs: '100%', md: controlsFixedWidth }, flexShrink: 0 }}>
                        {/* Source Dialect Autocomplete */}
                        <Autocomplete
                            disablePortal
                            id="source-dialect-autocomplete"
                            options={availableDialects}
                            getOptionLabel={(option) => option.label || ""}
                            value={sourceDialect}
                            onChange={handleDialectChange}
                            isOptionEqualToValue={(option, value) => option?.value === value?.value}
                            disabled={anyLoading}
                            fullWidth
                            renderInput={(params) => <TextField {...params} label="Source Dialect" />}
                        />
                        {/* VDB Autocomplete */}
                        <Autocomplete
                            disablePortal
                            id="vdb-autocomplete"
                            options={availableVDBs}
                            getOptionLabel={(option) => option.label || ""}
                            value={selectedVDB}
                            onChange={handleVDBChange}
                            isOptionEqualToValue={(option, value) => option?.value === value?.value}
                            disabled={anyLoading}
                            fullWidth
                            renderInput={(params) => <TextField {...params} label="VDB" />}
                        />
                        {/* Convert Button */}
                        <Box sx={{ position: 'relative', width: '100%' }}>
                            <Button variant="contained" color="secondary" onClick={handleConvert} disabled={!sourceSql.trim() || !sourceDialect || !selectedVDB || anyLoading} startIcon={!isLoading ? <DoubleArrowIcon /> : null} fullWidth sx={{ height: '56px', fontWeight: 600 }}>
                                {isLoading ? 'Converting...' : 'Convert'}
                            </Button>
                            {isLoading && (<CircularProgress size={24} color="inherit" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                        </Box>
                        {/* Validate Button */}
                        <Box sx={{ position: 'relative', width: '100%' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={handleValidateQuery}
                                disabled={
                                    anyLoading ||
                                    !sourceSql.trim() ||
                                    !sourceDialect ||
                                    !selectedVDB ||
                                    !targetSql ||
                                    targetSql === initialTargetSqlPlaceholder ||
                                    targetSql === '-- Conversion Error --' ||
                                    (error && typeof error === 'object' && error !== null && error.explanation) // Disable if AI error is shown
                                    // We allow validating if it's just a string error (e.g. network),
                                    // assuming the VQL might still be valid from a previous conversion.
                                }
                                startIcon={!isValidating ? <VerifiedIcon /> : null}
                                fullWidth sx={{ height: '56px', fontWeight: 600, textTransform: 'none' }}
                            >
                                {isValidating ? 'Validating...' : 'Validate VQL'}
                            </Button>
                            {isValidating && (<CircularProgress size={24} color="primary" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                        </Box>
                    </Box>

                    {/* Target SQL Editor */}
                    <Box sx={{ order: { xs: 3, md: 3 }, display: 'flex', width: { xs: '100%', md: targetEditorFixedWidth }, minWidth: { md: targetEditorFixedWidth }, maxWidth: { md: targetEditorFixedWidth }, flexShrink: 0 }}>
                        {renderEditorCard("Target (VQL)", purple[500], targetSql, true)}
                    </Box>
                </Box> {/* End Flexbox Row */}
            </Container>

            {/* --- Footer --- */}
            <Box component="footer" sx={{ height: '50px', px: 2, mt: 'auto', backgroundColor: blueGrey[50], borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Footer content */}
                <Typography variant="caption" color="text.secondary"><a href="https://github.com/banickn/VQLForge" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>VQLForge 0.1 -
                    MIT License
                </a>
                </Typography>
            </Box>
        </Box>
    );
}

export default App;