import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ConfirmDialogProps {
    show: boolean;
    title: string;
    children: React.ReactNode;
    confirmLabel: string;
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

// "Are you sure?" dialog for actions that cannot be undone
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ show, title, children, confirmLabel, danger, busy, onConfirm, onCancel }) => (
    <Modal show={show} onHide={onCancel} centered>
        <Modal.Header closeButton>
            <Modal.Title as="h2" className="h5 m-0">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                {confirmLabel}
            </Button>
        </Modal.Footer>
    </Modal>
);

export default ConfirmDialog;
