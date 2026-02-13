import React, { createContext, useState, useContext, useRef, useCallback } from 'react';

const AlertContext = createContext();

// Create a ref to hold the alert function for global access (outside React tree)
export const globalAlertRef = React.createRef();

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info', // success, error, warning, info
    buttons: [], // [{ text, onPress, style }]
    onDismiss: null,
  });

  const showAlert = useCallback((title, message, buttons = [], options = {}) => {
    // Determine type based on options or guess from title/message if not provided? 
    // For now, let's keep it simple and default to 'info' if not specified in options.
    // However, to replace React Native Alert.alert, we usually just pass (title, message, buttons).
    // We can extend this to accept a 4th argument 'type' or options object.
    
    // Check if options is a string (legacy type) or object
    let type = 'info';
    let onDismiss = null;

    if (options && typeof options === 'string') {
        type = options; 
    } else if (options && typeof options === 'object') {
        type = options.type || 'info';
        onDismiss = options.onDismiss;
    }

    // Auto-detect type from title if not specified? 
    if (type === 'info') {
        const lowerTitle = (title || '').toLowerCase();
        if (lowerTitle.includes('error') || lowerTitle.includes('fail')) type = 'error';
        else if (lowerTitle.includes('success')) type = 'success';
        else if (lowerTitle.includes('warn')) type = 'warning';
    }

    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => closeAlert() }],
      type,
      onDismiss
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    if (alertConfig.onDismiss) {
        alertConfig.onDismiss();
    }
  }, [alertConfig]);

  // Expose the function to the global ref
  if (globalAlertRef) {
    globalAlertRef.current = { alert: showAlert };
  }

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert, alertState: alertConfig }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

// Global Helper to mimic Alert.alert
export const GlobalAlert = {
    alert: (title, message, buttons, options) => {
        if (globalAlertRef.current) {
            globalAlertRef.current.alert(title, message, buttons, options);
        } else {
            console.error("GlobalAlert not initialized. Ensure AlertProvider is at the root.");
        }
    }
};
