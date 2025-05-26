// --- At the top of App.js ---
import React, { useState, useCallback, useEffect } from 'react';
import {
    CssBaseline, AppBar, Toolbar, Typography, Container, Box,
    Button, CircularProgress, Card, CardContent, CardHeader, Alert,
    AlertTitle, IconButton, Stack, useTheme, Autocomplete, TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { purple, blueGrey } from '@mui/material/colors';

// --- Import the new component ---
import AiErrorAnalysis from './AiErrorAnalysis'; // Assuming this component exists
import AiValidationErrorAnalysis from './AiValidationErrorAnalysis'; // Assuming this component exists

// --- Configuration ---
const availableDialects = [{ value: 'athena', label: 'Athena' }, { value: 'bigquery', label: 'BigQuery' }, { value: 'clickhouse', label: 'ClickHouse' }, { value: 'databricks', label: 'Databricks' }, { value: 'doris', label: 'Doris' }, { value: 'drill', label: 'Drill' }, { value: 'druid', label: 'Druid' }, { value: 'duckdb', label: 'DuckDB' }, { value: 'dune', label: 'Dune' }, { value: 'hive', label: 'Hive' }, { value: 'materialize', label: 'Materialize' }, { value: 'mysql', label: 'MySQL' }, { value: 'oracle', label: 'Oracle' }, { value: 'postgres', label: 'PostgreSQL' }, { value: 'presto', label: 'Presto' }, { value: 'prql', label: 'PRQL' }, { value: 'redshift', label: 'Redshift' }, { value: 'risingwave', label: 'RisingWave' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'spark', label: 'Spark SQL' }, { value: 'spark2', label: 'Spark SQL 2' }, { value: 'sqlite', label: 'SQLite' }, { value: 'starrocks', label: 'StarRocks' }, { value: 'tableau', label: 'Tableau' }, { value: 'teradata', label: 'Teradata' }, { value: 'trino', label: 'Trino' }];
const editorExtensions = [sql()];
const initialTargetSqlPlaceholder = '-- Target SQL will appear here after conversion...';

function App() {
    const theme = useTheme();
    const API_BASE_URL = '';
    const [sourceDialect, setSourceDialect] = useState(availableDialects[0]);
    // --- VDB State ---
    const [actualAvailableVDBs, setActualAvailableVDBs] = useState([]);
    const [selectedVDB, setSelectedVDB] = useState(null); // Initialize to null
    const [vdbsLoading, setVdbsLoading] = useState(false);
    const [vdbsError, setVdbsError] = useState(null);

    const [sourceSql, setSourceSql] = useState('SELECT\n    c.customer_id,\n    c.name,\n    COUNT(o.order_id) AS total_orders\nFROM\n    customers c\nLEFT JOIN\n    orders o ON c.customer_id = o.customer_id\nWHERE\n    c.signup_date >= \'2023-01-01\'\nGROUP BY\n    c.customer_id, c.name\nHAVING\n    COUNT(o.order_id) > 5\nORDER BY\n    total_orders DESC\nLIMIT 10;');
    const [targetSql, setTargetSql] = useState(initialTargetSqlPlaceholder);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    const clearValidationState = () => { setValidationResult(null); };
    const clearErrorState = () => { setError(null); };

    // --- Fetch VDBs ---
    useEffect(() => {
        setVdbsLoading(true);
        setVdbsError(null);
        fetch(`${API_BASE_URL}/api/vdbs`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { throw new Error(`Failed to fetch VDBs: ${response.status} ${response.statusText} - ${text}`); });
                }
                return response.json();
            })
            .then(data => {
                if (data && Array.isArray(data.results)) {
                    setActualAvailableVDBs(data.results);
                    // Optionally set a default selected VDB if list is not empty and none is selected
                    // if (data.results.length > 0 && !selectedVDB) {
                    //     setSelectedVDB(data.results[0]);
                    // }
                } else {
                    console.error("VDB data from API is not in the expected format:", data);
                    throw new Error("VDB data is not in the expected format (missing 'results' array).");
                }
                setVdbsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching VDBs:", err);
                setVdbsError(err.message || "Could not fetch VDB options.");
                setActualAvailableVDBs([]); // Set to empty array on error to avoid issues with Autocomplete
                setVdbsLoading(false);
            });
    }, [API_BASE_URL]); // Removed selectedVDB from dependency to avoid re-fetch on selection

    const onSourceChange = useCallback((value) => {
        setSourceSql(value);
        clearErrorState();
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

    const handleApplySuggestion = (suggestedSql) => {
        setSourceSql(suggestedSql);
        setError(null);
        setTargetSql(initialTargetSqlPlaceholder);
        clearValidationState();
    };
    const handleUseVqlSuggestion = (suggestedVql) => {
        setTargetSql(suggestedVql);
        clearValidationState();
    };
    const handleDismissError = () => {
        setError(null);
    };

    const handleConvert = async () => {
        setIsLoading(true);
        clearErrorState();
        clearValidationState();

        if (!sourceDialect || !selectedVDB) {
            setError("Source Dialect and VDB must be selected.");
            setIsLoading(false);
            return;
        }
        const requestBody = {
            sql: sourceSql,
            dialect: sourceDialect.value,
            vdb: selectedVDB.value // selectedVDB is an object, use its value property
        };

        try {
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

            const data = await response.json();

            if (data && typeof data.vql === 'string') {
                setTargetSql(data.vql);
                clearErrorState();
            } else if (data && data.error_analysis && typeof data.error_analysis.explanation === 'string') {
                setError(data.error_analysis);
                setTargetSql(initialTargetSqlPlaceholder);
            } else if (data && typeof data.message === 'string') {
                setError(`Translation Info: ${data.message}`);
                setTargetSql(initialTargetSqlPlaceholder);
            } else {
                throw new Error("Received unexpected success data format from the translation endpoint.");
            }

        } catch (err) {
            console.error("Conversion process failed:", err);
            setError(err.message || 'Unknown conversion error.');
            setTargetSql('-- Conversion Error --');
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidateQuery = async () => {
        if (error && typeof error === 'object' && error !== null && error.explanation) {
            setValidationResult({ status: 'info', message: 'Resolve the translation error (Apply or Dismiss) before validating.' });
            return;
        }
        if (validationResult?.status === 'error_ai') {
            return;
        }
        if (!targetSql || targetSql === initialTargetSqlPlaceholder || targetSql === '-- Conversion Error --') {
            setValidationResult({ status: 'info', message: 'Convert the SQL to VQL first or resolve conversion errors.' });
            return;
        }
        if (!sourceSql.trim() || !sourceDialect || !selectedVDB || isLoading || isValidating || vdbsLoading) {
            return;
        }

        setIsValidating(true);
        clearValidationState();
        clearErrorState();

        const vqlToValidate = targetSql;
        const vqlWithoutLineBreaks = vqlToValidate.replace(/[\r\n]+/g, ' ').trim();
        if (!vqlWithoutLineBreaks) {
            setValidationResult({ status: 'error', message: 'Cannot validate empty VQL.' });
            setIsValidating(false);
            return;
        }

        const validateRequestBody = {
            sql: sourceSql,
            vql: vqlWithoutLineBreaks
        };

        try {
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
                    setValidationResult({ status: 'error_ai', data: validationData.error_analysis });
                } else {
                    const errorMessage = validationData?.message || validationData?.detail || `Validation Request Failed: ${validateResponse.status}`;
                    setValidationResult({ status: 'error', message: errorMessage });
                }
            } else {
                if (validationData.validated) {
                    setValidationResult({ status: 'success', message: validationData.message || `VQL syntax check successful!` });
                } else {
                    if (validationData.error_analysis) {
                        setValidationResult({ status: 'error_ai', data: validationData.error_analysis });
                    } else {
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

    const anyLoading = isLoading || isValidating || vdbsLoading;

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
                        minHeight="55vh"
                        extensions={editorExtensions}
                        readOnly={readOnly || anyLoading}
                        theme={oneDark}
                        onChange={onChangeHandler}
                        style={{ height: '100%' }}
                    />
                </Box>
            </CardContent>
        </Card>
    );

    const alertCloseButton = (onCloseHandler) => (<IconButton aria-label="close" color="inherit" size="small" onClick={onCloseHandler}><CloseIcon fontSize="inherit" /></IconButton>);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: `linear-gradient(180deg, ${theme.palette.grey[50]} 0%, ${theme.palette.grey[100]} 100%)` }}>
            <CssBaseline />
            <AppBar position="static" elevation={2} sx={{ background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.dark} 100%)`, flexShrink: 0 }}>
                <Toolbar>
                    <WhatshotIcon sx={{ mr: -2.3, fontSize: '2.5rem', zIndex: 1, transform: 'rotate(-90deg)', color: theme.palette.secondary.dark }} />
                    <DoubleArrowIcon sx={{ mr: 0, fontSize: '2.6rem', zIndex: 2, color: theme.palette.primary.light }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>VQLForge</Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
                    {error && typeof error === 'object' && error.explanation && error.sql_suggestion && (
                        <AiErrorAnalysis
                            errorData={error}
                            onApplySuggestion={handleApplySuggestion}
                            onDismiss={handleDismissError}
                        />
                    )}
                    {error && typeof error === 'string' && (
                        <Alert
                            severity="error"
                            onClose={clearErrorState}
                            action={alertCloseButton(clearErrorState)}
                        >
                            <AlertTitle sx={{ fontWeight: 600 }}>Error</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    {/* --- VDB Loading/Error --- */}
                    {vdbsLoading && !vdbsError && ( // Show loading only if no error
                        <Alert severity="info" icon={<CircularProgress size={20} />}>Loading VDB options...</Alert>
                    )}
                    {vdbsError && (
                        <Alert
                            severity="warning"
                            action={alertCloseButton(() => setVdbsError(null))}
                        >
                            <AlertTitle sx={{ fontWeight: 600 }}>VDB Load Issue</AlertTitle>
                            {vdbsError} - VDB selection might be unavailable or incomplete.
                        </Alert>
                    )}
                    {validationResult?.status === 'error_ai' && validationResult.data && (
                        <AiValidationErrorAnalysis
                            errorData={validationResult.data}
                            onDismiss={clearValidationState}
                            onUseVqlSuggestion={handleUseVqlSuggestion}
                        />
                    )}
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
                    {/* Moved error type error (the one related to validation) down to avoid overlap with general error */}
                    {validationResult?.status === 'error' && (
                        <Alert severity="error" onClose={clearValidationState} action={alertCloseButton(clearValidationState)}>
                            <AlertTitle sx={{ fontWeight: 600 }}>Validation Error</AlertTitle>
                            {validationResult.message}
                        </Alert>
                    )}
                </Stack>

                <Box
                    display="flex"
                    flexDirection={{ xs: 'column', md: 'row' }}
                    gap={2.5}
                    alignItems={{ xs: 'center', md: 'stretch' }}
                    sx={{ flexGrow: 1 }}
                >
                    <Box sx={{ order: { xs: 2, md: 1 }, display: 'flex', width: '100%', [theme.breakpoints.up('md')]: { flexGrow: 1, minWidth: '300px' } }}>
                        {renderEditorCard(`Source (${sourceDialect ? sourceDialect.label : 'Select Dialect'})`, theme.palette.primary.main, sourceSql, false, onSourceChange)}
                    </Box>

                    <Box sx={{ order: { xs: 1, md: 2 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 2, pt: { xs: 2, md: 0 }, width: { xs: '100%', md: controlsFixedWidth }, flexShrink: 0 }}>
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
                        <Autocomplete
                            disablePortal
                            id="vdb-autocomplete"
                            options={actualAvailableVDBs}
                            loading={vdbsLoading}
                            noOptionsText={vdbsError ? "Error loading VDBs" : (vdbsLoading ? "Loading..." : "No VDBs configured")}
                            getOptionLabel={(option) => option.label || ""}
                            value={selectedVDB}
                            onChange={handleVDBChange}
                            isOptionEqualToValue={(option, value) => option?.value === value?.value}
                            disabled={anyLoading || !!vdbsError || actualAvailableVDBs.length === 0}
                            fullWidth
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="VDB"
                                    error={!!vdbsError} // Show error state on TextField if VDB loading failed
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <React.Fragment>
                                                {vdbsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </React.Fragment>
                                        ),
                                    }}
                                />
                            )}
                        />
                        <Box sx={{ position: 'relative', width: '100%' }}>
                            <Button variant="contained" color="secondary" onClick={handleConvert} disabled={!sourceSql.trim() || !sourceDialect || !selectedVDB || anyLoading} startIcon={!isLoading ? <DoubleArrowIcon /> : null} fullWidth sx={{ height: '56px', fontWeight: 600 }}>
                                {isLoading ? 'Converting...' : 'Convert'}
                            </Button>
                            {isLoading && (<CircularProgress size={24} color="inherit" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                        </Box>
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
                                    (error && typeof error === 'object' && error !== null && error.explanation)
                                }
                                startIcon={!isValidating ? <VerifiedIcon /> : null}
                                fullWidth sx={{ height: '56px', fontWeight: 600, textTransform: 'none' }}
                            >
                                {isValidating ? 'Validating...' : 'Validate VQL'}
                            </Button>
                            {isValidating && (<CircularProgress size={24} color="primary" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                        </Box>
                    </Box>

                    <Box sx={{ order: { xs: 3, md: 3 }, display: 'flex', width: { xs: '100%', md: targetEditorFixedWidth }, minWidth: { md: targetEditorFixedWidth }, maxWidth: { md: targetEditorFixedWidth }, flexShrink: 0 }}>
                        {renderEditorCard("Target (VQL)", purple[500], targetSql, true)}
                    </Box>
                </Box>
            </Container>

            <Box component="footer" sx={{ height: '50px', px: 2, mt: 'auto', backgroundColor: blueGrey[50], borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary"><a href="https://github.com/banickn/VQLForge" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>VQLForge 0.1 -
                    MIT License
                </a>
                </Typography>
            </Box>
        </Box>
    );
}

export default App;