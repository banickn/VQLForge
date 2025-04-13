import React, { useState, useCallback } from 'react';
import {
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    Container,
    // Grid, // No longer using Grid for the main layout row
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    CircularProgress,
    Card,
    CardContent,
    CardHeader,
    Alert,
    AlertTitle,
    IconButton,
    Stack,
    useTheme,
} from '@mui/material';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import { purple, red, grey, blueGrey } from '@mui/material/colors';
// import GradientIcon from './components/GradientIcon';

// --- Configuration ---
const availableDialects = [ { value: 'athena', label: 'Athena' }, { value: 'bigquery', label: 'BigQuery' }, { value: 'clickhouse', label: 'ClickHouse' }, { value: 'databricks', label: 'Databricks' }, { value: 'doris', label: 'Doris' }, { value: 'drill', label: 'Drill' }, { value: 'druid', label: 'Druid' }, { value: 'duckdb', label: 'DuckDB' }, { value: 'dune', label: 'Dune' }, { value: 'hive', label: 'Hive' }, { value: 'materialize', label: 'Materialize' }, { value: 'mysql', label: 'MySQL' }, { value: 'oracle', label: 'Oracle' }, { value: 'postgres', label: 'PostgreSQL' }, { value: 'presto', label: 'Presto' }, { value: 'prql', label: 'PRQL' }, { value: 'redshift', label: 'Redshift' }, { value: 'risingwave', label: 'RisingWave' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'spark', label: 'Spark SQL' }, { value: 'spark2', label: 'Spark SQL 2' }, { value: 'sqlite', label: 'SQLite' }, { value: 'starrocks', label: 'StarRocks' }, { value: 'tableau', label: 'Tableau' }, { value: 'teradata', label: 'Teradata' }, { value: 'trino', label: 'Trino' } ];
const editorExtensions = [sql()];

