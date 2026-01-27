'use client';

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    startIcon?: ReactNode;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, startIcon, className = '', fullWidth = true, ...props }, ref) => {
        return (
            <div className={styles.container} style={{ width: fullWidth ? '100%' : 'auto' }}>
                {label && (
                    <label htmlFor={props.id} className={styles.label}>
                        {label}
                    </label>
                )}

                <div className={styles.inputWrapper}>
                    {startIcon && <span className={styles.startIcon}>{startIcon}</span>}
                    <input
                        ref={ref}
                        className={`
                            ${styles.input} 
                            ${error ? styles.errorInput : ''} 
                            ${startIcon ? styles.inputWithIcon : ''} 
                            ${className}
                        `}
                        {...props}
                    />
                </div>

                {error && <span className={styles.errorMessage}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
