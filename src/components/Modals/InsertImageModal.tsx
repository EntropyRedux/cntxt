import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  X, 
  Upload, 
  Link2, 
  Sparkles, 
  Check, 
  AlertCircle,
  Maximize2
} from 'lucide-react';
import { useImageModalStore } from '../../store/imageModalStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { compressAndConvertToDataUrl, generateImageAlt } from '../../services/imageService';

export const InsertImageModal: React.FC = () => {
  const { isOpen, closeImageModal } = useImageModalStore();
  const { tabs, activeTabId, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageMeta, setImageMeta] = useState<{ size: number; name: string } | null>(null);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentTab = tabs.find(t => t.id === activeTabId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification('Invalid File', 'Please select a valid image file', 'warning');
      return;
    }

    try {
      setIsCompressing(true);
      const res = await compressAndConvertToDataUrl(file);
      setUploadedDataUrl(res.dataUrl);
      setImageMeta({ size: res.compressedSize, name: file.name });
      if (!altText) {
        setAltText(generateImageAlt(file));
      }
    } catch (err) {
      console.error('Failed to process image', err);
      addNotification('Error', 'Failed to process selected image', 'warning');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleInsert = () => {
    const finalSrc = activeTab === 'upload' ? uploadedDataUrl : imageUrl.trim();
    if (!finalSrc) {
      addNotification('Missing Source', 'Please select an image file or provide a valid image URL', 'warning');
      return;
    }

    const finalAlt = altText.trim() || 'Image';
    const markdown = `\n![${finalAlt}](${finalSrc})\n`;

    if (currentTab) {
      insertTextAtCursor(currentTab.id, markdown);
      addNotification('Image Inserted', `Inserted "${finalAlt}" into document`, 'success');
    }

    // Reset and close
    handleClose();
  };

  const handleClose = () => {
    setImageUrl('');
    setAltText('');
    setUploadedDataUrl('');
    setImageMeta(null);
    setUrlValid(null);
    closeImageModal();
  };

  const canInsert = activeTab === 'upload' ? !!uploadedDataUrl : !!imageUrl.trim();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="insert-image-title"
        className="w-full max-w-lg rounded-xl border border-[var(--border-primary)] bg-[var(--modal-bg)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--card-secondary-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center">
              <ImageIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="insert-image-title" className="text-sm font-semibold text-[var(--text-primary)]">
                Insert Image
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Add visuals to your document or prompt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--border-subtle)] px-5 pt-3 gap-4 bg-[var(--modal-bg)]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload from Device</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'url'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Web Image URL</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'upload' ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadedDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-primary)] hover:border-[var(--accent-primary)] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isCompressing ? (
                      <Sparkles className="w-6 h-6 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {isCompressing ? 'Optimizing image...' : 'Click to select an image from your device'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Supports PNG, JPG, WebP, GIF, SVG. Auto-compressed for performance.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] overflow-hidden max-h-56 flex items-center justify-center p-2">
                    <img 
                      src={uploadedDataUrl} 
                      alt="Uploaded preview" 
                      className="max-h-52 max-w-full object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-2.5 py-1 text-[11px] rounded bg-black/70 text-white hover:bg-black/90 transition-colors backdrop-blur-xs flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                  </div>

                  {imageMeta && (
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
                      <span className="truncate max-w-[200px]">{imageMeta.name}</span>
                      <span>{Math.round(imageMeta.size / 1024)} KB</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-primary)]">
                  Image Address (URL)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or https://..."
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setUrlValid(null);
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--input-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)] font-mono"
                  />
                </div>
              </div>

              {imageUrl.trim() && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-2 max-h-48 flex items-center justify-center overflow-hidden">
                  <img
                    src={imageUrl.trim()}
                    alt="Preview"
                    className="max-h-44 max-w-full object-contain rounded"
                    onLoad={() => setUrlValid(true)}
                    onError={() => setUrlValid(false)}
                  />
                </div>
              )}

              {urlValid === false && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Could not load image from this URL. Check address and CORS permissions.</span>
                </div>
              )}
            </div>
          )}

          {/* Alt text / Caption input */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-[var(--text-primary)]">
              Alt Text & Caption (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Architecture Flowchart, System Diagram, Chart..."
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--input-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Direct Paste Tip */}
          <div className="p-3 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">Direct Paste:</strong> You can also press <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-bg)] border border-[var(--border-primary)] font-mono text-[10px]">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-bg)] border border-[var(--border-primary)] font-mono text-[10px]">Cmd+V</kbd> anywhere in the editor to paste screenshots or images directly from your clipboard!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--card-secondary-bg)]">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-xs rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canInsert}
            onClick={handleInsert}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Insert Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