function App() {
    const theme = useTheme();
    const [sourceDialect, setSourceDialect] = useState(availableDialects[0].value);
    const [sourceSql, setSourceSql] = useState('SELECT\n    c.customer_id,\n    c.name,\n    COUNT(o.order_id) AS total_orders\nFROM\n    customers c\nLEFT JOIN\n    orders o ON c.customer_id = o.customer_id\nWHERE\n    c.signup_date >= \'2023-01-01\'\nGROUP BY\n    c.customer_id, c.name\nHAVING\n    COUNT(o.order_id) > 5\nORDER BY\n    total_orders DESC\nLIMIT 10;');
    const [targetSql, setTargetSql] = useState('-- Target SQL will appear here after conversion...');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [aiError, setAiError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    const clearAiState = () => { setAiSuggestion(''); setAiError(''); };
    const clearValidationState = () => { setValidationResult(null); };

    const onSourceChange = useCallback((value) => {
        setSourceSql(value);
        setError(''); clearAiState(); clearValidationState();
    }, []);

    const handleDialectChange = (event) => {
        setSourceDialect(event.target.value);
        setError(''); clearAiState(); clearValidationState();
    };

    const handleConvert = async () => {
        setIsLoading(true); setError(''); clearAiState(); clearValidationState(); setTargetSql('');
        const requestBody = { sql: sourceSql, dialect: sourceDialect };
        try {
            const response = await fetch(`/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) {
                let errorDetails = ''; let errorMessage = `Request failed: ${response.status}`;
                try {
                    errorDetails = await response.text();
                    if (errorDetails && errorDetails.startsWith('{') && errorDetails.endsWith('}')) {
                        const errorData = JSON.parse(errorDetails); errorMessage = errorData.detail || errorData.error || errorData.message || JSON.stringify(errorData);
                    } else if (errorDetails) { errorMessage = errorDetails; }
                } catch (parseError) { try { const textError = await response.text(); if (textError) errorMessage = textError; } catch (readError) { /* ignore */ } console.error("Error parsing error:", parseError); }
                 if (!errorMessage.toLowerCase().includes(response.status.toString())) { errorMessage = `(${response.status}) ${errorMessage}`; }
                throw new Error(errorMessage);
            }
            const data = await response.json();
            if (data && typeof data.vql === 'string') { setTargetSql(data.vql); }
            else { console.error("Unexpected format:", data); throw new Error("Unexpected data format."); }
        } catch (err) { console.error("Conversion failed:", err); setError(err.message || 'Unknown conversion error.'); setTargetSql('-- Conversion Error --'); }
        finally { setIsLoading(false); }
    };

    const handleSendErrorToAI = async () => {
         if (!error) return; setIsAiLoading(true); setAiSuggestion(''); setAiError(''); clearValidationState();
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            if (error.toLowerCase().includes('network') || error.toLowerCase().includes('unreachable')) { throw new Error("AI Service Unreachable."); }
            else if (error.toLowerCase().includes('syntax error')) { setAiSuggestion(`AI: Check syntax for ${getDialectLabel(sourceDialect)} near the error location.`); }
            else if (error.toLowerCase().includes('invalid table')) { setAiSuggestion(`AI: Verify table names and permissions in ${getDialectLabel(sourceDialect)}.`); }
            else { setAiSuggestion(`AI Suggestion for "${error}": Review common patterns or docs.`); }
        } catch (aiApiError) { setAiError(`AI Error: ${aiApiError.message}`); }
        finally { setIsAiLoading(false); }
    };

    const handleValidateQuery = async () => {
         if (!sourceSql.trim() || error || isLoading || isAiLoading || isValidating) return; setIsValidating(true); clearValidationState(); clearAiState();
        try {
            await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate delay
            if (sourceSql.toLowerCase().includes('invalid_column_name')) { throw new Error(`Column 'invalid_column_name' not found in ${getDialectLabel(sourceDialect)}.`); }
            else if (sourceSql.toLowerCase().includes('invalid_table_name')) { throw new Error(`Table 'invalid_table_name' does not exist in ${getDialectLabel(sourceDialect)}.`); }
            else if (sourceSql.toLowerCase().includes('syntax_error_validate')) { throw new Error(`Syntax error near 'syntax_error_validate' in ${getDialectLabel(sourceDialect)}.`); }
            else if (sourceSql.toLowerCase().includes('permission_denied')) { throw new Error(`Permission denied in ${getDialectLabel(sourceDialect)}.`); }
            else { setValidationResult({ status: 'success', message: `Query syntax valid for ${getDialectLabel(sourceDialect)}.` }); }
        } catch (validationErr) { console.error("Validation failed:", validationErr); setValidationResult({ status: 'error', message: `${validationErr.message}` }); }
        finally { setIsValidating(false); }
    };

    const getDialectLabel = (value) => availableDialects.find(d => d.value === value)?.label || value;
    const alertCloseButton = (onCloseHandler) => ( <IconButton aria-label="close" color="inherit" size="small" onClick={onCloseHandler}><CloseIcon fontSize="inherit" /></IconButton> );
    const anyLoading = isLoading || isAiLoading || isValidating;

    // --- Define fixed widths ---
    const targetEditorFixedWidth = '550px'; // Adjust as needed
    const controlsFixedWidth = '220px';    // Adjust as needed

    // --- Helper function for Card rendering ---
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
                        readOnly={readOnly || anyLoading}
                        theme={oneDark}
                        onChange={onChangeHandler}
                        style={{ height: '100%' }}
                    />
                </Box>
            </CardContent>
        </Card>
    );


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: `linear-gradient(180deg, ${theme.palette.grey[50]} 0%, ${theme.palette.grey[100]} 100%)` }}>
            <CssBaseline />
            <AppBar position="static" elevation={2} sx={{ background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.dark} 100%)`, flexShrink: 0 }}>
                <Toolbar>
                    <WhatshotIcon sx={{ mr: -2.3, fontSize: '2.5rem',zIndex: 1, transform: 'rotate(-90deg)', color: theme.palette.secondary.dark }} />
                    <DoubleArrowIcon sx={{ mr: 0, fontSize: '2.6rem',zIndex: 2, color: theme.palette.primary.light }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>VQLForge</Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* --- Notifications Area --- */}
                 <Stack spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
                    {/* Error Alerts */}
                    {error && ( <Alert severity="error" onClose={() => { setError(''); clearAiState(); clearValidationState(); }} action={alertCloseButton(() => { setError(''); clearAiState(); clearValidationState(); })}> <AlertTitle sx={{ fontWeight: 600 }}>Conversion Error</AlertTitle> {error} </Alert> )}
                    {aiError && ( <Alert severity="warning" onClose={() => setAiError('')} action={alertCloseButton(() => setAiError(''))}> <AlertTitle sx={{ fontWeight: 600 }}>AI Analysis Error</AlertTitle> {aiError} </Alert> )}
                    {validationResult?.status === 'error' && ( <Alert severity="warning" onClose={clearValidationState} action={alertCloseButton(clearValidationState)}> <AlertTitle sx={{ fontWeight: 600 }}>Validation Failed</AlertTitle> {validationResult.message} </Alert> )}

                    {/* AI Button (conditional) */}
                    {error && !aiSuggestion && !aiError && ( <Box sx={{ display: 'flex', justifyContent: 'flex-start', position: 'relative', width: 'fit-content' }}> <Button variant="outlined" color="secondary" size="small" onClick={handleSendErrorToAI} disabled={anyLoading} startIcon={!isAiLoading ? <AutoFixHighIcon /> : null} sx={{ textTransform: 'none', fontWeight: 600 }}> {isAiLoading ? 'Analyzing...' : 'Get AI Suggestion'} </Button> {isAiLoading && ( <CircularProgress size={20} color="secondary" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-10px', marginLeft: '-10px' }} /> )} </Box> )}

                    {/* Info/Success Alerts */}
                    {aiSuggestion && !aiError && ( <Alert severity="info" onClose={() => setAiSuggestion('')} action={alertCloseButton(() => setAiSuggestion(''))}> <AlertTitle sx={{ fontWeight: 600 }}>AI Suggestion</AlertTitle> {aiSuggestion} </Alert> )}
                    {validationResult?.status === 'success' && ( <Alert severity="success" onClose={clearValidationState} action={alertCloseButton(clearValidationState)}> <AlertTitle sx={{ fontWeight: 600 }}>Validation Successful</AlertTitle> {validationResult.message} </Alert> )}
                </Stack>

                {/* --- Editors and Controls using Flexbox --- */}
                <Box
                    display="flex"
                    flexDirection={{ xs: 'column', md: 'row' }} // Column on small, row on medium+
                    gap={2.5}                                  // Spacing between items (adjust as needed)
                    alignItems={{ xs: 'center', md: 'stretch' }} // Stretch items vertically on medium+
                    sx={{ flexGrow: 1 }}                       // Allow this row to grow vertically
                >
                    {/* --- Source SQL Editor --- */}
                    <Box
                        sx={{
                            order: { xs: 2, md: 1 },       // Order for stacking
                            display: 'flex',             // To make card height 100% work
                            width: '100%',               // Full width on small screens
                            [theme.breakpoints.up('md')]: {
                                flexGrow: 1,             // Takes remaining space on medium+
                                minWidth: '300px',       // Minimum width to prevent becoming too small
                            }
                        }}
                    >
                        {renderEditorCard(
                            `Source (${getDialectLabel(sourceDialect)})`,
                            theme.palette.primary.main,
                            sourceSql,
                            false, // Not read-only by default
                            onSourceChange
                        )}
                    </Box>

                    {/* --- Controls Column --- */}
                    <Box
                        sx={{
                            order: { xs: 1, md: 2 },       // Order for stacking
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center', // Center items horizontally within the column
                            justifyContent: 'flex-start', // Align items to the top
                            gap: 2,
                            pt: { xs: 2, md: 0 }, // Padding top only on mobile
                            width: { xs: '100%', md: controlsFixedWidth }, // Full width on xs, fixed on md+
                            flexShrink: 0,               // Prevent shrinking
                        }}
                    >
                        <FormControl fullWidth>
                            <InputLabel id="source-dialect-label">Source Dialect</InputLabel>
                            <Select labelId="source-dialect-label" id="source-dialect-select" value={sourceDialect} label="Source Dialect" onChange={handleDialectChange} disabled={anyLoading}>
                                {availableDialects.map((dialect) => ( <MenuItem key={dialect.value} value={dialect.value}> {dialect.label} </MenuItem> ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ position: 'relative', width: '100%' }}>
                            <Button variant="contained" color="secondary" onClick={handleConvert} disabled={!sourceSql.trim() || anyLoading} startIcon={!isLoading ? <DoubleArrowIcon /> : null} fullWidth sx={{ height: '56px', fontWeight: 600 }}>
                                {isLoading ? 'Converting...' : 'Convert'}
                            </Button>
                            {isLoading && ( <CircularProgress size={24} color="inherit" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} /> )}
                        </Box>

                        {!error && (
                             <Box sx={{ position: 'relative', width: '100%' }}>
                                <Button variant="outlined" color="primary" onClick={handleValidateQuery} disabled={!sourceSql.trim() || anyLoading} startIcon={!isValidating ? <VerifiedIcon /> : null} fullWidth sx={{ height: '56px', fontWeight: 600, textTransform: 'none' }}>
                                    {isValidating ? 'Validating...' : 'Validate Query'}
                                </Button>
                                {isValidating && ( <CircularProgress size={24} color="primary" sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} /> )}
                             </Box>
                        )}
                    </Box>

                    {/* --- Target SQL Editor --- */}
                    <Box
                        sx={{
                            order: { xs: 3, md: 3 },       // Order for stacking
                            display: 'flex',             // To make card height 100% work
                            width: { xs: '100%', md: targetEditorFixedWidth }, // Full width on xs, fixed on md+
                            // Apply min/max width explicitly for robustness
                            minWidth: { md: targetEditorFixedWidth },
                            maxWidth: { md: targetEditorFixedWidth },
                            flexShrink: 0,               // Prevent shrinking absolutely
                        }}
                    >
                         {renderEditorCard(
                            "Target (VQL)",
                            'purple', // Example color
                            targetSql,
                            true // Always read-only
                        )}
                    </Box>
                </Box> {/* End Flexbox Row */}
            </Container>

             {/* --- Footer --- */}
             <Box component="footer" sx={{ height: '50px', px: 2, mt: 'auto', backgroundColor: blueGrey[50], borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary">VQLForge 1.0 - <a href="https://github.com/banickn/VQLForge" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                   MIT License
                  </a>
                </Typography>
            </Box>
        </Box>
    );
}

export default App;