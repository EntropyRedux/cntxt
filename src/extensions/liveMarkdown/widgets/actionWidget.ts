import { WidgetType, EditorView } from '@codemirror/view';
import { createElement } from '../../../adapters';
import { useActionStore } from '../../../store/actionStore';
import { executeActionById } from '../../../services/actionExecutor';

export class ActionButtonWidget extends WidgetType {
  constructor(
    readonly rawToken: string,
    readonly actionId: string,
    readonly customLabel: string | undefined,
    readonly actionName: string,
    readonly codeType: string | undefined,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: ActionButtonWidget): boolean {
    return (
      this.rawToken === other.rawToken &&
      this.actionId === other.actionId &&
      this.customLabel === other.customLabel &&
      this.actionName === other.actionName &&
      this.codeType === other.codeType
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const action = useActionStore.getState().actions.find(a => a.id === this.actionId);
    const label = this.customLabel || action?.name || this.actionId;
    const isFormula = action?.codeType === 'formula' || action?.code?.startsWith('FORMULA:');
    const isMissing = !action;

    if (isMissing) {
      const missingSpan = createElement('span', {
        className: 'cm-action-missing-widget',
        title: `Action "${this.actionId}" not found in Action Scripts library.\nClick to place cursor here to edit syntax.`
      });
      const icon = createElement('span', { className: 'opacity-75' }, ['⚠️']);
      const name = createElement('span', { className: 'cm-action-missing-name' }, [this.customLabel || this.rawToken]);
      const badge = createElement('span', { className: 'cm-action-missing-badge' }, ['(missing)']);
      missingSpan.appendChild(icon);
      missingSpan.appendChild(name);
      missingSpan.appendChild(badge);
      missingSpan.addEventListener('mousedown', (e) => e.stopPropagation());
      missingSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        let targetPos = this.from + 2;
        try {
          const domPos = view.posAtDOM(missingSpan);
          if (domPos !== null && domPos !== undefined) targetPos = Math.max(domPos, this.from + 2);
        } catch (err) {
          console.debug('[liveMarkdown] posAtDOM fallback to this.from:', err);
        }
        view.dispatch({ selection: { anchor: targetPos } });
        view.focus();
      });
      return missingSpan;
    }

    const btn = createElement('button', {
      type: 'button',
      className: 'cm-action-btn-widget group',
      title: `Action: ${action.name}\n${action.description ? action.description + '\n' : ''}• Click to run action\n• Alt+Click to edit syntax`
    });

    const playIcon = createElement('span', {
      className: 'cm-action-btn-icon'
    });
    playIcon.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
    btn.appendChild(playIcon);

    const labelSpan = createElement('span', {
      className: 'cm-action-btn-label',
      textContent: label
    });
    btn.appendChild(labelSpan);

    if (isFormula) {
      const fxBadge = createElement('span', {
        className: 'cm-action-badge-fx',
        textContent: 'fx'
      });
      btn.appendChild(fxBadge);
    }

    const typeBadge = createElement('span', {
      className: 'cm-action-badge-type',
      textContent: 'BTN'
    });
    btn.appendChild(typeBadge);

    // Prevent losing text selection on mousedown
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.altKey || e.ctrlKey) {
        let targetPos = this.from + 2;
        try {
          const domPos = view.posAtDOM(btn);
          if (domPos !== null && domPos !== undefined) targetPos = Math.max(domPos, this.from + 2);
        } catch (err) {
          console.debug('[liveMarkdown] posAtDOM fallback to this.from:', err);
        }
        view.dispatch({ selection: { anchor: targetPos } });
        view.focus();
        return;
      }

      btn.classList.add('is-running');
      try {
        await executeActionById(this.actionId, view);
      } finally {
        btn.classList.remove('is-running');
      }
    });

    return btn;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
