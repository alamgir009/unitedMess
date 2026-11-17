import { forwardRef, useId, useRef, useEffect, useCallback } from 'react';

const Form = forwardRef(({ children, className, onBlurCapture, onChangeCapture, onInvalidCapture, ...props }, forwardedRef) => {
    const formRef = useRef(null);
    const feedback = useRef(new Map());
    const formId = useId();
    const nextFieldId = useRef(0);
    const nextFeedbackId = useRef(0);
    const setRef = useCallback(node => {
        formRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    const validate = (field) => {
        if (!field.matches?.('input, select, textarea') || field.disabled || field.readOnly || !field.willValidate) return;
        let entry = feedback.current.get(field);
        // Existing domain errors remain owned by the field's component.
        if (!entry && field.getAttribute('aria-invalid') === 'true') return;
        if (!entry) {
            const message = document.createElement('p');
            message.id = `${formId}-feedback-${nextFeedbackId.current++}`;
            message.className = 'form-field-error';
            message.setAttribute('aria-live', 'polite');
            entry = { message, describedBy: field.getAttribute('aria-describedby'), invalid: field.getAttribute('aria-invalid') };
            feedback.current.set(field, entry);
            const anchor = field.closest('label') || (field.parentElement.classList.contains('relative') ? field.parentElement : field);
            anchor.insertAdjacentElement('afterend', message);
        }
        const invalid = !field.validity.valid;
        entry.message.textContent = invalid ? field.validationMessage : '';
        entry.message.hidden = !invalid;
        field.setAttribute('aria-invalid', String(invalid));
        const ids = [entry.describedBy, invalid ? entry.message.id : null].filter(Boolean).join(' ');
        if (ids) field.setAttribute('aria-describedby', ids);
        else field.removeAttribute('aria-describedby');
    };

    useEffect(() => {
        const form = formRef.current;
        const linkLabels = () => {
            feedback.current.forEach((entry, field) => {
                if (!form.contains(field)) { entry.message.remove(); feedback.current.delete(field); }
            });
            form.querySelectorAll('label:not([for])').forEach(label => {
                const selector = 'input:not([type="hidden"]), select, textarea, button[aria-haspopup="listbox"]';
                const sibling = label.nextElementSibling;
                const field = label.querySelector(selector)
                    || (sibling?.matches(selector) ? sibling : sibling?.querySelector(selector))
                    || label.parentElement.querySelector(selector);
                if (!field) return;
                if (!field.id) field.id = `${formId}-field-${nextFieldId.current++}`;
                label.htmlFor = field.id;
            });
        };
        linkLabels();
        const observer = new MutationObserver(linkLabels);
        observer.observe(form, { childList: true, subtree: true });
        const entries = feedback.current;
        return () => {
            observer.disconnect();
            entries.forEach(({ message, describedBy, invalid }, field) => {
                message.remove();
                if (describedBy === null) field.removeAttribute('aria-describedby');
                else field.setAttribute('aria-describedby', describedBy);
                if (invalid === null) field.removeAttribute('aria-invalid');
                else field.setAttribute('aria-invalid', invalid);
            });
            entries.clear();
        };
    }, [formId]);

    return (
        <form
            {...props}
            className={['ui-form', className].filter(Boolean).join(' ')}
            ref={setRef}
            onBlurCapture={event => { onBlurCapture?.(event); if (!event.defaultPrevented) validate(event.target); }}
            onChangeCapture={event => {
                onChangeCapture?.(event);
                if (!event.defaultPrevented && feedback.current.has(event.target)) validate(event.target);
            }}
            onInvalidCapture={event => { onInvalidCapture?.(event); if (!event.defaultPrevented) validate(event.target); }}
        >
            {children}
        </form>
    );
});

Form.displayName = 'Form';
export default Form;
