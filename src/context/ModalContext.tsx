'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'SHARE' | null;

/** What the share modal needs; the only global modal there is. */
export interface ShareModalData {
    eventUrl: string;
    eventName: string;
}

interface ModalContextType {
    activeModal: ModalType;
    modalProps: ShareModalData | null;
    openModal: (type: ModalType, props: ShareModalData) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalProps, setModalProps] = useState<ShareModalData | null>(null);

    const openModal = (type: ModalType, props: ShareModalData) => {
        setActiveModal(type);
        setModalProps(props);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalProps(null);
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
