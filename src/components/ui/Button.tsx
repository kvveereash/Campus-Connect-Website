import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    children?: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
    href?: string; // Support for Link
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    href,
    ...props
}: ButtonProps) {
    const combinedClassName = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className
    ].filter(Boolean).join(' ');

    const content = (
        <>
            {isLoading && <span className={styles.spinner} />}
            {!isLoading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
        </>
    );

    // A link takes only what a link can use; the button props are for buttons.
    if (href) {
        return (
            <Link href={href} className={combinedClassName}>
                {content}
            </Link>
        );
    }

    return (
        <button className={combinedClassName} disabled={disabled || isLoading} {...props}>
            {content}
        </button>
    );
}
