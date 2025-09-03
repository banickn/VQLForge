import React from 'react';
import PropTypes from 'prop-types';

function CustomSelect({ label, options, value, onChange, disabled, loading, error }) {

    // This handler bridges the difference between the component's API and the native <select> element.
    // It receives a string value from the DOM event and finds the corresponding full object
    // to pass back to the parent component's state.
    const handleChange = (event) => {
        const selectedValue = event.target.value;
        const selectedOptionObject = options.find(option => option.value === selectedValue);
        onChange(selectedOptionObject);
    };

    // Dynamically create Tailwind classes
    const baseClasses = "w-full h-12 px-3 py-2 text-white bg-gray-800 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary";
    const borderClasses = error ? 'border-red-500' : 'border-gray-600';
    const disabledClasses = "disabled:bg-gray-700/50 disabled:cursor-not-allowed disabled:text-gray-400";

    return (
        <div>
            <label htmlFor={label} className="block text-sm font-medium text-gray-300 mb-1">
                {label}
            </label>
            <div className="relative">
                <select
                    id={label}
                    value={value?.value || ''} // Use the object's 'value' property for the select value
                    onChange={handleChange}
                    disabled={disabled || loading}
                    className={`${baseClasses} ${borderClasses} ${disabledClasses}`}
                >
                    {/* Handle the loading and empty states */}
                    {loading && <option value="">Loading...</option>}
                    {!loading && options.length === 0 && <option value="">No options available</option>}

                    {/* Map the options array to <option> elements */}
                    {!loading && options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

CustomSelect.propTypes = {
    label: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
    value: PropTypes.object,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    error: PropTypes.string, // Can be a string for an error message, but we just check for its existence
};

export default CustomSelect;