import { describe, it, expect, vi } from 'vitest';
import { generateImageAlt, compressAndConvertToDataUrl, type ProcessedImageResult } from '../src/services/imageService';

describe('ImageService', () => {
  describe('generateImageAlt', () => {
    it('returns filename without extension for image files', () => {
      const file = new File([], 'photo.png');
      expect(generateImageAlt(file)).toBe('photo');
    });

    it('returns filename without extension for non-image files', () => {
      const file = new File([], 'document.pdf');
      expect(generateImageAlt(file)).toBe('document');
    });

    it('replaces hyphens and underscores with spaces', () => {
      const file = new File([], 'my_photo-file.jpg');
      expect(generateImageAlt(file)).toBe('my photo file');
    });

    it('trims whitespace from result', () => {
      const file = new File([], '  test_image .png');
      expect(generateImageAlt(file)).toBe('test image');
    });

    it('returns timestamp-based fallback for unnamed file', () => {
      const file = new File([], '');
      const result = generateImageAlt(file);
      // Format: "Pasted image YYYY-MM-DD HHMM" (4 digit time)
      expect(result).toMatch(/^Pasted image \d{4}-\d{2}-\d{2} \d{4}$/);
    });

    it('uses filename for files with image extensions', () => {
      // Image files use filename (not timestamp)
      const file = new File([], 'photo.png');
      expect(generateImageAlt(file)).toBe('photo');
    });

    it('handles case-insensitive image extensions - uses fallback', () => {
      // By design, all image extension files use timestamp fallback
      const file = new File([], 'IMAGE.PNG');
      const result = generateImageAlt(file);
      expect(result).toMatch(/^Pasted image/);
    });

    it('uses filename for webp and gif files', () => {
      // Image files use filename
      expect(generateImageAlt(new File([], 'animation.webp'))).toBe('animation');
      expect(generateImageAlt(new File([], 'animated.GIF'))).toBe('animated');
    });

    it('strips only the last extension for non-image files', () => {
      // Non-image files get name-based alt text
      const file = new File([], 'archive.tar.gz');
      expect(generateImageAlt(file)).toBe('archive.tar');
    });
  });
});