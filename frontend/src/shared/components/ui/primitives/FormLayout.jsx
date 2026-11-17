import { forwardRef, useId, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

export const FormRow = ({ children, cols = 2, className = '' }) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div
      className={cn(
        'grid gap-[var(--field-gap,12px)] w-full min-w-0 [&>*]:min-w-0',
        colClasses[cols] || colClasses[2],
        className,
      )}
    >
      {children}
    </div>
  );
};

export const FormSection = ({ title, description, children, className = '', id: explicitId }) => {
  const reactId = useId();
  const titleId = explicitId || `form-section-${reactId.replace(/:/g, '')}`;

  return (
    <fieldset
      aria-labelledby={title ? titleId : undefined}
      className={cn('flex flex-col gap-3 w-full min-w-0 border-0 p-0 m-0', className)}
    >
      {(title || description) && (
        <div className="flex flex-col gap-0.5 mb-1">
          {title && (
            <legend
              id={titleId}
              className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              {title}
            </legend>
          )}
          {description && (
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-[var(--field-gap,12px)] w-full min-w-0">
        {children}
      </div>
    </fieldset>
  );
};

export const FormActions = ({ children, className = '', align = 'end' }) => {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full min-w-0 pt-2',
        alignClasses[align] || alignClasses.end,
        className,
      )}
    >
      {children}
    </div>
  );
};

export const Form = forwardRef(({
  children,
  className = '',
  onBlurCapture,
  onChangeCapture,
  onInvalidCapture,
  onSubmit,
  ...props
}, forwardedRef) => {
  const formRef = useRef(null);
  const feedback = useRef(new Map());
  const formId = useId();
  const nextFieldId = useRef(0);
  const nextFeedbackId = useRef(0);

  const setRef = useCallback((node) => {
    formRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const validate = (field) => {
    if (!field.matches?.('input, select, textarea') || field.disabled || field.readOnly || !field.willValidate) return;
    let entry = feedback.current.get(field);
    if (!entry && field.getAttribute('aria-invalid') === 'true' && !feedback.current.has(field)) return;
    if (!entry) {
      const message = document.createElement('p');
      message.id = `${formId}-feedback-${nextFeedbackId.current++}`;
      message.className = 'form-field-error';
      message.setAttribute('aria-live', 'polite');
      entry = { message, describedBy: field.getAttribute('aria-describedby'), invalid: field.getAttribute('aria-invalid') };
      feedback.current.set(field, entry);
      const anchor = field.closest('label') || (field.parentElement?.classList.contains('relative') ? field.parentElement : field);
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
    if (!form) return;
    const linkLabels = () => {
      feedback.current.forEach((entry, field) => {
        if (!form.contains(field)) {
          entry.message.remove();
          feedback.current.delete(field);
        }
      });
      form.querySelectorAll('label:not([for])').forEach((label) => {
        const selector = 'input:not([type="hidden"]), select, textarea, button[aria-haspopup="listbox"]';
        const sibling = label.nextElementSibling;
        const field = label.querySelector(selector)
          || (sibling?.matches(selector) ? sibling : sibling?.querySelector(selector))
          || label.parentElement?.querySelector(selector);
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
      ref={setRef}
      className={cn('ui-form flex flex-col gap-[var(--field-gap,12px)] w-full min-w-0', className)}
      onSubmit={onSubmit}
      onBlurCapture={(e) => {
        onBlurCapture?.(e);
        if (!e.defaultPrevented) validate(e.target);
      }}
      onChangeCapture={(e) => {
        onChangeCapture?.(e);
        if (!e.defaultPrevented && feedback.current.has(e.target)) validate(e.target);
      }}
      onInvalidCapture={(e) => {
        onInvalidCapture?.(e);
        if (!e.defaultPrevented) validate(e.target);
      }}
      {...props}
    >
      {children}
    </form>
  );
});

Form.displayName = 'Form';
export default Form;
