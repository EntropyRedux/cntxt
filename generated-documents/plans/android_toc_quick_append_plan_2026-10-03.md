# Architecture Plan: Android TOC Panel Quick Append Message Box

- **Date:** 2026-10-03
- **Target:** Android Mobile Build (Tauri v2 Mobile)
- **Status:** Approved Android Feature Plan

---

## 1. Problem Statement & Motivation
On mobile devices, users frequently want to capture a quick thought, note, checklist item, or dictated idea into a specific section of their active document (e.g. under "Notes", "Ideas", or "Tasks").

Navigating to that line in a long document on a touch screen requires:
1. Opening the editor.
2. Scrolling through many pages.
3. Placing the cursor precisely at the bottom of the section.
4. Triggering the virtual keyboard.

This creates high friction and increases the likelihood of accidental text displacement.

---

## 2. Solution: TOC Panel Quick Append Box
Integrate a persistent, expandable Quick Append input box directly inside the Table of Contents (Outline) panel drawer on Android:

1. **Target Section Header**:
   - The user opens the Outline drawer (swipe right or tap Outline tab).
   - Each heading row has an "Append to this section" quick action button (+ icon).
   - Alternatively, selecting a heading highlights it as the active append destination.
2. **Quick Append Input Container**:
   - Anchored at the bottom of the TOC drawer:
     - Multi-line touch-friendly text area with autosizing.
     - Timestamp button (`[Insert Timestamp]`).
     - List item toggle (`- ` checkbox item).
     - Send/Append button.
3. **Voice-to-Text Support**:
   - Direct integration with Android input method speech recognition.
4. **Instant Non-Blocking Injection**:
   - When the user taps "Append", the text is appended directly before the next heading at the same or higher level (or at EOF if it is the last section).
   - A brief haptic feedback and toast notification confirm:
     `Appended to "## Project Notes"`
   - The active editor view does not lose its current cursor position.
