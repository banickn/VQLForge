// --- At the top of App.js ---
import React, { useState, useCallback, useEffect } from 'react';
import {
    CssBaseline, AppBar, Toolbar, Typography, Container, Box,
    Button, CircularProgress, Card, CardContent, CardHeader, Alert,
    AlertTitle, IconButton, Stack, useTheme, Autocomplete, TextField,
} from '@mui/material'; // Import necessary Material UI components
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { purple, blueGrey } from '@mui/material/colors';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Import AccountCircleIcon
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings'; // Import SettingsIcon

// Import API Service
import { fetchVdbs, translateSql, validateSql } from '/home/user/VQLForge/frontend/src/apiService.js';

// Import Custom Components
import CodeEditor from '/home/user/VQLForge/frontend/src/components/Editors/CodeEditor.js';

// --- Import Alert Components ---
import AiErrorAnalysis from '/home/user/VQLForge/frontend/src/components/Alerts/AiErrorAnalysis.js';
import AiValidationErrorAnalysis from '/home/user/VQLForge/frontend/src/components/Alerts/AiValidationErrorAnalysis.js';
// import ConvertButton from '/home/user/VQLForge/frontend/src/components/Controls/ConvertButton.js'; // Assuming you'll create this

// --- Configuration ---
const availableDialects = [{ value: 'athena', label: 'Athena' }, { value: 'bigquery', label: 'BigQuery' }, { value: 'clickhouse', label: 'ClickHouse' }, { value: 'databricks', label: 'Databricks' }, { value: 'doris', label: 'Doris' }, { value: 'drill', label: 'Drill' }, { value: 'druid', label: 'Druid' }, { value: 'duckdb', label: 'DuckDB' }, { value: 'dune', label: 'Dune' }, { value: 'hive', label: 'Hive' }, { value: 'materialize', label: 'Materialize' }, { value: 'mysql', label: 'MySQL' }, { value: 'oracle', label: 'Oracle' }, { value: 'postgres', label: 'PostgreSQL' }, { value: 'presto', label: 'Presto' }, { value: 'prql', label: 'PRQL' }, { value: 'redshift', label: 'Redshift' }, { value: 'risingwave', label: 'RisingWave' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'spark', label: 'Spark SQL' }, { value: 'spark2', label: 'Spark SQL 2' }, { value: 'sqlite', label: 'SQLite' }, { value: 'starrocks', label: 'StarRocks' }, { value: 'tableau', label: 'Tableau' }, { value: 'teradata', label: 'Teradata' }, { value: 'trino', label: 'Trino' }];
const editorExtensions = [sql()];
const initialTargetSqlPlaceholder = '-- Target SQL will appear here after conversion...';
const conversionErrorPlaceholder = '-- Conversion Error --';

