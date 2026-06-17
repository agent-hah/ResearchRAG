import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Run cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock getClientRects for Prosemirror/Tiptap in JSDOM
if (typeof window !== 'undefined' && typeof window.Range !== 'undefined') {
  window.Range.prototype.getClientRects = function () {
    return [] as unknown as DOMRectList;
  };
  window.Range.prototype.getBoundingClientRect = function () {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => {}
    } as DOMRect;
  };
}

// Mock getBoundingClientRect
if (typeof window !== 'undefined' && typeof window.Element !== 'undefined') {
  window.Element.prototype.getBoundingClientRect = function () {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => {}
    } as DOMRect;
  };
}

// Mock elementFromPoint and caretPositionFromPoint
if (typeof document !== 'undefined') {
  document.elementFromPoint = function () { return null; };
  // @ts-ignore
  document.caretPositionFromPoint = function () { return null; };
}

// Mock HTMLDialogElement
if (typeof window !== 'undefined') {
  if (typeof window.HTMLDialogElement === 'undefined') {
    (window as any).HTMLDialogElement = class extends HTMLElement {
      open = false;
      returnValue = '';
      showModal() {
        this.open = true;
        this.setAttribute('open', '');
      }
      show() {
        this.open = true;
        this.setAttribute('open', '');
      }
      close() {
        this.open = false;
        this.removeAttribute('open');
      }
    };
  } else {
    window.HTMLDialogElement.prototype.showModal = function() {
      this.open = true;
      this.setAttribute('open', '');
    };
    window.HTMLDialogElement.prototype.close = function() {
      this.open = false;
      this.removeAttribute('open');
    };
  }
}
