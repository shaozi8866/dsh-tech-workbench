/**
 * dsh-tech-workbench 插件生命周期管理 - 操作反馈
 * SPEC v8.5 - ActionFeedback
 */
import { useEffect } from 'react';
import type { ActionFeedback as ActionFeedbackType } from '../types';

interface ActionFeedbackProps {
  feedback: ActionFeedbackType | null;
  onDismiss: () => void;
}

export function ActionFeedback({ feedback, onDismiss }: ActionFeedbackProps) {
  useEffect(() => {
    if (feedback && feedback.ok && feedback.autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, feedback.autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  return (
    <div
      className="dshwb-action-feedback"
      onClick={!feedback.ok ? onDismiss : undefined}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        padding: '12px 20px',
        borderRadius: '12px',
        background: feedback.ok
          ? 'var(--dsw-alias-success-bg, #e8f5e9)'
          : 'var(--dsw-alias-danger-bg, #fff2f2)',
        color: feedback.ok
          ? 'var(--dsw-success, #188038)'
          : 'var(--dsw-danger, #ff3b30)',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        cursor: feedback.ok ? 'default' : 'pointer',
        zIndex: 1001,
        maxWidth: '320px',
      }}
    >
      {feedback.message}
    </div>
  );
}