function App() {
    const theme = useTheme();
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
 fetchVdbs()

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
    }, []); // Removed selectedVDB from dependency to avoid re-fetch on selection

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
        // const requestBody = { sql: sourceSql, dialect: sourceDialect.value, vdb: selectedVDB.value }; // No longer needed here
 const requestBody = {
 sql: sourceSql,
 dialect: sourceDialect.value,
 vdb: selectedVDB.value // selectedVDB is an object, use its value property
 };
        // Using the new apiService
 try {
            const data = await translateSQL(requestBody);

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
 setTargetSql(conversionErrorPlaceholder);
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
        if (!targetSql || targetSql === initialTargetSqlPlaceholder || targetSql === conversionErrorPlaceholder) {
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

        try {
            // Using the new apiService
            const validationData = await validateSql(sourceSql, vqlWithoutLineBreaks);
            // The validateSql service now throws errors with specific data for AI analysis
            if (validationData.validated) {
                setValidationResult({ status: 'success', message: validationData.message || `VQL syntax check successful!` });
            // This else block is now handled in the catch block due to the service throwing
            } else {
                // This case should ideally not be reached if validateSql service throws on non-ok
                setValidationResult({ status: 'error', message: validationData.message || 'Validation Failed: Denodo rejected the query syntax/plan.' });
            }

        } catch (err) {
            console.error("Validation process error:", err);
            if (err.status === 'error_ai' && err.data) { // Check for the custom error status and data
                setValidationResult({ status: 'error_ai', data: err.data });
            } else {
                setValidationResult({
                    status: 'error',
                    message: `Validation Process Error: ${err.message || 'Unknown error.'}`
                });
            }
        } finally {
            setIsValidating(false);
        }
    };

    const handleSwap = () => {
        const currentSourceDialect = sourceDialect;
        const currentSelectedVDB = selectedVDB;
        setSourceDialect(currentSelectedVDB); // Swap VDB to Source Dialect
        setSelectedVDB(currentSourceDialect); // Swap Source Dialect to Selected VDB
        setSourceSql(targetSql); // Swap SQL and VQL
        setTargetSql(initialTargetSqlPlaceholder); // Reset target VQL
    };
 const renderAlerts = () => (
 <Stack spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
 {/* Error and validation alerts will be rendered here */}
 {/* This is a helper function to keep the main render cleaner */}
 </Stack>
 );

 const targetEditorFixedWidth = '550px';
    const controlsFixedWidth = '220px';
    const anyLoading = isLoading || isValidating || vdbsLoading;

    // Helper to render alert messages
    const renderAlerts = () => (
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
                    {vdbsError} - VDB selection might be unavailable or incomplete.\n
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
    );

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
                       <CodeEditor
                            title={`Source (${sourceDialect ? sourceDialect.label : 'Select Dialect'})`}
                            borderColor={theme.palette.primary.main}
                            value={sourceSql}
                            onChange={onSourceChange}
                            extensions={editorExtensions}
                            loading={anyLoading}
                        />
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
                            renderInput={(params) => <TextField {...params} label="Source Dialect" />} // Changed to TextField
                            renderOption={(props, option) => ( // renderOption for dropdown options
                                <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                    {/* Placeholder for dialect icon - replace with actual icon component */}
                                    {/* <img loading="lazy" width="20" src={`/icons/${option.value}.svg`} alt="" /> */}
                                    {option.label}
                                </Box>
                            )}
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
 renderOption={(props, option) => ( // renderOption for dropdown options
 <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
 {/* Placeholder for VDB icon - replace with actual icon component */}
 {/* <img loading="lazy" width="20" src={`/icons/vdb.svg`} alt="" /> */}
 {option.label}
 </Box>
 )}
                                    InputProps={{
                                        ...params.InputProps,
                                        // renderOption={(props, option) => ( // renderOption for dropdown options
                                        //  <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                        //  {/* Placeholder for VDB icon - replace with actual icon component */}
                                        //  {/* <img loading="lazy" width="20" src={`/icons/vdb.svg`} alt="" /> */}
                                        // renderInput={(params) => ( // Optional: custom rendering for the selected value in the input field
                                        //  <TextField {...params} label="VDB"
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
                        <Box sx={{ position: 'relative', width: '100%', mt: 2 }}> {/* Added margin top for spacing */}
 <Button variant="contained" color="secondary" onClick={handleConvert} disabled={!sourceSql.trim() || !sourceDialect || !selectedVDB || anyLoading} startIcon={!isLoading ? <DoubleArrowIcon /> : null} fullWidth sx={{ height: '56px', fontWeight: 600, textTransform: 'none' }}>
                                {isLoading ? 'Converting...' : 'Convert'}
                            </Button>
                            {isLoading && (<CircularProgress size={24} color="inherit" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />)}
                        </Box>
                        {/* Add a Box placeholder for the animated arrow here */}
                         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', my: 2 }}> {/* Added margin vertical for spacing */}
                            {/* Animated arrow component goes here */}
                         </Box>
                         {/* Add the Swap button */}
                         <Box sx={{ width: '100%' }}>
                             <Button variant="outlined" color="info" onClick={handleSwap} disabled={anyLoading} fullWidth>Swap</Button>
                        </Box>
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

 {/* Placeholder buttons for preset templates */}
 <Stack spacing={1} sx={{ width: '100%', mt: 3 }}> {/* Adjusted margin top */}
 <Typography variant="overline" sx={{ textAlign: 'center' }}>Preset Templates</Typography>
 <Button variant="outlined" size="small" fullWidth>Common Join</Button>
 <Button variant="outlined" size="small" fullWidth>Aggregation Example</Button>
 <Button variant="outlined" size="small" fullWidth>Subquery Example</Button>
 </Stack>

 {/* Add a Box placeholder for the animated arrow here */}
                    <Box sx={{ order: { xs: 3, md: 3 }, display: 'flex', width: { xs: '100%', md: targetEditorFixedWidth }, minWidth: { md: targetEditorFixedWidth }, maxWidth: { md: targetEditorFixedWidth }, flexShrink: 0 }}>
                        <CodeEditor
                            title="Target (VQL)"
                            borderColor={purple[500]}
                            value={targetSql}
                            readOnly={true}
                            extensions={editorExtensions}
                            loading={anyLoading}
                        />
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