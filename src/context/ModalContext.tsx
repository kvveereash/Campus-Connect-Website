'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'SHARE' | null;

interface ModalContextType {
    activeModal: ModalType;
    modalProps: any;
    openModal: (type: ModalType, props?: any) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalProps, setModalProps] = useState<any>({});

    const openModal = (type: ModalType, props: any = {}) => {
        setActiveModal(type);
        setModalProps(props);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalProps({});
    };

    return (
        <ModalContext.Provider value={{ activeModal, modalProps, openModal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
