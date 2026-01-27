'use client';

import { useModal } from '@/context/ModalContext';
import ShareModal from '@/components/ShareModal';

export default function GlobalModal() {
    const { activeModal, modalProps, closeModal } = useModal();

    if (!activeModal) return null;

    return (
        <>
            <ShareModal
                isOpen={activeModal === 'SHARE'}
                onClose={closeModal}
                {...modalProps}
            />
            {/* Add other global modals here in the future */}
        </>
    );
}
