import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { compressAndConvertToDataUrl, generateImageAlt } from '../services/imageService';
import { useNotificationStore } from '../store/notificationStore';

/**
 * CodeMirror 6 extension that listens for clipboard paste and drag-and-drop
 * of image files, compresses them to efficient Base64 data URLs, and inserts
 * standard Markdown image syntax at the active cursor or drop position.
 */
export function imageDropPasteExtension(): Extension {
  return EditorView.domEventHandlers({
    paste(event: ClipboardEvent, view: EditorView) {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return false;

      // Check for image files in clipboard
      let imageFile: File | null = null;

      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i];
          if (file.type.startsWith('image/')) {
            imageFile = file;
            break;
          }
        }
      }

      if (!imageFile && clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              imageFile = file;
              break;
            }
          }
        }
      }

      // If an image was pasted, intercept and insert markdown image syntax
      if (imageFile) {
        event.preventDefault();
        event.stopPropagation();

        const altText = generateImageAlt(imageFile);

        compressAndConvertToDataUrl(imageFile)
          .then((result) => {
            const insertText = `\n![${altText}](${result.dataUrl})\n`;
            const mainSel = view.state.selection.main;

            view.dispatch({
              changes: {
                from: mainSel.from,
                to: mainSel.to,
                insert: insertText
              },
              selection: { anchor: mainSel.from + insertText.length },
              scrollIntoView: true,
              userEvent: 'input.paste.image'
            });

            useNotificationStore.getState().addNotification(
              'Image Pasted',
              `Inserted image into document (${Math.round(result.compressedSize / 1024)} KB)`,
              'success'
            );
          })
          .catch((err) => {
            console.error('Failed to process pasted image', err);
            useNotificationStore.getState().addNotification(
              'Image Paste Failed',
              'Could not process pasted image',
              'warning'
            );
          });

        return true;
      }

      return false;
    },

    drop(event: DragEvent, view: EditorView) {
      const dataTransfer = event.dataTransfer;
      if (!dataTransfer || !dataTransfer.files || dataTransfer.files.length === 0) {
        return false;
      }

      const imageFiles: File[] = [];
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return false;

      // Handle image drop
      event.preventDefault();
      event.stopPropagation();

      const dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.from;

      Promise.all(imageFiles.map((file) => compressAndConvertToDataUrl(file)))
        .then((results) => {
          let accumulatedText = '';
          results.forEach((res, idx) => {
            const alt = generateImageAlt(imageFiles[idx]);
            accumulatedText += `\n![${alt}](${res.dataUrl})\n`;
          });

          view.dispatch({
            changes: {
              from: dropPos,
              insert: accumulatedText
            },
            selection: { anchor: dropPos + accumulatedText.length },
            scrollIntoView: true,
            userEvent: 'input.drop.image'
          });

          useNotificationStore.getState().addNotification(
            'Image Added',
            `Inserted ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} into document`,
            'success'
          );
        })
        .catch((err) => {
          console.error('Failed to process dropped image', err);
          useNotificationStore.getState().addNotification('Image Drop Failed', 'Could not process dropped image', 'warning');
        });

      return true;
    },

    dragover(event: DragEvent) {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        return true;
      }
      return false;
    }
  });
}
