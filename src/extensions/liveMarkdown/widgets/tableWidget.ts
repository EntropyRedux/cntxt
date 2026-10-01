import { WidgetType, EditorView } from '@codemirror/view';
import { createElement } from '../../../adapters';
import { formatTableCellHtml, ParsedTable } from '../../../services/tableParser';

export class TableBlockWidget extends WidgetType {
  constructor(
    readonly table: ParsedTable,
    readonly startPos: number
  ) {
    super();
  }

  eq(other: TableBlockWidget): boolean {
    return this.table.rawMarkdown === other.table.rawMarkdown;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('div', {
      className: 'cm-live-table-container select-none cursor-pointer group relative',
      title: 'Click anywhere on table to edit'
    });

    const table = createElement('table', { className: 'cm-live-table' });

    // thead
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    this.table.headers.forEach((headerText, i) => {
      const th = createElement('th', {
        className: `text-${this.table.alignments[i] || 'left'}`
      });
      th.innerHTML = formatTableCellHtml(headerText);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // tbody
    const tbody = createElement('tbody');
    this.table.rows.forEach((rowCells) => {
      const tr = createElement('tr');
      rowCells.forEach((cellText, i) => {
        const td = createElement('td', {
          className: `text-${this.table.alignments[i] || 'left'}`
        });
        td.innerHTML = formatTableCellHtml(cellText);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);

    container.addEventListener('click', () => {
      view.dispatch({
        selection: { anchor: this.startPos }
      });
      view.focus();
    });

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
